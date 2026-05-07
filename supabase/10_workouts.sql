-- ============================================================================
-- TRAINER PRO — Phase 3: Workouts library + storage policies
-- ============================================================================
-- Adds:
--   * exercises  — reusable library of exercises, with three scopes:
--     - Global (trainer_id null, studio_id null) — shared starter library
--     - Trainer-personal (trainer_id set)
--     - Studio-shared (studio_id set)
--   * Optional exercise_id reference inside workout_plans.exercises JSON
--     stays loose; we don't enforce — plans snapshot the exercise to keep
--     historical accuracy if the library entry later changes.
--   * Storage bucket policies for 'progress-photos' and 'client-files'
--     so trainers and their authorized clients can read/write photos.
--
-- Idempotent. Run in Supabase SQL editor.
-- ============================================================================

create table if not exists public.exercises (
    id uuid primary key default uuid_generate_v4(),
    -- Scoping (exactly zero or one should be set; both null = global)
    trainer_id uuid references public.trainers(id) on delete cascade,
    studio_id uuid references public.studios(id) on delete cascade,
    -- Identity
    name text not null,
    category text check (category in ('strength', 'cardio', 'mobility', 'plyo', 'core', 'rehab', 'other')),
    primary_muscle text,
    equipment text,
    -- Media
    video_url text,
    thumbnail_url text,
    description text,
    -- Defaults the workout builder should suggest
    default_sets int default 3,
    default_reps text default '8-12',
    default_rest_sec int default 60,
    -- Categorization
    tags text[] default '{}',
    -- Audit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Trigram extension for fast name search. MUST come before any gin_trgm_ops
-- index that depends on it.
create extension if not exists pg_trgm;

create index if not exists exercises_trainer_idx on public.exercises(trainer_id);
create index if not exists exercises_studio_idx on public.exercises(studio_id);
create index if not exists exercises_name_trgm_idx on public.exercises using gin (name gin_trgm_ops);

drop trigger if exists touch_exercises on public.exercises;
create trigger touch_exercises before update on public.exercises
  for each row execute function public.touch_updated_at();

-- RLS: every authenticated trainer can SELECT global rows; can SELECT studio
-- rows when in that studio; can SELECT/INSERT/UPDATE/DELETE their own rows;
-- studio owners can manage studio-shared rows.
alter table public.exercises enable row level security;

drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select
  using (
    -- Global library
    (trainer_id is null and studio_id is null)
    -- My own
    or trainer_id = auth.uid()
    -- In my studio (any studio member can read)
    or (studio_id is not null and exists (
      select 1 from public.trainers t
      where t.id = auth.uid() and t.studio_id = exercises.studio_id
    ))
    -- Studio owner's view of their staff trainers' personal exercises
    or (trainer_id is not null and public.shares_studio_with(trainer_id))
  );

drop policy if exists exercises_insert on public.exercises;
create policy exercises_insert on public.exercises for insert
  with check (
    -- Personal (mine)
    (trainer_id = auth.uid() and studio_id is null)
    -- Studio-shared (must be the studio's owner)
    or (studio_id is not null and trainer_id is null and exists (
      select 1 from public.studios s
      where s.id = exercises.studio_id and s.owner_id = auth.uid()
    ))
  );

drop policy if exists exercises_update on public.exercises;
create policy exercises_update on public.exercises for update
  using (
    trainer_id = auth.uid()
    or (studio_id is not null and exists (
      select 1 from public.studios s
      where s.id = exercises.studio_id and s.owner_id = auth.uid()
    ))
  )
  with check (
    trainer_id = auth.uid()
    or (studio_id is not null and exists (
      select 1 from public.studios s
      where s.id = exercises.studio_id and s.owner_id = auth.uid()
    ))
  );

drop policy if exists exercises_delete on public.exercises;
create policy exercises_delete on public.exercises for delete
  using (
    trainer_id = auth.uid()
    or (studio_id is not null and exists (
      select 1 from public.studios s
      where s.id = exercises.studio_id and s.owner_id = auth.uid()
    ))
  );

-- ============================================================================
-- Storage buckets — progress photos + client files
-- ============================================================================
-- These create the buckets if they don't already exist. The Storage UI in
-- Supabase can also create them — either is fine.
insert into storage.buckets (id, name, public)
  values ('progress-photos', 'progress-photos', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('client-files', 'client-files', false)
  on conflict (id) do nothing;

-- Convention: file path is "{trainer_id}/{client_id}/{filename}".
-- The trainer + studio owner can read/write any client's files in their
-- scope. The linked client (auth.uid() = clients.auth_user_id) can read
-- THEIR own files, but cannot upload (Phase 4 will add upload from portal).

drop policy if exists progress_photos_trainer_all on storage.objects;
create policy progress_photos_trainer_all on storage.objects for all
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  );

drop policy if exists progress_photos_client_select on storage.objects;
create policy progress_photos_client_select on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.clients c
      where c.auth_user_id = auth.uid()
        and c.id::text = (storage.foldername(name))[2]
    )
  );

drop policy if exists client_files_trainer_all on storage.objects;
create policy client_files_trainer_all on storage.objects for all
  to authenticated
  using (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'client-files'
    and (storage.foldername(name))[1] is not null
    and public.is_my_data((storage.foldername(name))[1]::uuid)
  );

drop policy if exists client_files_client_select on storage.objects;
create policy client_files_client_select on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-files'
    and exists (
      select 1 from public.clients c
      where c.auth_user_id = auth.uid()
        and c.id::text = (storage.foldername(name))[2]
    )
  );

-- ============================================================================
-- DONE.
-- ============================================================================
