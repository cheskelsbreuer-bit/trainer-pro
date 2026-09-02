-- ============================================================================
-- TRAINER PRO — everything still waiting, in one paste
-- ============================================================================
-- Two changes. Safe to run more than once, and safe to run on a live app:
-- nothing here drops data, and nothing the app does today depends on it.
--
--   1. Let the admin page move an account into the right app when someone
--      picks the wrong template at signup.
--   2. Stop a parent being able to rewrite or delete the sitter's messages.
--
-- Supabase dashboard → SQL Editor → New query → paste all of this → Run.
-- "Success. No rows returned" is what you want to see.
-- ============================================================================


-- ── 1 of 2 ─────────────────────────────────────────────────────────────────
-- ============================================================================
-- TRAINER PRO — Admin can move an account to a different app
-- ============================================================================
-- When someone signs up they pick a template, and that template decides
-- which app they land in (babysitting, coach, …). If they picked the wrong
-- one there was no way to fix it: admin_trainer_patch ignored
-- template_slugs. This teaches it that one field, so the admin page can
-- switch an account to the right app without touching the database by hand.
--
-- Everything else is unchanged, and the admin check is still the same one.
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

create or replace function public.admin_trainer_patch(
  p_trainer_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slugs text[];
begin
  if not public.is_caller_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  -- template_slugs arrives as a JSON array, e.g. ["babysitting"]. Anything
  -- else (absent, null, not an array) leaves the column alone.
  if jsonb_typeof(p_patch->'template_slugs') = 'array' then
    select array_agg(value::text)
      into v_slugs
      from jsonb_array_elements_text(p_patch->'template_slugs') as value
     where length(trim(value)) > 0;
  end if;

  update public.trainers set
    full_name = coalesce(p_patch->>'full_name', full_name),
    business_name = coalesce(p_patch->>'business_name', business_name),
    service_area = coalesce(p_patch->>'service_area', service_area),
    directory_listed = coalesce((p_patch->>'directory_listed')::boolean, directory_listed),
    booking_enabled = coalesce((p_patch->>'booking_enabled')::boolean, booking_enabled),
    template_slugs = coalesce(v_slugs, template_slugs),
    updated_at = now()
  where id = p_trainer_id;

  return public.admin_trainer_detail(p_trainer_id);
end;
$$;

grant execute on function public.admin_trainer_patch(uuid, jsonb) to authenticated;


-- ── 2 of 2 ─────────────────────────────────────────────────────────────────
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
