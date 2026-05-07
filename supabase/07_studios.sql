-- ============================================================================
-- TRAINER PRO — Studio mode (multi-trainer)
-- ============================================================================
-- Adds optional "studio" support so one platform deploy can host:
--   * a solo trainer (default; trainer.studio_id is null), OR
--   * a studio owner with N staff trainers under them
--
-- Each trainer keeps their own clients/sessions/payments. Studio owners can
-- see everything in the studio. Staff trainers only see their own.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

-- 1. Studios table -------------------------------------------------------------
create table if not exists public.studios (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text,
    primary_color text default '#2d6a9f',
    logo_url text,
    intro_text text,
    -- The trainer who created this studio. Owner is identified by trainers.studio_role='owner'.
    owner_id uuid not null references public.trainers(id) on delete cascade,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'studios_slug_unique_idx') then
    create unique index studios_slug_unique_idx on public.studios (lower(slug)) where slug is not null;
  end if;
end $$;

drop trigger if exists touch_studios on public.studios;
create trigger touch_studios before update on public.studios
  for each row execute function public.touch_updated_at();

-- 2. Trainer extensions --------------------------------------------------------
alter table public.trainers add column if not exists studio_id uuid references public.studios(id) on delete set null;
alter table public.trainers add column if not exists studio_role text check (studio_role in ('owner', 'staff'));

create index if not exists trainers_studio_idx on public.trainers(studio_id);

-- 3. Studio invites ------------------------------------------------------------
create table if not exists public.studio_invites (
    id uuid primary key default uuid_generate_v4(),
    studio_id uuid not null references public.studios(id) on delete cascade,
    token text not null unique,
    email text,
    role text not null default 'staff' check (role in ('staff', 'owner')),
    status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
    expires_at timestamptz default (now() + interval '14 days'),
    accepted_by uuid references public.trainers(id) on delete set null,
    accepted_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists studio_invites_studio_idx on public.studio_invites(studio_id);

-- 4. RLS ----------------------------------------------------------------------
alter table public.studios enable row level security;
alter table public.studio_invites enable row level security;

-- Studios: any trainer in the studio can read; only owner can update/delete.
drop policy if exists studios_member_select on public.studios;
create policy studios_member_select on public.studios for select
  using (
    exists (
      select 1 from public.trainers t
      where t.id = auth.uid() and t.studio_id = studios.id
    )
  );

drop policy if exists studios_owner_modify on public.studios;
create policy studios_owner_modify on public.studios for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Studio invites: owner manages.
drop policy if exists studio_invites_owner_all on public.studio_invites;
create policy studio_invites_owner_all on public.studio_invites for all
  using (
    exists (
      select 1 from public.studios s
      where s.id = studio_invites.studio_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.studios s
      where s.id = studio_invites.studio_id and s.owner_id = auth.uid()
    )
  );

-- 5. Helper: "is this row mine, or do I own the studio it lives in?" ---------
-- Returns true if auth.uid() is the trainer in question, OR if auth.uid() is
-- the owner of a studio that the trainer in question belongs to.
create or replace function public.is_my_data(target_trainer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_trainer
    or exists (
      select 1
      from public.trainers me
      join public.trainers them on them.studio_id = me.studio_id
      where me.id = auth.uid()
        and me.studio_role = 'owner'
        and me.studio_id is not null
        and them.id = target_trainer
    )
$$;

grant execute on function public.is_my_data(uuid) to authenticated;

-- 6. Replace trainer-scoped policies to use is_my_data -----------------------
-- This widens visibility for studio owners but is identical for solo trainers.

-- CLIENTS
drop policy if exists clients_trainer_all on public.clients;
create policy clients_trainer_all on public.clients for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- SESSIONS
drop policy if exists sessions_trainer_all on public.sessions;
create policy sessions_trainer_all on public.sessions for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- PAYMENTS
drop policy if exists payments_trainer_all on public.payments;
create policy payments_trainer_all on public.payments for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- WORKOUT PLANS
drop policy if exists plans_trainer_all on public.workout_plans;
create policy plans_trainer_all on public.workout_plans for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- WORKOUT LOGS
drop policy if exists logs_trainer_all on public.workout_logs;
create policy logs_trainer_all on public.workout_logs for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- PROGRESS ENTRIES
drop policy if exists progress_trainer_all on public.progress_entries;
create policy progress_trainer_all on public.progress_entries for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- MESSAGES
drop policy if exists messages_trainer_all on public.messages;
create policy messages_trainer_all on public.messages for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- ACTIVITY LOG (read only)
drop policy if exists activity_trainer_select on public.activity_log;
create policy activity_trainer_select on public.activity_log for select
  using (public.is_my_data(trainer_id));

-- CLIENT INTAKES (was added in 05_intake.sql)
do $$
begin
  if exists (select 1 from pg_class where relname = 'client_intakes') then
    drop policy if exists intakes_trainer_all on public.client_intakes;
    execute 'create policy intakes_trainer_all on public.client_intakes for all using (public.is_my_data(trainer_id)) with check (public.is_my_data(trainer_id))';
  end if;
end $$;

-- TRAINERS table: a studio owner can see other trainers in their studio
-- (so the team list works) — but cannot modify them.
drop policy if exists trainer_studio_peer_select on public.trainers;
create policy trainer_studio_peer_select on public.trainers for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.trainers me
      where me.id = auth.uid()
        and me.studio_id is not null
        and me.studio_id = trainers.studio_id
    )
  );

