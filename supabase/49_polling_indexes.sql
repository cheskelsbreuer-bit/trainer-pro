-- ============================================================================
-- TRAINER PRO — indexes for the queries the app repeats all day
-- ============================================================================
-- In October Supabase warned that this project was running out of its disk
-- IO budget, and the daily reminders started timing out or failing on their
-- very first, tiny query. When the budget is spent the disk is throttled and
-- everything slows down at once.
--
-- The steady drain: an open sitter tab asks for her chat every 20 seconds
-- and for her feedback thread every 30, both by trainer_id. Neither table
-- had an index on trainer_id, so every one of those polls read the whole
-- table — every account's rows — and ran the access check on each row,
-- all day, from every open tab. These indexes let each poll read only that
-- sitter's own rows.
--
-- Also indexed: clients.auth_user_id, which every parent-side access check
-- looks up ("which child is mine?").
--
-- Safe to run more than once. Changes no data. Takes seconds on tables
-- this size.
-- ============================================================================

create index if not exists messages_trainer_idx
  on public.messages (trainer_id, created_at);

create index if not exists feedback_trainer_idx
  on public.feedback (trainer_id, created_at);

create index if not exists clients_auth_user_idx
  on public.clients (auth_user_id)
  where auth_user_id is not null;

-- Fresh statistics so the planner starts using the new indexes right away.
analyze public.messages;
analyze public.feedback;
analyze public.clients;
