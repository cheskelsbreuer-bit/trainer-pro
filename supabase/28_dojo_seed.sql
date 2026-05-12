-- Dojo seed data — populates a trainer's dojo with 10 realistic students,
-- mixed belt ranks, two family groups, a month of payments, a couple of
-- tournaments, and a handful of classes today/this week. So you can see
-- the dashboard, Belts page, and Billing page light up the way they will
-- once you have real students.
--
-- USAGE:
--   1. Run migration 27_dojo_tournaments.sql first (creates the tournaments table).
--   2. Run this file (creates the function below).
--   3. Then call:
--        select dojo_seed_for_trainer('your-email@example.com');
--
-- Safe to re-run — the function wipes any seed-marked rows first (rows
-- with a tag of `seed:dojo` on clients, and tournaments with notes starting
-- with `[seed]`) so you can iterate.

create or replace function public.dojo_seed_for_trainer(p_email text)
returns text
language plpgsql
as $$
declare
  v_trainer_id uuid;
  v_count int;
  v_now timestamptz := now();
  v_smith_ids uuid[];
  v_johnson_ids uuid[];
  v_solo_ids uuid[];
  v_all_ids uuid[];
  v_cid uuid;
begin
  select id into v_trainer_id from public.trainers where email = p_email;
  if v_trainer_id is null then
    return 'No trainer found with email ' || p_email
      || '. Make sure you signed up first.';
  end if;

  -- Clean up any prior seed run so this is idempotent.
  delete from public.payments
    where trainer_id = v_trainer_id
      and client_id in (
        select id from public.clients
        where trainer_id = v_trainer_id and 'seed:dojo' = any(tags)
      );
  delete from public.sessions
    where trainer_id = v_trainer_id
      and client_id in (
        select id from public.clients
        where trainer_id = v_trainer_id and 'seed:dojo' = any(tags)
      );
  delete from public.clients
    where trainer_id = v_trainer_id and 'seed:dojo' = any(tags);
  delete from public.dojo_tournaments
    where trainer_id = v_trainer_id
      and (notes like '[seed]%' or name like '[seed]%');

  -- ── Family: Smith (3 kids — typical sibling dojo membership) ────────
  insert into public.clients (
    trainer_id, full_name, email, status, tags, package_balance,
    date_of_birth, goals
  ) values
    (v_trainer_id, 'Ethan Smith', 'ethan.smith@example.com', 'active',
     array['belt:yellow', 'family:smith', 'seed:dojo'], 18,
     (v_now - interval '11 years')::date,
     'Earn green belt by year-end. Loves kata.'),
    (v_trainer_id, 'Olivia Smith', 'olivia.smith@example.com', 'active',
     array['belt:orange', 'family:smith', 'seed:dojo'], 24,
     (v_now - interval '9 years')::date,
     'Tournament team — sparring focus.'),
    (v_trainer_id, 'Mason Smith', 'mason.smith@example.com', 'active',
     array['belt:white', 'family:smith', 'seed:dojo'], 6,
     (v_now - interval '6 years')::date,
     'Brand new — first month on the mat.')
  returning id into v_cid;
  -- collect the smith ids
  select array_agg(id) into v_smith_ids
    from public.clients
    where trainer_id = v_trainer_id and 'family:smith' = any(tags)
      and 'seed:dojo' = any(tags);

  -- ── Family: Johnson (2 adults — parent + young adult) ──────────────
  insert into public.clients (
    trainer_id, full_name, email, status, tags, package_balance,
    date_of_birth, goals
  ) values
    (v_trainer_id, 'Marcus Johnson', 'marcus.j@example.com', 'active',
     array['belt:green', 'family:johnson', 'seed:dojo'], 31,
     (v_now - interval '42 years')::date,
     'Returning student — black belt by 2027.'),
    (v_trainer_id, 'Aaliyah Johnson', 'aaliyah.j@example.com', 'active',
     array['belt:blue', 'family:johnson', 'seed:dojo'], 28,
     (v_now - interval '19 years')::date,
     'College team prep. Strong kicks.');
  select array_agg(id) into v_johnson_ids
    from public.clients
    where trainer_id = v_trainer_id and 'family:johnson' = any(tags)
      and 'seed:dojo' = any(tags);

  -- ── Solo students (5) — varied belts including a black belt ─────────
  insert into public.clients (
    trainer_id, full_name, email, status, tags, package_balance,
    date_of_birth, goals
  ) values
    (v_trainer_id, 'Sofia Martinez', 'sofia.m@example.com', 'active',
     array['belt:purple', 'seed:dojo'], 33,
     (v_now - interval '28 years')::date,
     'Cross-training BJJ practitioner working on karate.'),
    (v_trainer_id, 'Liam O''Brien', 'liam.ob@example.com', 'active',
     array['belt:brown', 'seed:dojo'], 22,
     (v_now - interval '34 years')::date,
     'Six months from black belt test.'),
    (v_trainer_id, 'Hana Tanaka', 'hana.t@example.com', 'active',
     array['belt:black-1', 'seed:dojo'], 5,
     (v_now - interval '31 years')::date,
     'Assistant instructor. Working on 2nd dan.'),
    (v_trainer_id, 'Priya Patel', 'priya.p@example.com', 'active',
     array['belt:yellow', 'seed:dojo'], 14,
     (v_now - interval '38 years')::date,
     'Adult beginner, three months in.'),
    (v_trainer_id, 'Carlos Reyes', 'carlos.r@example.com', 'active',
     array['belt:orange', 'seed:dojo'], 9,
     (v_now - interval '25 years')::date,
     'Just promoted from yellow — building momentum.');
  select array_agg(id) into v_solo_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:dojo' = any(tags)
      and not ('family:smith' = any(tags))
      and not ('family:johnson' = any(tags));

  v_all_ids := v_smith_ids || v_johnson_ids || v_solo_ids;

  -- ── Payments — give each student 1-2 recent payments ─────────────────
  -- Mix of amounts (typical dojo monthly tuition $100-200) and methods.
  foreach v_cid in array v_all_ids loop
    insert into public.payments (
      trainer_id, client_id, amount, currency, payment_type,
      method, paid_at, description
    ) values
      (v_trainer_id, v_cid,
       round((random() * 80 + 120)::numeric, 2),
       'USD', 'subscription',
       (array['cash','venmo','zelle','stripe'])[1 + floor(random() * 4)::int],
       v_now - (random() * interval '20 days'),
       'Monthly tuition'),
      (v_trainer_id, v_cid,
       round((random() * 80 + 120)::numeric, 2),
       'USD', 'subscription',
       (array['cash','venmo','zelle','stripe'])[1 + floor(random() * 4)::int],
       v_now - interval '1 month' - (random() * interval '10 days'),
       'Monthly tuition');
  end loop;

  -- ── Tournaments — one upcoming, one past ────────────────────────────
  insert into public.dojo_tournaments (
    trainer_id, name, starts_at, location, notes
  ) values
    (v_trainer_id, '[seed] Regional Open — Spring Cup',
     v_now + interval '21 days', 'Brooklyn Convention Center',
     'Registration open through next Friday.'),
    (v_trainer_id, '[seed] Winter Friendship Tournament',
     v_now - interval '45 days', 'Queens Athletic Club',
     'Olivia placed 2nd in kata.');

  -- ── A few classes this week so the dashboard + class grid show data ─
  -- (sessions table needs a client_id; pick the first seed student.)
  foreach v_cid in array v_all_ids[1:3] loop
    insert into public.sessions (
      trainer_id, client_id, starts_at, ends_at, status, session_type
    ) values
      (v_trainer_id, v_cid,
       date_trunc('day', v_now) + interval '17 hours',
       date_trunc('day', v_now) + interval '18 hours',
       'scheduled', 'Kids Karate'),
      (v_trainer_id, v_cid,
       date_trunc('day', v_now) + interval '18 hours 30 minutes',
       date_trunc('day', v_now) + interval '19 hours 30 minutes',
       'scheduled', 'Adults Karate');
  end loop;

  select count(*) into v_count
    from public.clients
    where trainer_id = v_trainer_id and 'seed:dojo' = any(tags);

  return 'Seeded ' || v_count || ' students, 2 families, ~20 payments, '
    || '2 tournaments, and a handful of classes. Reload your dojo.';
end;
$$;