-- 7. Public booking now resolves slug across studios first, then trainers ---
-- Returns a richer payload: studio info + list of trainers with availability.
create or replace function public.public_booking_info_v2(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  t record;
  trainers_json jsonb;
  busy jsonb;
  result jsonb;
  lookahead_days int;
begin
  -- Try studio slug first
  select id, name, primary_color, logo_url, intro_text, owner_id
  into s
  from public.studios
  where lower(slug) = lower(p_slug)
  limit 1;

  if found then
    -- Build trainers list under the studio (active booking ones)
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'full_name', t.full_name,
      'business_name', t.business_name,
      'slug', t.slug,
      'primary_color', t.primary_color,
      'logo_url', t.logo_url,
      'booking_settings', t.booking_settings
    )), '[]'::jsonb)
    into trainers_json
    from public.trainers t
    where t.studio_id = s.id and t.booking_enabled = true and t.slug is not null;

    -- Combined busy slots across all trainers in studio (for studio-level overview only)
    select coalesce(jsonb_agg(jsonb_build_object(
      'starts_at', sn.starts_at,
      'ends_at', sn.ends_at,
      'trainer_id', sn.trainer_id
    ) order by sn.starts_at), '[]'::jsonb)
    into busy
    from public.sessions sn
    join public.trainers tr on tr.id = sn.trainer_id
    where tr.studio_id = s.id
      and sn.status not in ('cancelled', 'no_show')
      and sn.starts_at >= now()
      and sn.starts_at <= now() + interval '60 days';

    return jsonb_build_object(
      'kind', 'studio',
      'studio', jsonb_build_object(
        'name', s.name,
        'primary_color', s.primary_color,
        'logo_url', s.logo_url,
        'intro_text', s.intro_text
      ),
      'trainers', trainers_json,
      'busy', busy,
      'now', now()
    );
  end if;

  -- Fall back to trainer slug (existing behavior)
  select id, full_name, business_name, primary_color, timezone, currency, logo_url, booking_settings
  into t
  from public.trainers
  where lower(slug) = lower(p_slug) and booking_enabled = true
  limit 1;

  if not found then
    return null;
  end if;

  lookahead_days := coalesce((t.booking_settings->>'max_days_ahead')::int, 30);

  select coalesce(jsonb_agg(jsonb_build_object('starts_at', starts_at, 'ends_at', ends_at) order by starts_at), '[]'::jsonb)
  into busy
  from public.sessions
  where trainer_id = t.id
    and status not in ('cancelled', 'no_show')
    and starts_at >= now()
    and starts_at <= now() + (lookahead_days || ' days')::interval;

  return jsonb_build_object(
    'kind', 'trainer',
    'trainer', jsonb_build_object(
      'full_name', t.full_name,
      'business_name', t.business_name,
      'primary_color', t.primary_color,
      'timezone', t.timezone,
      'currency', t.currency,
      'logo_url', t.logo_url
    ),
    'settings', t.booking_settings,
    'busy', busy,
    'now', now()
  );
end;
$$;

grant execute on function public.public_booking_info_v2(text) to anon, authenticated;

-- 8. Studio invite acceptance RPC -------------------------------------------
-- Called by a trainer (post-signup) to consume an invite token.
-- Sets their studio_id and studio_role. Marks invite as accepted.
create or replace function public.accept_studio_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  select * into inv from public.studio_invites
   where token = p_token and status = 'pending'
   limit 1;

  if not found then
    raise exception 'INVITE_INVALID' using errcode = 'P0001';
  end if;

  if inv.expires_at < now() then
    update public.studio_invites set status = 'expired' where id = inv.id;
    raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
  end if;

  -- Don't let a trainer who already has a studio accept another
  if exists (select 1 from public.trainers where id = auth.uid() and studio_id is not null) then
    raise exception 'ALREADY_IN_STUDIO' using errcode = 'P0001';
  end if;

  update public.trainers
     set studio_id = inv.studio_id,
         studio_role = inv.role
   where id = auth.uid();

  update public.studio_invites
     set status = 'accepted',
         accepted_by = auth.uid(),
         accepted_at = now()
   where id = inv.id;

  return jsonb_build_object('ok', true, 'studio_id', inv.studio_id);
end;
$$;

grant execute on function public.accept_studio_invite(text) to authenticated;

-- 9. Public lookup of an invite (so the join-studio page can show what they're joining) --
create or replace function public.public_studio_invite_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  s record;
begin
  select * into inv from public.studio_invites where token = p_token limit 1;
  if not found then return null; end if;

  if inv.status = 'pending' and inv.expires_at < now() then
    update public.studio_invites set status = 'expired' where id = inv.id;
    inv.status := 'expired';
  end if;

  select id, name, primary_color, logo_url, intro_text into s from public.studios where id = inv.studio_id;

  return jsonb_build_object(
    'status', inv.status,
    'role', inv.role,
    'expires_at', inv.expires_at,
    'studio', jsonb_build_object(
      'name', s.name,
      'primary_color', s.primary_color,
      'logo_url', s.logo_url,
      'intro_text', s.intro_text
    )
  );
end;
$$;

grant execute on function public.public_studio_invite_info(text) to anon, authenticated;

-- ============================================================================
-- DONE.
-- ============================================================================
