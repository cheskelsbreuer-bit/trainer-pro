-- ============================================================================
-- TRAINER PRO — Client portal (Phase 2 item 8, read-only first cut)
-- ============================================================================
-- Adds the plumbing for a client-facing portal:
--   * client_portal_invites: one-time tokens that link an auth user to a client
--   * accept_client_portal_invite(token) RPC: called post-signup to link
--   * portal_session_request_reschedule(session_id, new_starts_at, reason) RPC:
--     client requests a reschedule; creates an activity_log entry the trainer
--     sees on their dashboard. Doesn't move the session itself — trainer must
--     approve. (Real two-way edits are Phase 4.)
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.client_portal_invites (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    token text not null unique,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
    expires_at timestamptz default (now() + interval '14 days'),
    accepted_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists cpi_trainer_idx on public.client_portal_invites(trainer_id);
create index if not exists cpi_client_idx on public.client_portal_invites(client_id);

alter table public.client_portal_invites enable row level security;

drop policy if exists cpi_trainer_all on public.client_portal_invites;
create policy cpi_trainer_all on public.client_portal_invites for all
  using (public.is_my_data(trainer_id))
  with check (public.is_my_data(trainer_id));

-- Public-readable info about an invite (so the join page can show what's offered)
create or replace function public.public_portal_invite_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  c record;
  t record;
begin
  select * into inv from public.client_portal_invites where token = p_token limit 1;
  if not found then return null; end if;

  if inv.status = 'pending' and inv.expires_at < now() then
    update public.client_portal_invites set status = 'expired' where id = inv.id;
    inv.status := 'expired';
  end if;

  select id, full_name, email into c from public.clients where id = inv.client_id;
  select id, full_name, business_name, primary_color, logo_url into t from public.trainers where id = inv.trainer_id;

  return jsonb_build_object(
    'status', inv.status,
    'expires_at', inv.expires_at,
    'client', jsonb_build_object('full_name', c.full_name, 'email', c.email),
    'trainer', jsonb_build_object(
      'full_name', t.full_name,
      'business_name', t.business_name,
      'primary_color', t.primary_color,
      'logo_url', t.logo_url
    )
  );
end;
$$;

grant execute on function public.public_portal_invite_info(text) to anon, authenticated;

-- Accept a portal invite — links auth.uid() to the clients.auth_user_id
create or replace function public.accept_client_portal_invite(p_token text)
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

  select * into inv from public.client_portal_invites where token = p_token and status = 'pending' limit 1;
  if not found then
    raise exception 'INVITE_INVALID' using errcode = 'P0001';
  end if;

  if inv.expires_at < now() then
    update public.client_portal_invites set status = 'expired' where id = inv.id;
    raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
  end if;

  -- Link auth user → client. If the client already has an auth_user_id, it gets overwritten
  -- (you'd typically not re-issue invites once linked, but this is permissive).
  update public.clients
    set auth_user_id = auth.uid()
    where id = inv.client_id;

  update public.client_portal_invites
    set status = 'accepted',
        accepted_at = now()
    where id = inv.id;

  return jsonb_build_object('ok', true, 'client_id', inv.client_id);
end;
$$;

grant execute on function public.accept_client_portal_invite(text) to authenticated;

-- Reschedule request from the client side. Doesn't actually move the session;
-- it logs the request. The trainer sees it as an activity_log entry.
create or replace function public.portal_request_reschedule(
  p_session_id uuid,
  p_new_starts_at timestamptz,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  c record;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  -- Verify the calling auth user owns this session via the client link
  select sn.id, sn.starts_at, sn.client_id, sn.trainer_id, sn.status
    into s
    from public.sessions sn
    join public.clients c on c.id = sn.client_id
    where sn.id = p_session_id and c.auth_user_id = auth.uid()
    limit 1;

  if not found then
    raise exception 'SESSION_NOT_YOURS' using errcode = 'P0001';
  end if;
  if s.status not in ('scheduled', 'confirmed') then
    raise exception 'SESSION_NOT_RESCHEDULABLE' using errcode = 'P0001';
  end if;

  insert into public.activity_log (trainer_id, actor, action, entity_type, entity_id, details)
  values (
    s.trainer_id,
    'client',
    'reschedule_requested',
    'session',
    s.id,
    jsonb_build_object(
      'old_starts_at', s.starts_at,
      'new_starts_at', p_new_starts_at,
      'reason', p_reason
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.portal_request_reschedule(uuid, timestamptz, text) to authenticated;

-- ============================================================================
-- DONE.
-- ============================================================================
