-- Dojo tournaments table.
--
-- Tournaments need their own table — they're not sessions and they're not
-- payments. The previous V1 implementation tried to overload `sessions`
-- with session_type='tournament' but that needs a non-null client_id FK,
-- which a tournament doesn't have. This migration gives them a proper home.

create table if not exists public.dojo_tournaments (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  name text not null,
  starts_at timestamptz not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dojo_tournaments_trainer_idx
  on public.dojo_tournaments (trainer_id, starts_at);

alter table public.dojo_tournaments enable row level security;

drop policy if exists "Trainer reads own tournaments" on public.dojo_tournaments;
create policy "Trainer reads own tournaments"
  on public.dojo_tournaments
  for select
  using (trainer_id = auth.uid());

drop policy if exists "Trainer writes own tournaments" on public.dojo_tournaments;
create policy "Trainer writes own tournaments"
  on public.dojo_tournaments
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- updated_at trigger — use a small helper if not already present.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dojo_tournaments_touch on public.dojo_tournaments;
create trigger dojo_tournaments_touch
  before update on public.dojo_tournaments
  for each row execute function public.touch_updated_at();
