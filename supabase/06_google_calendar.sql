-- ============================================================================
-- TRAINER PRO — Google Calendar two-way sync (scaffold)
-- ============================================================================
-- Adds the columns needed to store the Google OAuth refresh token + the
-- target calendar id + sync state. The actual sync logic lives in the
-- backend (Phase 2.x — see docs/GOOGLE_CALENDAR_SETUP.md).
--
-- Idempotent. Run in Supabase SQL editor when you're ready to enable sync.
-- ============================================================================

alter table public.trainers add column if not exists google_refresh_token text;
alter table public.trainers add column if not exists google_calendar_id text;
alter table public.trainers add column if not exists google_sync_enabled boolean default false;
alter table public.trainers add column if not exists google_last_sync_at timestamptz;

-- Map between our session ids and Google event ids, so updates/deletes flow.
create table if not exists public.google_calendar_sync (
    session_id uuid primary key references public.sessions(id) on delete cascade,
    google_event_id text not null,
    last_pushed_at timestamptz default now(),
    last_pulled_at timestamptz
);

create index if not exists gcs_event_idx on public.google_calendar_sync(google_event_id);

alter table public.google_calendar_sync enable row level security;

drop policy if exists gcs_trainer_all on public.google_calendar_sync;
create policy gcs_trainer_all on public.google_calendar_sync for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = google_calendar_sync.session_id and s.trainer_id = auth.uid()
    )
  );

-- ============================================================================
-- DONE.
-- ============================================================================
