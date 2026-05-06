-- ============================================================================
-- TRAINER PRO — Supabase Database Schema
-- ============================================================================
-- Run this once in your Supabase project's SQL Editor.
-- Idempotent: safe to run repeatedly. Uses CREATE TABLE IF NOT EXISTS.
--
-- Architecture:
-- - Single-tenant per Supabase project (each trainer gets their own deploy).
-- - Trainer logs in via Supabase Auth. Their auth.uid() == trainer.id.
-- - Clients are records owned by a trainer; clients can OPTIONALLY have
--   their own auth account for the client portal (Phase 4).
-- - Row Level Security (RLS) enforces: trainer sees their own data;
--   clients see only their own row + their own sessions/payments/workouts.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- TRAINERS (the trainer who owns this Supabase project)
-- ============================================================================
create table if not exists public.trainers (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    business_name text,
    email text,
    phone text,
    timezone text default 'America/New_York',
    currency text default 'USD',
    -- Branding for the trainer's portal
    logo_url text,
    primary_color text default '#2d6a9f',
    -- Default rates / packages JSON: [{name: '1 session', sessions: 1, price: 80}, ...]
    default_packages jsonb default '[]'::jsonb,
    -- Notification preferences
    notify_email boolean default true,
    notify_sms boolean default false,
    sms_phone text,
    -- Misc
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================================
-- CLIENTS (the people the trainer works with)
-- ============================================================================
create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    -- Optional link to a Supabase auth user (for client portal in Phase 4)
    auth_user_id uuid references auth.users(id) on delete set null,
    -- Identity
    full_name text not null,
    email text,
    phone text,
    date_of_birth date,
    -- Health & goals
    goals text,                     -- "Lose 10 lbs, run a 5K"
    medical_notes text,             -- Injuries, medications, conditions
    emergency_contact text,
    -- Categorization
    status text default 'active' check (status in ('active', 'paused', 'archived')),
    tags text[] default '{}',       -- ["morning", "strength", "high-priority"]
    -- Pricing — overrides the trainer's defaults if set
    rate_per_session numeric(10,2),
    package_balance int default 0,  -- Pre-paid sessions remaining
    -- Free-form notes
    notes text,
    -- Audit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists clients_trainer_idx on public.clients(trainer_id);
create index if not exists clients_status_idx on public.clients(trainer_id, status);

-- ============================================================================
-- SESSIONS (every training session — past, present, or future)
-- ============================================================================
create table if not exists public.sessions (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    -- When
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    -- Status
    status text not null default 'scheduled' check (
        status in ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled')
    ),
    -- What
    session_type text default 'training', -- 'training', 'consultation', 'assessment'
    location text,                         -- 'Studio', 'Park', 'Zoom', etc.
    notes text,                            -- Trainer-only notes about the session
    client_notes text,                     -- Notes shared with the client
    -- Money
    price numeric(10,2),                  -- Override price if not using default rate
    paid boolean default false,
    payment_id uuid,                       -- Set after payment is recorded
    -- Workout linkage (Phase 3)
    workout_plan_id uuid,
    -- Reminders
    reminder_sent_at timestamptz,
    -- Audit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists sessions_trainer_starts_idx on public.sessions(trainer_id, starts_at);
create index if not exists sessions_client_idx on public.sessions(client_id);
create index if not exists sessions_status_idx on public.sessions(trainer_id, status);

-- ============================================================================
-- PAYMENTS (money in, separate from sessions for flexibility)
-- ============================================================================
create table if not exists public.payments (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    -- Money
    amount numeric(10,2) not null,
    currency text default 'USD',
    -- What this payment covers
    payment_type text not null default 'session' check (
        payment_type in ('session', 'package', 'subscription', 'refund', 'other')
    ),
    sessions_covered int default 1,        -- For packages
    description text,
    -- Method
    method text check (method in ('cash', 'venmo', 'zelle', 'paypal', 'stripe', 'check', 'other')),
    reference text,                         -- Transaction ID, check number, etc.
    -- When
    paid_at timestamptz default now(),
    -- Audit
    created_at timestamptz default now()
);

create index if not exists payments_trainer_idx on public.payments(trainer_id);
create index if not exists payments_client_idx on public.payments(client_id);
create index if not exists payments_paid_at_idx on public.payments(trainer_id, paid_at desc);

-- ============================================================================
-- WORKOUT PLANS & EXERCISES (Phase 3)
-- ============================================================================
create table if not exists public.workout_plans (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid references public.clients(id) on delete cascade, -- null = template
    name text not null,
    description text,
    -- Plan structure: array of exercise blocks. Stored as JSON for flexibility.
    -- [{name: 'Squat', sets: 3, reps: 10, weight: 95, rest_sec: 60, notes: '...'}, ...]
    exercises jsonb not null default '[]'::jsonb,
    is_template boolean default false,
    -- Audit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists workout_plans_trainer_idx on public.workout_plans(trainer_id);
create index if not exists workout_plans_client_idx on public.workout_plans(client_id);

-- Logged workout: what the client actually did
create table if not exists public.workout_logs (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    session_id uuid references public.sessions(id) on delete set null,
    plan_id uuid references public.workout_plans(id) on delete set null,
    -- Same shape as plan.exercises but with actual weights/reps achieved
    exercises_actual jsonb not null default '[]'::jsonb,
    rpe int,                              -- Rate of perceived exertion 1-10
    notes text,
    logged_at timestamptz default now()
);

create index if not exists workout_logs_client_idx on public.workout_logs(client_id, logged_at desc);

-- ============================================================================
-- PROGRESS METRICS (Phase 3) — weight, body comp, PRs, photos
-- ============================================================================
create table if not exists public.progress_entries (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    -- What kind of measurement
    metric_type text not null,            -- 'weight', 'body_fat', 'waist', 'pr_squat', 'photo_front', etc.
    metric_value numeric(10,2),
    metric_unit text,                     -- 'lbs', 'kg', '%', 'in', 'cm'
    photo_url text,                       -- Supabase Storage URL for progress photos
    notes text,
    measured_at timestamptz default now()
);

create index if not exists progress_client_idx on public.progress_entries(client_id, metric_type, measured_at desc);

-- ============================================================================
-- MESSAGES (Phase 4) — trainer <-> client communication
-- ============================================================================
create table if not exists public.messages (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    client_id uuid not null references public.clients(id) on delete cascade,
    -- Who sent this — 'trainer' or 'client'
    sender text not null check (sender in ('trainer', 'client')),
    body text not null,
    attachments jsonb default '[]'::jsonb, -- [{url, name, mime}]
    read_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists messages_thread_idx on public.messages(client_id, created_at desc);

-- ============================================================================
-- ACTIVITY LOG (audit trail of important changes)
-- ============================================================================
create table if not exists public.activity_log (
    id uuid primary key default uuid_generate_v4(),
    trainer_id uuid not null references public.trainers(id) on delete cascade,
    actor text not null,                   -- 'trainer', 'client', 'system'
    action text not null,                  -- 'created_session', 'recorded_payment', etc.
    entity_type text,                      -- 'session', 'payment', 'client'
    entity_id uuid,
    details jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

create index if not exists activity_log_trainer_idx on public.activity_log(trainer_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Each table is locked down so:
--   * Trainer (auth.uid() == trainer_id) sees ALL rows where they're the owner.
--   * Client (auth.uid() == clients.auth_user_id for that row) sees only their own.
-- ============================================================================

alter table public.trainers           enable row level security;
alter table public.clients            enable row level security;
alter table public.sessions           enable row level security;
alter table public.payments           enable row level security;
alter table public.workout_plans      enable row level security;
alter table public.workout_logs       enable row level security;
alter table public.progress_entries   enable row level security;
alter table public.messages           enable row level security;
alter table public.activity_log       enable row level security;

-- Drop old policies so this script is idempotent
do $$
declare r record;
begin
  for r in (select schemaname, tablename, policyname from pg_policies where schemaname = 'public') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- TRAINERS: trainer can see and modify their own row
create policy trainer_self_select on public.trainers for select using (auth.uid() = id);
create policy trainer_self_update on public.trainers for update using (auth.uid() = id);
create policy trainer_self_insert on public.trainers for insert with check (auth.uid() = id);

-- Helper: a row "belongs to me" if I'm the trainer OR I'm the client linked to it
-- Used as a subquery pattern in policies below.

-- CLIENTS
create policy clients_trainer_all on public.clients for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy clients_self_select on public.clients for select
  using (auth.uid() = auth_user_id);

-- SESSIONS
create policy sessions_trainer_all on public.sessions for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy sessions_client_select on public.sessions for select
  using (exists (select 1 from public.clients c where c.id = sessions.client_id and c.auth_user_id = auth.uid()));

-- PAYMENTS
create policy payments_trainer_all on public.payments for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy payments_client_select on public.payments for select
  using (exists (select 1 from public.clients c where c.id = payments.client_id and c.auth_user_id = auth.uid()));

-- WORKOUT PLANS
create policy plans_trainer_all on public.workout_plans for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy plans_client_select on public.workout_plans for select
  using (exists (select 1 from public.clients c where c.id = workout_plans.client_id and c.auth_user_id = auth.uid()));

-- WORKOUT LOGS
create policy logs_trainer_all on public.workout_logs for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy logs_client_all on public.workout_logs for all
  using (exists (select 1 from public.clients c where c.id = workout_logs.client_id and c.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = workout_logs.client_id and c.auth_user_id = auth.uid()));

-- PROGRESS ENTRIES
create policy progress_trainer_all on public.progress_entries for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy progress_client_all on public.progress_entries for all
  using (exists (select 1 from public.clients c where c.id = progress_entries.client_id and c.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = progress_entries.client_id and c.auth_user_id = auth.uid()));

-- MESSAGES
create policy messages_trainer_all on public.messages for all
  using (auth.uid() = trainer_id) with check (auth.uid() = trainer_id);
create policy messages_client_all on public.messages for all
  using (exists (select 1 from public.clients c where c.id = messages.client_id and c.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = messages.client_id and c.auth_user_id = auth.uid()));

-- ACTIVITY LOG (read-only for trainer; system inserts via service role)
create policy activity_trainer_select on public.activity_log for select using (auth.uid() = trainer_id);

-- ============================================================================
-- TRIGGERS — auto-update updated_at on every UPDATE
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$
language plpgsql;

drop trigger if exists touch_trainers on public.trainers;
create trigger touch_trainers before update on public.trainers
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_clients on public.clients;
create trigger touch_clients before update on public.clients
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_sessions on public.sessions;
create trigger touch_sessions before update on public.sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_workout_plans on public.workout_plans;
create trigger touch_workout_plans before update on public.workout_plans
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- AUTO-CREATE trainer row when a new auth user signs up
-- ============================================================================
create or replace function public.on_auth_user_created()
returns trigger as $$
begin
  insert into public.trainers (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.on_auth_user_created();

-- ============================================================================
-- STORAGE BUCKETS — for progress photos and workout media
-- ============================================================================
-- (Run these via the Storage UI in Supabase, or uncomment these if your project
--  has the storage extension enabled.)
-- insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('client-files', 'client-files', false) on conflict do nothing;

-- ============================================================================
-- DONE.
-- ============================================================================
