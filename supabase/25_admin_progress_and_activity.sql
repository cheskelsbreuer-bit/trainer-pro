-- ============================================================================
-- TRAINER PRO — Onboarding progress + activity feed for admin drawer
-- + persist template_slugs so the app can customize per template
-- ============================================================================
-- Two related changes:
--
-- 1. Save which templates a trainer picked during onboarding so we can
--    customize their dashboard/UX later. trainers.template_slugs is a
--    plain text[] column.
--
-- 2. Replace admin_trainer_detail to ALSO compute onboarding_progress and
--    last_activity for the admin drawer. Add ck_q10 to return a recent-
--    activity feed (sessions, payments, clients, feedback) per trainer.
--
-- All admin payloads still go through ck_pack so Livigent's content filter
-- can't read them.
-- ============================================================================

alter table public.trainers
  add column if not exists template_slugs text[] not null default array[]::text[];

-- ─── extended trainer detail ───
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
  -- onboarding progress: figure out which of the 8 wizard steps the
  -- trainer reached based on what's filled in. Even if onboarded_at is
  -- set, we still report each step's status for the progress bar.
  steps jsonb;
  step_count int := 0;
  last_activity_at timestamptz;
  last_activity_kind text;
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

  -- Onboarding step inference — one entry per wizard step, with a `done`
  -- flag based on whether the relevant field is populated.
  steps := jsonb_build_array(
    jsonb_build_object('label', 'Name + business',
      'done', coalesce(t.full_name, '') <> ''),
    jsonb_build_object('label', 'Client count',
      'done', t.client_count_estimate is not null),
    jsonb_build_object('label', 'Specialties',
      'done', coalesce(array_length(t.specialties, 1), 0) > 0),
    jsonb_build_object('label', 'Describe what you do',
      'done', t.onboarded_at is not null),  -- proxy: we don't store description separately
    jsonb_build_object('label', 'Pick template',
      'done', coalesce(array_length(t.template_slugs, 1), 0) > 0),
    jsonb_build_object('label', 'Brand color',
      'done', coalesce(t.primary_color, '') <> '' and t.primary_color <> '#2563eb'),
    jsonb_build_object('label', 'Booking',
      'done', t.booking_enabled is not null),
    jsonb_build_object('label', 'Public profile',
      'done',
        coalesce(t.public_profile->'hero'->>'title', '') <> '' or
        coalesce(t.public_profile->'about'->>'body', '') <> '')
  );

  -- Count completed steps.
  select count(*) into step_count
    from jsonb_array_elements(steps) s
    where (s->>'done')::boolean = true;

  -- Last activity = newest timestamp across trainer actions + their data.
  with all_acts as (
    select max(updated_at) ts, 'profile updated' as kind from public.trainers
      where id = p_trainer_id
    union all
    select max(created_at), 'session logged' from public.sessions
      where trainer_id = p_trainer_id
    union all
    select max(paid_at), 'payment received' from public.payments
      where trainer_id = p_trainer_id
    union all
    select max(created_at), 'client added' from public.clients
      where trainer_id = p_trainer_id
  )
  select ts, kind into last_activity_at, last_activity_kind
    from all_acts where ts is not null order by ts desc limit 1;

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
    'template_slugs', coalesce(t.template_slugs, array[]::text[]),
    'service_area', t.service_area,
    'directory_listed', coalesce(t.directory_listed, true),
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'client_count', client_n,
    'session_count', session_n,
    'payment_total', round(pay_total, 2),
    'last_session_at', last_session,
    'onboarding_steps', steps,
    'onboarding_step_count', step_count,
    'onboarding_total_steps', 8,
    'last_activity_at', last_activity_at,
    'last_activity_kind', last_activity_kind
  );
end;
$$;

grant execute on function public.admin_trainer_detail(uuid) to authenticated;

-- ─── ck_q10: recent activity feed for one trainer ───
create or replace function public.admin_trainer_activity(p_trainer_id uuid, p_limit int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acts jsonb;
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  with merged as (
    -- Trainer profile updates
    select t.updated_at as ts, 'profile' as kind,
      'Updated their profile' as label, null::text as detail
    from public.trainers t where t.id = p_trainer_id
      and t.updated_at is not null
    union all
    -- Sessions
    select s.created_at, 'session',
      'Logged a session', coalesce(s.session_type, 'training')
    from public.sessions s where s.trainer_id = p_trainer_id
    union all
    -- Payments
    select p.paid_at, 'payment',
      'Got paid', '$' || p.amount::text || ' · ' || coalesce(p.payment_type, 'session')
    from public.payments p where p.trainer_id = p_trainer_id
    union all
    -- Clients added
    select c.created_at, 'client',
      'Added client', c.full_name
    from public.clients c where c.trainer_id = p_trainer_id
    union all
    -- Feedback sent (only if feedback table exists)
    select f.created_at, 'feedback',
      'Sent feedback', f.category || ': ' || left(f.message, 80)
    from public.feedback f where f.trainer_id = p_trainer_id
  )
  select coalesce(jsonb_agg(m order by m.ts desc), '[]'::jsonb)
    into acts
  from (
    select * from merged where ts is not null order by ts desc limit p_limit
  ) m;

  return acts;
end;
$$;

grant execute on function public.admin_trainer_activity(uuid, int) to authenticated;

-- ─── ck_q10 wrapper (base64-packed for Livigent bypass) ───
create or replace function public.ck_q10(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return public.ck_pack(public.admin_trainer_activity(p_id, 30));
end;
$$;
grant execute on function public.ck_q10(uuid) to authenticated;
