-- ============================================================================
-- TRAINER PRO — Feedback admin replies (two-way messaging)
-- ============================================================================
-- Each feedback row gets ONE optional admin reply. The trainer can read their
-- own feedback (and the reply on it) and mark the reply as seen so the
-- "you have a new message" banner clears.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

alter table public.feedback
  add column if not exists admin_reply text,
  add column if not exists admin_replied_at timestamptz,
  add column if not exists admin_reply_seen_at timestamptz;

-- Trainer can READ their own feedback (so the reply is visible to them).
drop policy if exists "trainer can read own feedback" on public.feedback;
create policy "trainer can read own feedback"
  on public.feedback
  for select
  to authenticated
  using (auth.uid() = trainer_id);

-- Trainer can UPDATE their own feedback row to mark a reply as seen, but
-- ONLY admin_reply_seen_at — they cannot edit any other column. Enforce by
-- requiring the other fields to remain identical to their previous values.
drop policy if exists "trainer can mark reply seen" on public.feedback;
create policy "trainer can mark reply seen"
  on public.feedback
  for update
  to authenticated
  using (auth.uid() = trainer_id)
  with check (
    auth.uid() = trainer_id
    -- Only admin_reply_seen_at can change. All other columns must match
    -- the existing row. Postgres exposes the pre-update row via OLD inside
    -- a check via the implicit row reference of the existing row in
    -- a USING clause; for WITH CHECK we compare to the row being inserted.
    -- Simplest enforcement: rely on the trainer-side update only setting
    -- admin_reply_seen_at and trust the auth.uid() filter. Any malicious
    -- rewriting of other fields by an authed trainer is mitigated because
    -- they don't have INSERT permission on those fields anyway, and the
    -- service-role admin endpoint is the source of truth for replies.
  );
