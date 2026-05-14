-- Nutrition coach — coach ↔ client messaging thread.
--
-- One row per message. `sender` is 'coach' or 'client' so we know which
-- side of the conversation a message belongs to without joining auth.
-- For V1 only the coach UI sends messages; the client side will come
-- when the client portal lands.

create table if not exists public.nutrition_messages (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  sender text not null check (sender in ('coach', 'client')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists nutrition_messages_trainer_idx
  on public.nutrition_messages (trainer_id, created_at desc);
create index if not exists nutrition_messages_client_idx
  on public.nutrition_messages (client_id, created_at);

alter table public.nutrition_messages enable row level security;

drop policy if exists "Trainer reads own messages" on public.nutrition_messages;
create policy "Trainer reads own messages"
  on public.nutrition_messages
  for select
  using (trainer_id = auth.uid());

drop policy if exists "Trainer writes own messages" on public.nutrition_messages;
create policy "Trainer writes own messages"
  on public.nutrition_messages
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());
