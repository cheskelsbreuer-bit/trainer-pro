-- ============================================================================
-- TRAINER PRO — Convert specialty (single) → specialties (multi-select)
-- ============================================================================
-- Drops the constraint+column added in 15_onboarding.sql and replaces with a
-- text[] array column. Pre-existing single values are migrated into the array.
--
-- Idempotent. Run AFTER 15_onboarding.sql.
-- ============================================================================

-- Add the new array column first
alter table public.trainers
  add column if not exists specialties text[] not null default '{}';

-- Migrate any existing single specialty value into the array
update public.trainers
   set specialties = array[specialty]
 where specialty is not null
   and (specialties is null or array_length(specialties, 1) is null);

-- Drop the old constraint and column
alter table public.trainers
  drop constraint if exists trainers_specialty_check;

alter table public.trainers
  drop column if exists specialty;
