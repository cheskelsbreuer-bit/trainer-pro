-- ============================================================================
-- TRAINER PRO — Public booking page support
-- ============================================================================
-- Adds:
--   * trainers.slug                 — URL-safe public identifier (e.g. "alex-trainer")
--   * trainers.booking_enabled      — master on/off
--   * trainers.booking_settings     — JSON: lead_hours, max_days_ahead,
--                                    default_duration_min, buffer_min, windows[]
--
-- Plus two SECURITY DEFINER RPCs the public booking page calls without auth:
--   * public_booking_info(p_slug)        — trainer info + busy slots
--   * public_booking_request(...)        — insert client + session atomically
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

-- 1. Schema additions ----------------------------------------------------------
alter table public.trainers add column if not exists slug text;
alter table public.trainers add column if not exists booking_enabled boolean default false;
alter table public.trainers add column if not exists booking_settings jsonb default '{
  "lead_hours": 24,
  "max_days_ahead": 30,
  "default_duration_min": 60,
  "buffer_min": 15,
  "intro_text": "Book a session with me. Pick a time that works.",
  "windows": [
    {"weekday": 1, "start": "06:00", "end": "20:00"},
    {"weekday": 2, "start": "06:00", "end": "20:00"},
    {"weekday": 3, "start": "06:00", "end": "20:00"},
    {"weekday": 4, "start": "06:00", "end": "20:00"},
    {"weekday": 5, "start": "06:00", "end": "20:00"}
  ]
}'::jsonb;

-- Make slug case-insensitive unique when set
do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'trainers_slug_unique_idx'
  ) then
    create unique index trainers_slug_unique_idx
      on public.trainers (lower(slug))
      where slug is not null;
  end if;
end $$;

-- 2. Public booking info RPC ---------------------------------------------------
create or replace function public.public_booking_info(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  busy jsonb;
  result jsonb;
  lookahead_days int;
begin
  select id, full_name, business_name, primary_color, timezone, currency, logo_url, booking_settings
  into t
  from public.trainers
  where lower(slug) = lower(p_slug) and booking_enabled = true
  limit 1;

  if not found then
    return null;
  end if;

  lookahead_days := coalesce((t.booking_settings->>'max_days_ahead')::int, 30);

  -- Busy = any non-cancelled future session for this trainer.
  -- Returned as [{starts_at, ends_at}] so the frontend can compute free slots.
  select coalesce(jsonb_agg(jsonb_build_object('starts_at', starts_at, 'ends_at', ends_at) order by starts_at), '[]'::jsonb)
  into busy
  from public.sessions
  where trainer_id = t.id
    and status not in ('cancelled', 'no_show')
    and starts_at >= now()
    and starts_at <= now() + (lookahead_days || ' days')::interval;

  result := jsonb_build_object(
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

  return result;
end;
$$;

grant execute on function public.public_booking_info(text) to anon, authenticated;

-- 3. Public booking request RPC -----------------------------------------------
create or replace function public.public_booking_request(
  p_slug text,
  p_email text,
  p_full_name text,
  p_phone text,
  p_starts_at timestamptz,
  p_duration_min int default 60,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t_id uuid;
  c_id uuid;
  s_id uuid;
  s_end timestamptz;
  conflict_count int;
  settings jsonb;
  lead_hours int;
begin
  -- Resolve trainer
  select id, booking_settings into t_id, settings
  from public.trainers
  where lower(slug) = lower(p_slug) and booking_enabled = true
  limit 1;

  if t_id is null then
    raise exception 'BOOKING_DISABLED' using errcode = 'P0001';
  end if;

  -- Validate email + name
  if p_email is null or length(trim(p_email)) < 3 or position('@' in p_email) = 0 then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;
  if p_full_name is null or length(trim(p_full_name)) < 1 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;

  -- Lead-time check
  lead_hours := coalesce((settings->>'lead_hours')::int, 24);
  if p_starts_at < now() + (lead_hours || ' hours')::interval then
    raise exception 'TOO_SOON' using errcode = 'P0001';
  end if;

  s_end := p_starts_at + (p_duration_min || ' minutes')::interval;

  -- Atomic conflict check
  select count(*) into conflict_count
  from public.sessions
  where trainer_id = t_id
    and status not in ('cancelled', 'no_show')
    and starts_at < s_end
    and ends_at > p_starts_at;
  if conflict_count > 0 then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end if;

  -- Find or create client (match by email within this trainer)
  select id into c_id
  from public.clients
  where trainer_id = t_id and lower(email) = lower(trim(p_email))
  limit 1;

  if c_id is null then
    insert into public.clients (trainer_id, full_name, email, phone, status, tags, notes)
    values (t_id, trim(p_full_name), lower(trim(p_email)), nullif(trim(coalesce(p_phone, '')), ''), 'active', array['booking'], 'Self-booked via public page')
    returning id into c_id;
  end if;

  -- Insert session as 'scheduled' (trainer can confirm later)
  insert into public.sessions
    (trainer_id, client_id, starts_at, ends_at, status, session_type, location, client_notes)
  values
    (t_id, c_id, p_starts_at, s_end, 'scheduled', 'training', null, p_notes)
  returning id into s_id;

  return jsonb_build_object('session_id', s_id, 'client_id', c_id, 'starts_at', p_starts_at, 'ends_at', s_end);
end;
$$;

grant execute on function public.public_booking_request(text, text, text, text, timestamptz, int, text) to anon, authenticated;

-- ============================================================================
-- DONE.
-- ============================================================================
