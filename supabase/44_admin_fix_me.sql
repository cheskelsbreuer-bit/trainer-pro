-- ============================================================================
-- TRAINER PRO — "Why does /hq show me a 404?"
-- ============================================================================
-- The admin page shows a fake 404 to anyone who isn't an admin, on purpose,
-- so a stranger who guesses the URL learns nothing. The cost of that is it
-- also tells the real admin nothing.
--
-- There are only two reasons it happens:
--   1. the signed-in account has is_admin = false, or
--   2. there is no trainers row whose id matches the signed-in auth user.
--
-- Migration 22 promoted whoever had 'chesky2039@gmail.com' in the TRAINERS
-- table. That column can be blank or stale — it's filled in at signup and
-- never re-synced — and it is not what you sign in with. This matches on
-- the AUTH email instead, which is the address the magic link goes to.
--
-- Safe to run as often as you like. It promotes exactly one address and
-- reads nothing out.
-- ============================================================================

-- ── The fix ───────────────────────────────────────────────────────────
update public.trainers t
   set is_admin = true
  from auth.users u
 where u.id = t.id
   and lower(u.email) = lower('chesky2039@gmail.com');

-- ── The report: run this second, and read it ──────────────────────────
-- One row per account that can sign in with that address. What you want
-- to see is exactly one row, with has_trainer_row = true and is_admin = true.
--
--   has_trainer_row = false  → you signed up as this email but never got a
--                              trainers row. Sign in to the normal app once
--                              at trainerpro.coach, then run this file again.
--   two rows                 → you have two accounts with the same address
--                              on different providers. The one you actually
--                              sign in with is the one that needs is_admin.
select
  u.id                        as auth_user_id,
  u.email                     as signs_in_as,
  (t.id is not null)          as has_trainer_row,
  coalesce(t.is_admin, false) as is_admin,
  t.email                     as email_on_the_trainer_row,
  u.last_sign_in_at
from auth.users u
left join public.trainers t on t.id = u.id
where lower(u.email) = lower('chesky2039@gmail.com');
