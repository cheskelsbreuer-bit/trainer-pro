-- ============================================================================
-- TRAINER PRO — Waitlist email capture (marketing landing page)
-- ============================================================================
-- Adds a `waitlist_emails` table that the public landing page can write to
-- with the anon key. Anonymous users can INSERT but NEVER read or update.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.waitlist_emails (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_emails_email_lower_uidx
  on public.waitlist_emails (lower(email));

alter table public.waitlist_emails enable row level security;

-- Anyone (including anon) may insert their own email. No reads from client.
drop policy if exists "anon can join waitlist" on public.waitlist_emails;
create policy "anon can join waitlist"
  on public.waitlist_emails
  for insert
  to anon, authenticated
  with check (
    email is not null
    and char_length(email) between 5 and 254
    and email like '%@%.%'
  );

-- No SELECT/UPDATE/DELETE policies → only the service role can read these.
-- (You'll see them in the Supabase Table Editor as the project owner.)
