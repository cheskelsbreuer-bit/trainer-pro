-- ============================================================================
-- TRAINER PRO — First-run onboarding wizard
-- ============================================================================
-- Adds three columns to trainers:
--   * onboarded_at      — null until the wizard finishes; set to now() on completion
--   * client_count_estimate — bucketed answer to "how many clients now?"
--   * specialty            — primary training focus (used to pre-fill templates later)
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

alter table public.trainers
  add column if not exists onboarded_at timestamptz,
  add column if not exists client_count_estimate text,
  add column if not exists specialty text;

-- Loose validation; nulls allowed because pre-existing rows haven't answered.
alter table public.trainers
  drop constraint if exists trainers_client_count_estimate_check;
alter table public.trainers
  add constraint trainers_client_count_estimate_check
  check (
    client_count_estimate is null
    or client_count_estimate in ('0', '1-5', '6-15', '16-30', '30+')
  );

alter table public.trainers
  drop constraint if exists trainers_specialty_check;
alter table public.trainers
  add constraint trainers_specialty_check
  check (
    specialty is null
    or specialty in ('strength', 'weight_loss', 'general_fitness', 'athletic_performance', 'mobility_rehab', 'other')
  );

-- Mark every existing trainer as already onboarded so we don't surprise anyone
-- who's been using the app for months.
update public.trainers
   set onboarded_at = now()
 where onboarded_at is null;
