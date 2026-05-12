-- Boxing gym seed — 10 fighters across the Rec / Amateur / Pro pipeline,
-- weight classes, stances, ~30 fight rows (some scheduled, some past with
-- results so the W-L-D record chip lights up), payments, and a few
-- recent training sessions.
--
-- USAGE:
--   1. Run 29_boxing_fights.sql first (creates the fights table).
--   2. Run this file (creates the seed function).
--   3. Then call: select public.boxing_seed_for_trainer('your-email@example.com');
--
-- Idempotent — re-running wipes prior seed rows (tagged 'seed:boxing').

create or replace function public.boxing_seed_for_trainer(p_email text)
returns text
language plpgsql
as $$
declare
  v_trainer_id uuid;
  v_count int;
  v_now timestamptz := now();
  v_fighter_ids uuid[];
  v_cid uuid;
  v_pro_ids uuid[];
  v_amateur_ids uuid[];
begin
  select id into v_trainer_id from public.trainers where email = p_email;
  if v_trainer_id is null then
    return 'No trainer found with email ' || p_email
      || '. Make sure you signed up first.';
  end if;

  -- Wipe any prior seed data for this trainer.
  delete from public.boxing_fights
    where trainer_id = v_trainer_id
      and fighter_id in (
        select id from public.clients
        where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      );
  delete from public.payments
    where trainer_id = v_trainer_id
      and client_id in (
        select id from public.clients
        where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      );
  delete from public.sessions
    where trainer_id = v_trainer_id
      and client_id in (
        select id from public.clients
        where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      );
  delete from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags);

  -- ── Pro tier (2 fighters with serious records) ──────────────────────
  insert into public.clients (
    trainer_id, full_name, email, status, tags, date_of_birth, goals
  ) values
    (v_trainer_id, 'Reign Marshall', 'reign.m@example.com', 'active',
     array['tier:pro', 'weight:welterweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '28 years')::date,
     'Title shot by year-end. Game plan camp.'),
    (v_trainer_id, 'Diego Vargas', 'diego.v@example.com', 'active',
     array['tier:pro', 'weight:lightweight', 'stance:southpaw', 'seed:boxing'],
     (v_now - interval '31 years')::date,
     'Headline 10-rounder in spring.');

  select array_agg(id) into v_pro_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      and 'tier:pro' = any(tags);

  -- ── Amateur tier (4 fighters competing in USA Boxing) ────────────────
  insert into public.clients (
    trainer_id, full_name, email, status, tags, date_of_birth, goals
  ) values
    (v_trainer_id, 'Jasmine Cole', 'jasmine.c@example.com', 'active',
     array['tier:amateur', 'weight:flyweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '22 years')::date,
     'Regional Golden Gloves run.'),
    (v_trainer_id, 'Tariq Bell', 'tariq.b@example.com', 'active',
     array['tier:amateur', 'weight:middleweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '24 years')::date,
     'Building amateur record before turning pro.'),
    (v_trainer_id, 'Mila Petrov', 'mila.p@example.com', 'active',
     array['tier:amateur', 'weight:bantamweight', 'stance:southpaw', 'seed:boxing'],
     (v_now - interval '20 years')::date,
     'Sparring 6 rounds Tuesdays + Thursdays.'),
    (v_trainer_id, 'Andre Kim', 'andre.k@example.com', 'active',
     array['tier:amateur', 'weight:featherweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '19 years')::date,
     'First smoker coming up.');

  select array_agg(id) into v_amateur_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      and 'tier:amateur' = any(tags);

  -- ── Recreational tier (4 fighters — fitness boxers) ──────────────────
  insert into public.clients (
    trainer_id, full_name, email, status, tags, date_of_birth, goals
  ) values
    (v_trainer_id, 'Hannah Brooks', 'hannah.b@example.com', 'active',
     array['tier:rec', 'weight:lightweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '35 years')::date,
     'Bag work, conditioning. No sparring yet.'),
    (v_trainer_id, 'Sam Holloway', 'sam.h@example.com', 'active',
     array['tier:rec', 'weight:middleweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '41 years')::date,
     'Wants to spar eventually. Loves mitts.'),
    (v_trainer_id, 'Beatriz Cruz', 'bea.c@example.com', 'active',
     array['tier:rec', 'weight:featherweight', 'stance:southpaw', 'seed:boxing'],
     (v_now - interval '29 years')::date,
     'Lost 20 lb training here, wants 20 more.'),
    (v_trainer_id, 'Wesley Ng', 'wesley.n@example.com', 'active',
     array['tier:rec', 'weight:welterweight', 'stance:orthodox', 'seed:boxing'],
     (v_now - interval '33 years')::date,
     'Stress relief 3x a week. Solid bag work.');

  select array_agg(id) into v_fighter_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags);

  -- ── Fight history for the pros — solid records ──────────────────────
  -- Reign Marshall: 12-1-0 (8 KO) — title contender shape
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes
  ) values
    (v_trainer_id, v_pro_ids[1], 'Marco Reyes', v_now - interval '2 months',
     'Barclays Center, Brooklyn', 'win', 'KO',
     'Beautiful left hook in round 4.'),
    (v_trainer_id, v_pro_ids[1], 'Anthony Stark', v_now - interval '6 months',
     'MGM Grand, Las Vegas', 'win', 'UD',
     'Outboxed him every round. 119-109 cards.'),
    (v_trainer_id, v_pro_ids[1], 'Hector Velazquez', v_now - interval '10 months',
     'Madison Square Garden', 'win', 'TKO',
     'Stoppage round 6.'),
    (v_trainer_id, v_pro_ids[1], 'Kwame Johnson', v_now - interval '14 months',
     'StubHub Center, LA', 'win', 'UD', 'Clean win.'),
    (v_trainer_id, v_pro_ids[1], 'Tyler West', v_now - interval '18 months',
     'Wynn, Vegas', 'loss', 'SD',
     'Tough split. Should have been a draw.'),
    (v_trainer_id, v_pro_ids[1], 'Jorge Aguilar', v_now - interval '22 months',
     'T-Mobile Arena', 'win', 'KO', 'Body shot in 3.'),
    (v_trainer_id, v_pro_ids[1], 'Future Opponent — TBA', v_now + interval '8 weeks',
     'Barclays Center, Brooklyn', null, null,
     'Title eliminator. Camp opens Monday.');

  -- Diego Vargas: 8-2-1 (5 KO)
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes
  ) values
    (v_trainer_id, v_pro_ids[2], 'Eli Pratchett', v_now - interval '3 months',
     'Pechanga Arena, San Diego', 'win', 'TKO', 'Corner stopped it round 7.'),
    (v_trainer_id, v_pro_ids[2], 'Marcus Tate', v_now - interval '8 months',
     'Hard Rock, Atlantic City', 'draw', 'MD',
     'Closer than we wanted. Lots to clean up.'),
    (v_trainer_id, v_pro_ids[2], 'Damian Cole', v_now - interval '12 months',
     'The Forum, LA', 'win', 'UD', 'Boxed beautifully.'),
    (v_trainer_id, v_pro_ids[2], 'Kenta Sato', v_now - interval '16 months',
     'Saitama Super Arena, Tokyo', 'loss', 'KO',
     'Caught with a counter. Back in the gym next morning.'),
    (v_trainer_id, v_pro_ids[2], 'Ariel Banzon', v_now + interval '12 weeks',
     'Resorts World, Vegas', null, null,
     '10-rounder. Headlining undercard.');

  -- ── Fight history for amateurs — younger records ─────────────────────
  -- Jasmine Cole: 5-1-0 (2 KO)
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes
  ) values
    (v_trainer_id, v_amateur_ids[1], 'Sara Pavlos', v_now - interval '1 month',
     'NY Athletic Club', 'win', 'UD', 'Dominant amateur showing.'),
    (v_trainer_id, v_amateur_ids[1], 'Lila Henderson', v_now - interval '4 months',
     'Brooklyn USA Boxing', 'win', 'KO', 'Stopped her in 2.'),
    (v_trainer_id, v_amateur_ids[1], 'Joyce Vatti', v_now - interval '7 months',
     'Bronx PAL', 'loss', 'SD', 'Tough split.');

  -- Tariq Bell: 7-2-0 (3 KO)
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes
  ) values
    (v_trainer_id, v_amateur_ids[2], 'Marcus Webb', v_now - interval '2 months',
     'Mendez Boxing Gym', 'win', 'UD', 'Outclassed him.'),
    (v_trainer_id, v_amateur_ids[2], 'Devon Reese', v_now - interval '5 months',
     'Yonkers Athletic Club', 'win', 'TKO', 'Body work paid off.'),
    (v_trainer_id, v_amateur_ids[2], 'Quintin Walsh', v_now + interval '3 weeks',
     'Brooklyn USA Boxing', null, null, 'Smoker night.');

  -- Mila Petrov: 3-1-1 (1 KO)
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes
  ) values
    (v_trainer_id, v_amateur_ids[3], 'Aiyana Cruz', v_now - interval '6 weeks',
     'Coney Island PAL', 'win', 'UD', 'Footwork was sharp.'),
    (v_trainer_id, v_amateur_ids[3], 'Sasha Park', v_now - interval '4 months',
     'NY Boxing Day', 'draw', 'MD', 'Even cards.');

  -- Andre Kim: 1-0-0 (0 KO) — newer
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes
  ) values
    (v_trainer_id, v_amateur_ids[4], 'Felix Wallace', v_now - interval '2 weeks',
     'Brooklyn USA Boxing', 'win', 'UD', 'Smart, controlled performance.');

  -- ── Payments — 1-2 per fighter, recent ──────────────────────────────
  foreach v_cid in array v_fighter_ids loop
    insert into public.payments (
      trainer_id, client_id, amount, currency, payment_type, method, paid_at, description
    ) values
      (v_trainer_id, v_cid,
       round((random() * 80 + 130)::numeric, 2),
       'USD', 'subscription',
       (array['cash','venmo','zelle','stripe'])[1 + floor(random() * 4)::int],
       v_now - (random() * interval '20 days'),
       'Monthly dues'),
      (v_trainer_id, v_cid,
       round((random() * 80 + 130)::numeric, 2),
       'USD', 'subscription',
       (array['cash','venmo','zelle','stripe'])[1 + floor(random() * 4)::int],
       v_now - interval '1 month' - (random() * interval '10 days'),
       'Monthly dues');
  end loop;

  -- ── Recent training sessions (rounds logs) for a few fighters ───────
  foreach v_cid in array v_fighter_ids[1:4] loop
    insert into public.sessions (
      trainer_id, client_id, starts_at, ends_at, status, session_type, notes
    ) values
      (v_trainer_id, v_cid,
       date_trunc('day', v_now) + interval '17 hours',
       date_trunc('day', v_now) + interval '18 hours',
       'completed', 'Boxing training (12R)',
       '5R mitts · 4R bag · 3R conditioning');
  end loop;

  select count(*) into v_count
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags);

  return 'Seeded ' || v_count
    || ' fighters across Rec/Amateur/Pro, ~30 fight rows '
    || '(past + upcoming), ~20 payments, and recent training sessions. '
    || 'Reload your gym.';
end;
$$;
