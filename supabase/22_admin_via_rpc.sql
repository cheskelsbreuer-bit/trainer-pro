-- ============================================================================
-- TRAINER PRO — Admin operations via Supabase RPCs (Livigent bypass)
-- ============================================================================
-- The user's network runs Livigent, which intercepts HTTPS responses from
-- our FastAPI backend (api.trainerpro.coach) and returns a 5.6 kB "blocked"
-- HTML page. Supabase (*.supabase.co) is already allowed by their filter
-- (the main app reads from it), so moving admin endpoints to Supabase RPCs
-- gets them around the filter entirely — same domain as the rest of the
-- app from the browser's perspective.
--
-- Each RPC:
--   - Uses SECURITY DEFINER to bypass RLS (admin reads cross-tenant data)
--   - Gates on trainers.is_admin = true for the auth.uid()
--   - Returns JSONB so we get one consistent typed shape per call
-- ============================================================================

-- Bootstrap: add an is_admin column. False by default so flipping admin
-- status requires an explicit SQL update — no accidental escalation.
alter table public.trainers
  add column if not exists is_admin boolean not null default false;

-- Promote the project owner. Replace with your own email if different.
update public.trainers
  set is_admin = true
  where lower(email) = 'chesky2039@gmail.com';

-- ─── helper: is the current caller an admin? ───
create or replace function public.is_caller_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.trainers where id = auth.uid()), false);
$$;

grant execute on function public.is_caller_admin() to authenticated;

-- ─── admin_whoami ───
create or replace function public.admin_whoami()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('is_admin', public.is_caller_admin());
$$;

grant execute on function public.admin_whoami() to authenticated;

-- ─── admin_overview: stats tiles ───
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_trainers int;
  onboarded_trainers int;
  new_trainers_week int;
  new_trainers_month int;
  total_clients int;
  total_sessions int;
  total_payments_amount numeric;
  waitlist_count int;
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select count(*) into total_trainers from public.trainers;
  select count(*) into onboarded_trainers
    from public.trainers where onboarded_at is not null;
  select count(*) into new_trainers_week
    from public.trainers where created_at >= now() - interval '7 days';
  select count(*) into new_trainers_month
    from public.trainers where created_at >= now() - interval '30 days';
  select count(*) into total_clients from public.clients;
  select count(*) into total_sessions from public.sessions;
  select coalesce(sum(amount), 0) into total_payments_amount from public.payments;

  begin
    select count(*) into waitlist_count from public.waitlist_emails;
  exception when undefined_table then
    waitlist_count := 0;
  end;

  return jsonb_build_object(
    'total_trainers', total_trainers,
    'onboarded_trainers', onboarded_trainers,
    'new_trainers_this_week', new_trainers_week,
    'new_trainers_this_month', new_trainers_month,
    'total_clients', total_clients,
    'total_sessions', total_sessions,
    'total_payments_amount', round(total_payments_amount, 2),
    'waitlist_count', waitlist_count
  );
end;
$$;

grant execute on function public.admin_overview() to authenticated;

-- ─── admin_trainers: list every trainer with key profile fields ───
create or replace function public.admin_trainers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb)
    from (
      select
        id,
        full_name,
        business_name,
        email,
        onboarded_at,
        client_count_estimate,
        coalesce(specialties, array[]::text[]) as specialties,
        created_at
      from public.trainers
    ) t
  );
end;
$$;

grant execute on function public.admin_trainers() to authenticated;

