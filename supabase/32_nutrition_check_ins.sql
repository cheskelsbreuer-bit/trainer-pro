-- Nutrition coach — weekly client check-ins.
--
-- Each row is one client's letter on the week that was: weight, body
-- fat (optional), compliance %, energy/hunger/sleep self-ratings, and
-- a free-text reflection. Coach replies in-line and the row flips
-- from 'pending' to 'reviewed'.

create table if not exists public.nutrition_check_ins (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  week_starting date not null,
  weight_lb numeric,
  body_fat_pct numeric,
  energy_1_5 int check (energy_1_5 between 1 and 5),
  hunger_1_5 int check (hunger_1_5 between 1 and 5),
  sleep_hours_avg numeric,
  compliance_pct int check (compliance_pct between 0 and 100),
  client_notes text,
  coach_reply text,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists nutrition_check_ins_trainer_idx
  on public.nutrition_check_ins (trainer_id, submitted_at desc);
create index if not exists nutrition_check_ins_client_idx
  on public.nutrition_check_ins (client_id, week_starting desc);

alter table public.nutrition_check_ins enable row level security;

drop policy if exists "Trainer reads own check-ins" on public.nutrition_check_ins;
create policy "Trainer reads own check-ins"
  on public.nutrition_check_ins
  for select
  using (trainer_id = auth.uid());

drop policy if exists "Trainer writes own check-ins" on public.nutrition_check_ins;
create policy "Trainer writes own check-ins"
  on public.nutrition_check_ins
  for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

-- Seed function — 10 clients across all four nutrition goals with
-- macro plans, weight progress, and ~3 weeks of check-ins each (some
-- pending, most reviewed).
create or replace function public.nutrition_seed_for_trainer(p_email text)
returns text
language plpgsql
as $$
declare
  v_trainer_id uuid;
  v_now timestamptz := now();
  v_today date := current_date;
  v_client_ids uuid[];
  v_cid uuid;
  i int;
begin
  select id into v_trainer_id from public.trainers where email = p_email;
  if v_trainer_id is null then
    return 'No trainer found with email ' || p_email || '. Make sure you signed up first.';
  end if;

  delete from public.nutrition_check_ins where trainer_id = v_trainer_id
    and client_id in (select id from public.clients where trainer_id = v_trainer_id and 'seed:nutrition' = any(tags));
  delete from public.payments where trainer_id = v_trainer_id
    and client_id in (select id from public.clients where trainer_id = v_trainer_id and 'seed:nutrition' = any(tags));
  delete from public.clients where trainer_id = v_trainer_id and 'seed:nutrition' = any(tags);

  -- Fat-loss — each client on a different PN practice, varied days in.
  -- 14-day window starts: practice started today = day 0, started 14d ago = window done.
  insert into public.clients (trainer_id, full_name, email, status, tags, goals) values
    (v_trainer_id, 'Audrey Lin', 'audrey.l@example.com', 'active',
     array['goal:fat-loss', 'practice:eat-slowly',
           'pstart:' || ((current_date - interval '15 days')::date)::text,
           'kcal:1700', 'protein:140', 'carbs:160', 'fats:55',
           'startingweightlb:174', 'weightlb:163', 'goalweightlb:150', 'seed:nutrition'],
     'Wedding in October. Wants to feel strong in the dress without dieting hard.'),
    (v_trainer_id, 'Marcus Bell', 'marcus.b@example.com', 'active',
     array['goal:fat-loss', 'practice:protein-each-meal',
           'pstart:' || ((current_date - interval '6 days')::date)::text,
           'kcal:2000', 'protein:170', 'carbs:200', 'fats:65',
           'startingweightlb:228', 'weightlb:212', 'goalweightlb:195', 'seed:nutrition'],
     'Type 2 diabetic working with his endocrinologist. Slow, sustainable.'),
    (v_trainer_id, 'Priya Shah', 'priya.s@example.com', 'active',
     array['goal:fat-loss', 'practice:eat-to-80',
           'pstart:' || ((current_date - interval '10 days')::date)::text,
           'kcal:1500', 'protein:120', 'carbs:140', 'fats:50',
           'startingweightlb:158', 'weightlb:155', 'goalweightlb:140', 'seed:nutrition'],
     'Post-partum, 9 months in. Breastfeeding so we keep calories adequate.');

  -- Muscle gain
  insert into public.clients (trainer_id, full_name, email, status, tags, goals) values
    (v_trainer_id, 'Jordan Park', 'jordan.p@example.com', 'active',
     array['goal:muscle-gain', 'practice:hand-portion-carbs',
           'pstart:' || ((current_date - interval '3 days')::date)::text,
           'kcal:2800', 'protein:200', 'carbs:340', 'fats:80',
           'startingweightlb:165', 'weightlb:173', 'goalweightlb:180', 'seed:nutrition'],
     'Lifting 4x/wk. Underweight history — wants to build, not bloat.'),
    (v_trainer_id, 'Camille DuBois', 'camille.d@example.com', 'active',
     array['goal:muscle-gain', 'practice:meal-prep-3x',
           'pstart:' || ((current_date - interval '14 days')::date)::text,
           'kcal:2200', 'protein:155', 'carbs:240', 'fats:70',
           'startingweightlb:132', 'weightlb:138', 'goalweightlb:145', 'seed:nutrition'],
     'Female powerlifter prepping for first meet. Strength over scale weight.');

  -- Maintenance
  insert into public.clients (trainer_id, full_name, email, status, tags, goals) values
    (v_trainer_id, 'Theo Russo', 'theo.r@example.com', 'active',
     array['goal:maintenance', 'practice:something-not-nothing',
           'pstart:' || ((current_date - interval '8 days')::date)::text,
           'kcal:2400', 'protein:160', 'carbs:280', 'fats:75',
           'startingweightlb:185', 'weightlb:183', 'goalweightlb:183', 'seed:nutrition'],
     'Maintenance after a successful 25-lb cut. Wants to hold without thinking about it.'),
    (v_trainer_id, 'Naomi Klein', 'naomi.k@example.com', 'active',
     array['goal:maintenance', 'practice:sleep-7h',
           'pstart:' || ((current_date - interval '5 days')::date)::text,
           'kcal:1900', 'protein:130', 'carbs:200', 'fats:65',
           'startingweightlb:142', 'weightlb:141', 'goalweightlb:140', 'seed:nutrition'],
     'Marathon training. Fueling, not dieting.');

  -- Health-focused
  insert into public.clients (trainer_id, full_name, email, status, tags, goals) values
    (v_trainer_id, 'Eli Tanaka', 'eli.t@example.com', 'active',
     array['goal:health', 'practice:veggies-each-meal',
           'pstart:' || ((current_date - interval '12 days')::date)::text,
           'kcal:2100', 'protein:120', 'carbs:240', 'fats:75',
           'startingweightlb:178', 'weightlb:176', 'goalweightlb:175', 'seed:nutrition'],
     'Mid-50s. Family history of heart disease. Mediterranean-style. Wants more energy.'),
    (v_trainer_id, 'Rosa Mendoza', 'rosa.m@example.com', 'active',
     array['goal:health', 'practice:stress-walk',
           'pstart:' || ((current_date - interval '16 days')::date)::text,
           'kcal:1800', 'protein:100', 'carbs:220', 'fats:65',
           'startingweightlb:160', 'weightlb:158', 'goalweightlb:158', 'seed:nutrition'],
     'IBS-friendly food rules. Stress management is half the work.'),
    (v_trainer_id, 'Yusuf Khan', 'yusuf.k@example.com', 'active',
     array['goal:health', 'practice:five-breaths',
           'pstart:' || ((current_date - interval '2 days')::date)::text,
           'kcal:2000', 'protein:110', 'carbs:230', 'fats:70',
           'startingweightlb:170', 'weightlb:170', 'goalweightlb:170', 'seed:nutrition'],
     'Pre-hypertensive. Cardiologist wants weight steady, sodium down.');

  select array_agg(id) into v_client_ids from public.clients
    where trainer_id = v_trainer_id and 'seed:nutrition' = any(tags);

  -- Check-ins — 3 weekly entries per client. Most recent is 'pending'
  -- for 4 of the 10 clients so the inbox lights up; the rest are
  -- already 'reviewed' (with coach replies).
  i := 0;
  foreach v_cid in array v_client_ids loop
    i := i + 1;
    -- This week (pending for first 4 clients)
    insert into public.nutrition_check_ins (
      trainer_id, client_id, week_starting, weight_lb, body_fat_pct,
      energy_1_5, hunger_1_5, sleep_hours_avg, compliance_pct,
      client_notes, status, submitted_at, coach_reply, reviewed_at
    ) values (
      v_trainer_id, v_cid, v_today - interval '1 day',
      round((140 + random() * 80)::numeric, 1),
      round((18 + random() * 15)::numeric, 1),
      2 + (i % 4),
      2 + ((i + 1) % 4),
      round((6.5 + random() * 1.8)::numeric, 1),
      70 + (i * 7) % 25,
      case (i % 4)
        when 0 then 'Strong week. Hit my protein every day, even on Saturday at the family wedding (the chicken was actually amazing). Sleep is the thing I''m still working on — kids were sick Tuesday/Wednesday and I was up. Cravings have been quieter this week which feels new.'
        when 1 then 'Hard week honestly. Stress at work spiked and I leaned on takeout twice. I logged it, didn''t spiral. Weight tracked up a bit which I expected. Want to talk about what to do during my next high-pressure stretch — it''s a real pattern.'
        when 2 then 'Best week in a while. Meal prepped Sunday, didn''t need willpower the rest of the way. Strength was up — added 5 lb to my deadlift triple. Hunger comfortable. Sleep solid. Energy 4/5.'
        else 'Steady. Nothing dramatic in either direction. Walked the dog every morning which made everything easier. Carbs around training feel like the right call. Looking forward to the next phase.'
      end,
      case when i <= 4 then 'pending' else 'reviewed' end,
      v_now - interval '1 day' - (i * interval '3 hours'),
      case
        when i <= 4 then null
        else 'Beautiful week. Keep the protein anchor and let''s talk about pulling lunch carbs down 20g for the next two weeks.'
      end,
      case when i <= 4 then null else v_now - interval '12 hours' end
    );

    -- Last week (always reviewed)
    insert into public.nutrition_check_ins (
      trainer_id, client_id, week_starting, weight_lb, body_fat_pct,
      energy_1_5, hunger_1_5, sleep_hours_avg, compliance_pct,
      client_notes, status, submitted_at, coach_reply, reviewed_at
    ) values (
      v_trainer_id, v_cid, v_today - interval '8 days',
      round((142 + random() * 80)::numeric, 1),
      round((19 + random() * 15)::numeric, 1),
      3, 3,
      round((7 + random() * 1)::numeric, 1),
      80 + (i * 3) % 15,
      'Solid week, no surprises. Hunger crept up Wednesday/Thursday — might be cycle-related, will track next month.',
      'reviewed',
      v_now - interval '8 days',
      'Cycle hunger is real. Let''s prebook 1 extra meal on those days so it doesn''t catch you flat-footed.',
      v_now - interval '7 days'
    );

    -- Two weeks ago (always reviewed)
    insert into public.nutrition_check_ins (
      trainer_id, client_id, week_starting, weight_lb, body_fat_pct,
      energy_1_5, hunger_1_5, sleep_hours_avg, compliance_pct,
      client_notes, status, submitted_at, coach_reply, reviewed_at
    ) values (
      v_trainer_id, v_cid, v_today - interval '15 days',
      round((144 + random() * 80)::numeric, 1),
      null, 3, 3, 7.5, 85,
      'Boring in the best way. Same routine. Down a pound.',
      'reviewed',
      v_now - interval '15 days',
      'Boring is the goal. Nothing to change.',
      v_now - interval '14 days'
    );
  end loop;

  -- Payments — one per client for this month
  foreach v_cid in array v_client_ids loop
    insert into public.payments (
      trainer_id, client_id, amount, currency, payment_type, method, paid_at, description
    ) values
      (v_trainer_id, v_cid, round((180 + random() * 200)::numeric, 2), 'USD',
       'subscription', 'stripe',
       v_now - (random() * interval '20 days'),
       'Monthly coaching');
  end loop;

  return 'Seeded 10 clients across fat-loss/maintenance/muscle-gain/health, '
    || '30 weekly check-ins (4 pending in your inbox), and 10 payments. '
    || 'Reload the practice.';
end;
$$;
