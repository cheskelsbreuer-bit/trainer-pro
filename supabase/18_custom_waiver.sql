-- ============================================================================
-- TRAINER PRO — Custom waiver per trainer
-- ============================================================================
-- Lets trainers paste their own liability waiver text. If null, the intake
-- page falls back to a sensible default shipped in the frontend.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

alter table public.trainers
  add column if not exists custom_waiver_text text;
