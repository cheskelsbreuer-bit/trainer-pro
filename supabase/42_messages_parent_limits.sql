-- ============================================================================
-- TRAINER PRO — A parent can write to the sitter. Nothing more.
-- ============================================================================
-- The old policy gave a parent FOR ALL on any message in their own thread.
-- Reading and sending is right; the other two verbs it quietly included are
-- not:
--
--   · UPDATE — a parent could rewrite what the sitter had said to them.
--     "You owe $240" becomes "Paid in full", in the sitter's own words, in
--     the sitter's own app, with nothing to show it was changed.
--   · DELETE — a parent could remove the sitter's messages from the thread.
--
-- And the insert check never looked at `sender`, so a parent could post a
-- message marked as coming from the sitter.
--
-- This replaces that one policy with three narrow ones, and takes away the
-- ability to rewrite a message body at the privilege level, where no policy
-- can grant it back by accident. The app has only ever read, inserted, and
-- set read_at, so nothing it does today is affected — for either side.
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

drop policy if exists messages_client_all on public.messages;

-- Read their own thread.
drop policy if exists messages_client_select on public.messages;
create policy messages_client_select on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = messages.client_id and c.auth_user_id = auth.uid()
    )
  );

-- Send, as themselves, into their own thread. `sender = 'client'` is the
-- part that stops a parent posting words in the sitter's name.
drop policy if exists messages_client_insert on public.messages;
create policy messages_client_insert on public.messages
  for insert
  to authenticated
  with check (
    sender = 'client'
    and exists (
      select 1 from public.clients c
      where c.id = messages.client_id and c.auth_user_id = auth.uid()
    )
  );

-- Mark the sitter's messages as read. The column grant below is what keeps
-- this to read_at and nothing else.
drop policy if exists messages_client_mark_read on public.messages;
create policy messages_client_mark_read on public.messages
  for update
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = messages.client_id and c.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = messages.client_id and c.auth_user_id = auth.uid()
    )
  );

-- No DELETE policy for parents, so a parent cannot remove a message at all.

-- Belt and braces: a policy decides WHICH rows you may update; a column
-- grant decides WHICH COLUMNS. Even a future policy written too loosely
-- cannot let anyone rewrite a message body or swap its attachments.
-- read_at is the only thing the app ever updates, on either side.
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;
