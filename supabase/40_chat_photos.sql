-- ============================================================================
-- TRAINER PRO — Photos in the sitter ↔ parent chat
-- ============================================================================
-- The existing 'client-files' bucket lets only the trainer upload; a parent
-- can just read. Chat needs BOTH sides to send pictures ("happy birthday!",
-- "here's what she painted today"), so this adds a bucket where the parent
-- of a linked kid can upload into their own kid's folder and nowhere else.
--
-- Path convention: {trainer_id}/{client_id}/{filename}
--   [1] = trainer_id   [2] = client_id
--
-- Idempotent. Run in the Supabase SQL editor.
-- ============================================================================

insert into storage.buckets (id, name, public)
  values ('chat-photos', 'chat-photos', false)
  on conflict (id) do nothing;

-- The sitter: full access to photos under her own trainer folder.
drop policy if exists chat_photos_trainer_all on storage.objects;
create policy chat_photos_trainer_all on storage.objects for all
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  );

-- The parent: read photos in their own kid's folder…
drop policy if exists chat_photos_parent_select on storage.objects;
create policy chat_photos_parent_select on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and exists (
      select 1 from public.clients c
      where c.auth_user_id = auth.uid()
        and c.id::text = (storage.foldername(name))[2]
    )
  );

-- …and upload into it. Scoped to their own kid: a parent can never write
-- into another family's folder, and never outside this bucket.
drop policy if exists chat_photos_parent_insert on storage.objects;
create policy chat_photos_parent_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-photos'
    and exists (
      select 1 from public.clients c
      where c.auth_user_id = auth.uid()
        and c.id::text = (storage.foldername(name))[2]
    )
  );