-- ─── admin_trainer_detail: rich per-trainer view + activity counts ───
create or replace function public.admin_trainer_detail(p_trainer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  client_n int;
  session_n int;
  pay_total numeric;
  last_session timestamptz;
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into t from public.trainers where id = p_trainer_id;
  if not found then
    raise exception 'Trainer not found' using errcode = '02000';
  end if;
  select count(*) into client_n from public.clients where trainer_id = p_trainer_id;
  select count(*) into session_n from public.sessions where trainer_id = p_trainer_id;
  select coalesce(sum(amount), 0) into pay_total
    from public.payments where trainer_id = p_trainer_id;
  select max(starts_at) into last_session
    from public.sessions where trainer_id = p_trainer_id;

  return jsonb_build_object(
    'id', t.id,
    'full_name', t.full_name,
    'business_name', t.business_name,
    'email', t.email,
    'phone', t.phone,
    'timezone', t.timezone,
    'currency', t.currency,
    'primary_color', t.primary_color,
    'slug', t.slug,
    'booking_enabled', coalesce(t.booking_enabled, false),
    'onboarded_at', t.onboarded_at,
    'client_count_estimate', t.client_count_estimate,
    'specialties', coalesce(t.specialties, array[]::text[]),
    'service_area', t.service_area,
    'directory_listed', coalesce(t.directory_listed, true),
    'created_at', t.created_at,
    'client_count', client_n,
    'session_count', session_n,
    'payment_total', round(pay_total, 2),
    'last_session_at', last_session
  );
end;
$$;

grant execute on function public.admin_trainer_detail(uuid) to authenticated;

-- ─── admin_trainer_patch: edit a trainer (visibility toggles + override fields) ───
create or replace function public.admin_trainer_patch(
  p_trainer_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.trainers set
    full_name = coalesce(p_patch->>'full_name', full_name),
    business_name = coalesce(p_patch->>'business_name', business_name),
    service_area = coalesce(p_patch->>'service_area', service_area),
    directory_listed = coalesce((p_patch->>'directory_listed')::boolean, directory_listed),
    booking_enabled = coalesce((p_patch->>'booking_enabled')::boolean, booking_enabled),
    updated_at = now()
  where id = p_trainer_id;

  return public.admin_trainer_detail(p_trainer_id);
end;
$$;

grant execute on function public.admin_trainer_patch(uuid, jsonb) to authenticated;

-- ─── admin_trainer_clients: client roster for one trainer ───
create or replace function public.admin_trainer_clients(p_trainer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(c order by c.created_at desc), '[]'::jsonb)
    from (
      select id, full_name, email, phone, status, package_balance, created_at
      from public.clients
      where trainer_id = p_trainer_id
      order by created_at desc
      limit 200
    ) c
  );
end;
$$;

grant execute on function public.admin_trainer_clients(uuid) to authenticated;

-- ─── admin_trainer_sessions: recent sessions for one trainer ───
create or replace function public.admin_trainer_sessions(p_trainer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(s order by s.starts_at desc), '[]'::jsonb)
    from (
      select id, starts_at, ends_at, status, session_type, price, paid, client_id
      from public.sessions
      where trainer_id = p_trainer_id
      order by starts_at desc
      limit 100
    ) s
  );
end;
$$;

grant execute on function public.admin_trainer_sessions(uuid) to authenticated;

-- ─── admin_trainer_payments: recent payments for one trainer ───
create or replace function public.admin_trainer_payments(p_trainer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(p order by p.paid_at desc), '[]'::jsonb)
    from (
      select id, amount, currency, payment_type, method, description, paid_at
      from public.payments
      where trainer_id = p_trainer_id
      order by paid_at desc
      limit 100
    ) p
  );
end;
$$;

grant execute on function public.admin_trainer_payments(uuid) to authenticated;

-- ─── admin_waitlist: landing-page email signups ───
create or replace function public.admin_waitlist()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  begin
    return (
      select coalesce(jsonb_agg(w order by w.created_at desc), '[]'::jsonb)
      from (
        select id, email, source, created_at from public.waitlist_emails
        order by created_at desc limit 500
      ) w
    );
  exception when undefined_table then
    return '[]'::jsonb;
  end;
end;
$$;

grant execute on function public.admin_waitlist() to authenticated;

-- ─── admin_feedback: every feedback row + admin reply state ───
create or replace function public.admin_feedback()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(f order by f.created_at desc), '[]'::jsonb)
    from (
      select
        id, trainer_id, trainer_email, category, message, user_agent, url,
        resolved_at, created_at, admin_reply, admin_replied_at, admin_reply_seen_at
      from public.feedback
      order by created_at desc
      limit 500
    ) f
  );
end;
$$;

grant execute on function public.admin_feedback() to authenticated;

-- ─── admin_feedback_reply: write/clear an admin reply on a feedback row ───
create or replace function public.admin_feedback_reply(
  p_feedback_id uuid,
  p_reply text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  trimmed text := nullif(trim(p_reply), '');
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if trimmed is null then
    update public.feedback set
      admin_reply = null,
      admin_replied_at = null,
      admin_reply_seen_at = null
    where id = p_feedback_id;
    return jsonb_build_object('ok', true, 'cleared', true);
  end if;
  if length(trimmed) > 5000 then
    raise exception 'Reply too long (max 5000)' using errcode = '22001';
  end if;
  update public.feedback set
    admin_reply = trimmed,
    admin_replied_at = now(),
    -- Reset seen so a follow-up reply re-shows the banner.
    admin_reply_seen_at = null
  where id = p_feedback_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_feedback_reply(uuid, text) to authenticated;
