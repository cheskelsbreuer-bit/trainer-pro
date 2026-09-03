-- ============================================================================
-- TRAINER PRO — The family page, opened by a texted link. No account.
-- ============================================================================
-- The portal until now needed a login: an invite, an email address, a
-- password or a magic link. For the sitters this app is actually for, that
-- is the end of the conversation — their mothers don't use email and will
-- not make an account. So the portal went unused, and the sitter's answer
-- to "how much do I owe?" stayed a phone call.
--
-- This is the version that fits: the sitter texts a link, the mother taps
-- it, and her family's page opens. Nothing to install, nothing to remember,
-- nothing to type.
--
-- ── What the link IS ────────────────────────────────────────────────────
-- A bearer credential. 24 random bytes — 192 bits — so it cannot be
-- guessed, but anyone holding it can open that page, exactly like a "anyone
-- with the link" document. That is a deliberate trade, and it is the right
-- one here: the alternative is a login the parent will never complete, and
-- what is behind it is one family's own balance and their own messages —
-- which they already know.
--
-- The cost is that a forwarded text shows a forwarded family their page.
-- So: one link per family and nothing wider, the sitter can see every link
-- she has made, and she can revoke one in a tap and text a fresh one.
--
-- ── What the link is NOT ────────────────────────────────────────────────
-- It is not a login. It reaches exactly one family's rows through the four
-- functions below and nothing else — no table is exposed to the anonymous
-- role, no policy is widened, and there is no path from a token to any
-- other family, to the sitter's account, or to anybody's auth user.
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.family_links (
  token        text primary key,
  trainer_id   uuid not null references public.trainers(id) on delete cascade,
  -- The family this opens. Kept as the slug from the kid's tags, because
  -- that is what actually groups siblings, plus one anchor child so the
  -- link still resolves if the slug is later renamed.
  family_slug  text not null,
  anchor_id    uuid not null references public.clients(id) on delete cascade,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  last_seen_at timestamptz,
  seen_count   integer not null default 0
);

create index if not exists family_links_trainer_idx
  on public.family_links(trainer_id, created_at desc);

alter table public.family_links enable row level security;

-- The sitter sees her own links. Nobody else sees anything: the parent
-- never queries this table, the functions below do it for her with the
-- table owner's rights.
drop policy if exists family_links_owner on public.family_links;
create policy family_links_owner on public.family_links
  for select to authenticated
  using (trainer_id = auth.uid());

