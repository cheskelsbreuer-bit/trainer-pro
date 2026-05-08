-- ============================================================================
-- TRAINER PRO — In-app feedback ("Send feedback" button in Settings)
-- ============================================================================
-- Authenticated trainers can INSERT a feedback row. Only admins read it via
-- the service-role-backed /admin endpoints.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  trainer_id uuid references public.trainers(id) on delete set null,
  trainer_email text,
  category text not null default 'general'
    check (category in ('bug', 'feature', 'general', 'other')),
  message text not null,
  user_agent text,
  url text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Authed users can submit their own feedback
drop policy if exists "trainer can submit feedback" on public.feedback;
create policy "trainer can submit feedback"
  on public.feedback
  for insert
  to authenticated
  with check (
    auth.uid() = trainer_id
    and message is not null
    and char_length(message) between 1 and 5000
  );

-- No SELECT/UPDATE/DELETE policies → only the service role (admin) can read.
