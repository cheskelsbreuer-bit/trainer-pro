-- Boxing fights table.
--
-- One row per bout: either a scheduled future fight (result = null) or a
-- contested fight with a recorded result (win/loss/draw + decision).
-- W-L-D records are computed by aggregating rows for each fighter.

create table if not exists public.boxing_fights (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  fighter_id uuid not null references public.clients(id) on delete cascade,
  opponent_name text,
  starts_at timestamptz not null,
  venue text,
  -- null = scheduled, 'win' / 'loss' / 'draw' = result on record
  result text check (result in ('win', 'loss', 'draw')),
  -- Decision shorthand boxing fans know: KO / TKO / UD / SD / MD / PTS / DQ / No Contest
  decision text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boxing_fights_trainer_idx
  on public.boxing_fights (trainer_id, starts_at desc);
create index if not exists boxing_fights_fighter_idx
  on public.boxing_fights (fighter_id, starts_at desc);

alter table public.boxing_fights enable row level security;

drop policy if exists "Trainer reads own fights" on public.boxing_fights;
create policy "Trainer reads own fights"
  on public.boxing_fights
  for select
  using (trainer_id = auth.uid());

drop policy if exists "Trainer writes own fights" on public.boxing_fights;
create policy "Trainer writes own fights"
  on public.boxing_fights
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- Re-use the touch_updated_at helper from the dojo_tournaments migration.
-- Create it conditionally in case 27_dojo_tournaments hasn't been run yet.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists boxing_fights_touch on public.boxing_fights;
create trigger boxing_fights_touch
  before update on public.boxing_fights
  for each row execute function public.touch_updated_at();