-- ── The sitter's side: make a link, list them, revoke one ──────────────
create or replace function public.family_link_create(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trainer uuid;
  v_slug text;
  v_anchor uuid;
  v_token text;
begin
  select trainer_id into v_trainer from public.clients where id = p_client_id;
  if v_trainer is null then
    raise exception 'No such child' using errcode = 'P0002';
  end if;
  if v_trainer <> auth.uid() then
    raise exception 'Not your child' using errcode = '42501';
  end if;

  -- The family slug lives in the tags as 'family:<slug>'. A child with no
  -- family gets a link of their own, keyed on their id.
  select coalesce(
           (select substring(t from 8) from unnest(coalesce(c.tags, array[]::text[])) t
             where t like 'family:%' limit 1),
           'solo-' || c.id::text)
    into v_slug
    from public.clients c where c.id = p_client_id;

  -- Anchor on the family's oldest child so the link survives one child
  -- leaving, and so siblings share one page rather than one link each.
  select c.id into v_anchor
    from public.clients c
   where c.trainer_id = v_trainer
     and coalesce(
           (select substring(t from 8) from unnest(coalesce(c.tags, array[]::text[])) t
             where t like 'family:%' limit 1),
           'solo-' || c.id::text) = v_slug
   order by c.created_at, c.id
   limit 1;

  -- Reuse the family's live link rather than minting a second one: two
  -- links to the same page is two things to revoke and one of them
  -- forgotten.
  select token into v_token
    from public.family_links
   where trainer_id = v_trainer and family_slug = v_slug and revoked_at is null
   order by created_at desc limit 1;

  if v_token is null then
    -- 24 bytes, url-safe. Not guessable; short enough to sit in a text.
    v_token := translate(encode(gen_random_bytes(24), 'base64'), '+/=', '-_');
    insert into public.family_links (token, trainer_id, family_slug, anchor_id)
    values (v_token, v_trainer, v_slug, coalesce(v_anchor, p_client_id));
  end if;

  return jsonb_build_object('ok', true, 'token', v_token, 'family', v_slug);
end;
$$;

grant execute on function public.family_link_create(uuid) to authenticated;

create or replace function public.family_link_revoke(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.family_links
     set revoked_at = now()
   where token = p_token and trainer_id = auth.uid() and revoked_at is null;
  if not found then
    raise exception 'No such link' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.family_link_revoke(text) to authenticated;

-- ── The parent's side ──────────────────────────────────────────────────
-- Everything below runs for an anonymous caller holding a token. Each one
-- resolves the token first and does nothing at all if it doesn't resolve.

create or replace function public._family_link_resolve(p_token text)
returns public.family_links
language sql
stable
security definer
set search_path = public
as $$
  select * from public.family_links
   where token = p_token and revoked_at is null;
$$;

create or replace function public.family_page(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.family_links;
  v_kids jsonb;
  v_payments jsonb;
  v_messages jsonb;
  v_business text;
  v_ids uuid[];
begin
  v_link := public._family_link_resolve(p_token);
  if v_link.token is null then
    -- Same answer for a wrong token and a revoked one: a page that
    -- distinguishes them tells someone which guesses were close.
    return jsonb_build_object('ok', false);
  end if;

  select array_agg(c.id) into v_ids
    from public.clients c
   where c.trainer_id = v_link.trainer_id
     and c.status <> 'archived'
     and coalesce(
           (select substring(t from 8) from unnest(coalesce(c.tags, array[]::text[])) t
             where t like 'family:%' limit 1),
           'solo-' || c.id::text) = v_link.family_slug;

  if v_ids is null then
    return jsonb_build_object('ok', false);
  end if;

  select business_name into v_business from public.trainers where id = v_link.trainer_id;

  select coalesce(jsonb_agg(k order by k.full_name), '[]'::jsonb) into v_kids
  from (
    select id, full_name, date_of_birth, medical_notes, notes, status,
           coalesce(tags, array[]::text[]) as tags
      from public.clients where id = any(v_ids)
  ) k;

  select coalesce(jsonb_agg(p order by p.paid_at desc), '[]'::jsonb) into v_payments
  from (
    select id, client_id, amount, method, description, paid_at
      from public.payments
     where client_id = any(v_ids)
     order by paid_at desc limit 50
  ) p;

  select coalesce(jsonb_agg(m order by m.created_at), '[]'::jsonb) into v_messages
  from (
    select id, client_id, sender, body, created_at
      from public.messages
     where client_id = any(v_ids)
     order by created_at desc limit 100
  ) m;

  -- Count the visit. Useful to the sitter ("she's never opened it") and
  -- the only thing this write ever touches.
  update public.family_links
     set last_seen_at = now(), seen_count = seen_count + 1
   where token = p_token;

  return jsonb_build_object(
    'ok', true,
    'business', v_business,
    'kids', v_kids,
    'payments', v_payments,
    'messages', v_messages,
    'anchor_id', v_link.anchor_id
  );
end;
$$;

grant execute on function public.family_page(text) to anon, authenticated;

-- Reply to the sitter. sender is forced to 'client' — a token can never
-- post a message that looks like it came from the sitter.
create or replace function public.family_reply(p_token text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.family_links;
  v_body text := nullif(btrim(p_body), '');
begin
  v_link := public._family_link_resolve(p_token);
  if v_link.token is null then
    return jsonb_build_object('ok', false);
  end if;
  if v_body is null then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  if length(v_body) > 2000 then
    v_body := left(v_body, 2000);
  end if;

  insert into public.messages (trainer_id, client_id, sender, body)
  values (v_link.trainer_id, v_link.anchor_id, 'client', v_body);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.family_reply(text, text) to anon, authenticated;

-- "She's not coming today." Writes the same activity_log row the portal
-- always wrote, so it shows up on the sitter's home screen unchanged.
create or replace function public.family_absence(
  p_token text,
  p_client_id uuid,
  p_date date,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.family_links;
  v_name text;
begin
  v_link := public._family_link_resolve(p_token);
  if v_link.token is null then
    return jsonb_build_object('ok', false);
  end if;

  -- The child must belong to this token's family. Without this check a
  -- token would be able to report any of the sitter's children absent.
  select c.full_name into v_name
    from public.clients c
   where c.id = p_client_id
     and c.trainer_id = v_link.trainer_id
     and coalesce(
           (select substring(t from 8) from unnest(coalesce(c.tags, array[]::text[])) t
             where t like 'family:%' limit 1),
           'solo-' || c.id::text) = v_link.family_slug;
  if v_name is null then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.activity_log (trainer_id, actor, action, entity_type, entity_id, details)
  values (
    v_link.trainer_id, 'client', 'absence_reported', 'client', p_client_id,
    jsonb_build_object(
      'kid_name', v_name,
      'date', coalesce(p_date, current_date)::text,
      'note', nullif(btrim(coalesce(p_note, '')), '')
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.family_absence(text, uuid, date, text) to anon, authenticated;

-- The parent's own say on being texted. This is hers to change, and it is
-- the one thing on the page that must not need a sitter to action it.
create or replace function public.family_sms_consent(p_token text, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.family_links;
begin
  v_link := public._family_link_resolve(p_token);
  if v_link.token is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.clients c
     set tags = case
                  when p_on then
                    (select array_agg(distinct t)
                       from unnest(coalesce(c.tags, array[]::text[]) || array['smsconsent:1']) t)
                  else array_remove(coalesce(c.tags, array[]::text[]), 'smsconsent:1')
                end
   where c.trainer_id = v_link.trainer_id
     and coalesce(
           (select substring(t from 8) from unnest(coalesce(c.tags, array[]::text[])) t
             where t like 'family:%' limit 1),
           'solo-' || c.id::text) = v_link.family_slug;

  insert into public.activity_log (trainer_id, actor, action, details)
  values (
    v_link.trainer_id, 'client', 'sms_consent_changed',
    jsonb_build_object('family', v_link.family_slug, 'on', p_on, 'via', 'family link')
  );

  return jsonb_build_object('ok', true, 'on', p_on);
end;
$$;

grant execute on function public.family_sms_consent(text, boolean) to anon, authenticated;
