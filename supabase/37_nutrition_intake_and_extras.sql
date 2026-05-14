-- Nutrition app — intake forms + group programs.
--
-- Intake form: stored per-client as a single jsonb document so the
-- coach can use a flexible questionnaire (allergies, history, why
-- they're here, etc.) without us defining a rigid schema up-front.
-- The frontend renders a default question set; coaches can override
-- per-trainer in a future iteration.
--
-- Group programs: simple "this client is in this cohort" association
-- with a program start date. Real programs (with daily lessons,
-- scheduled drops, etc.) come later — V1 just lets the coach group
-- clients running the same 8-week reset together.

create table if not exists public.nutrition_intake (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade unique,
  -- jsonb: { question_id: answer_text, ... }
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nutrition_intake_trainer_idx
  on public.nutrition_intake (trainer_id);

alter table public.nutrition_intake enable row level security;

drop policy if exists "Trainer reads own intake" on public.nutrition_intake;
create policy "Trainer reads own intake"
  on public.nutrition_intake for select using (trainer_id = auth.uid());

drop policy if exists "Trainer writes own intake" on public.nutrition_intake;
create policy "Trainer writes own intake"
  on public.nutrition_intake for all
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

-- Group programs
create table if not exists public.nutrition_programs (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  name text not null,
  description text,
  weeks int default 8,
  starts_at date,
  status text not null default 'active' check (status in ('draft','active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nutrition_program_members (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.nutrition_programs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (program_id, client_id)
);

create index if not exists nutrition_programs_trainer_idx
  on public.nutrition_programs (trainer_id);

alter table public.nutrition_programs enable row level security;
alter table public.nutrition_program_members enable row level security;

drop policy if exists "Trainer reads own programs" on public.nutrition_programs;
create policy "Trainer reads own programs"
  on public.nutrition_programs for select using (trainer_id = auth.uid());

drop policy if exists "Trainer writes own programs" on public.nutrition_programs;
create policy "Trainer writes own programs"
  on public.nutrition_programs for all
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

drop policy if exists "Trainer reads own program members" on public.nutrition_program_members;
create policy "Trainer reads own program members"
  on public.nutrition_program_members for select
  using (program_id in (select id from public.nutrition_programs where trainer_id = auth.uid()));

drop policy if exists "Trainer writes own program members" on public.nutrition_program_members;
create policy "Trainer writes own program members"
  on public.nutrition_program_members for all
  using (program_id in (select id from public.nutrition_programs where trainer_id = auth.uid()))
  with check (program_id in (select id from public.nutrition_programs where trainer_id = auth.uid()));

-- Storage bucket for progress photos (created via dashboard or below).
-- This block creates the bucket if it doesn't exist. RLS policies on
-- storage.objects come next.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'nutrition-photos') then
    insert into storage.buckets (id, name, public)
    values ('nutrition-photos', 'nutrition-photos', true);
  end if;
end $$;

-- Storage policies: trainers can read/write their own check-in photos.
-- The path convention is "<trainer_id>/<client_id>/<filename>" so we
-- gate on the first path segment matching auth.uid().
drop policy if exists "Trainer reads own photos" on storage.objects;
create policy "Trainer reads own photos"
  on storage.objects for select
  using (
    bucket_id = 'nutrition-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Trainer writes own photos" on storage.objects;
create policy "Trainer writes own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'nutrition-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read photos" on storage.objects;
create policy "Public read photos"
  on storage.objects for select
  using (bucket_id = 'nutrition-photos');
