-- Boxing gym seed — 10 fighters across the Rec / Amateur / Pro pipeline,
-- with full tale-of-the-tape (height, reach, current body weight, date
-- of birth → age) and realistic W-L-D fight histories. Opponents on
-- past + upcoming fights also carry their own tape so the FightPoster
-- comparison row lights up.
--
-- USAGE:
--   1. Run 29_boxing_fights.sql first.
--   2. Run 31_boxing_fight_tape.sql to add opponent-tape columns.
--   3. Run this file (creates the seed function).
--   4. Then call: select public.boxing_seed_for_trainer('your-email@example.com');
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

  -- Pro tier — physical stats: height/reach in inches, current body weight
  -- in lb so the on-weight indicator + tale of the tape both populate.
  insert into public.clients (
    trainer_id, full_name, email, status, tags, date_of_birth, goals
  ) values
    (v_trainer_id, 'Reign Marshall', 'reign.m@example.com', 'active',
     array['tier:pro', 'weight:welterweight', 'stance:orthodox',
           'height:71', 'reach:74', 'weightlb:151', 'seed:boxing'],
     (v_now - interval '28 years')::date,
     'Title shot by year-end. On weight, sharp.'),
    (v_trainer_id, 'Diego Vargas', 'diego.v@example.com', 'active',
     array['tier:pro', 'weight:lightweight', 'stance:southpaw',
           'height:67', 'reach:70', 'weightlb:144', 'seed:boxing'],
     (v_now - interval '31 years')::date,
     '10-rounder in spring. 3 lb to cut in camp.');

  select array_agg(id) into v_pro_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      and 'tier:pro' = any(tags);

  -- Amateur tier
  insert into public.clients (
    trainer_id, full_name, email, status, tags, date_of_birth, goals
  ) values
    (v_trainer_id, 'Jasmine Cole', 'jasmine.c@example.com', 'active',
     array['tier:amateur', 'weight:flyweight', 'stance:orthodox',
           'height:62', 'reach:64', 'weightlb:118', 'seed:boxing'],
     (v_now - interval '22 years')::date,
     'Regional Golden Gloves run. On weight.'),
    (v_trainer_id, 'Tariq Bell', 'tariq.b@example.com', 'active',
     array['tier:amateur', 'weight:middleweight', 'stance:orthodox',
           'height:70', 'reach:73', 'weightlb:166', 'seed:boxing'],
     (v_now - interval '24 years')::date,
     'Building amateur record. 1 lb over.'),
    (v_trainer_id, 'Mila Petrov', 'mila.p@example.com', 'active',
     array['tier:amateur', 'weight:bantamweight', 'stance:southpaw',
           'height:63', 'reach:65', 'weightlb:124', 'seed:boxing'],
     (v_now - interval '20 years')::date,
     'Sparring 6R Tues + Thurs.'),
    (v_trainer_id, 'Andre Kim', 'andre.k@example.com', 'active',
     array['tier:amateur', 'weight:featherweight', 'stance:orthodox',
           'height:66', 'reach:67', 'weightlb:131', 'seed:boxing'],
     (v_now - interval '19 years')::date,
     'First smoker coming up.');

  select array_agg(id) into v_amateur_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags)
      and 'tier:amateur' = any(tags);

  -- Recreational tier
  insert into public.clients (
    trainer_id, full_name, email, status, tags, date_of_birth, goals
  ) values
    (v_trainer_id, 'Hannah Brooks', 'hannah.b@example.com', 'active',
     array['tier:rec', 'weight:lightweight', 'stance:orthodox',
           'height:65', 'weightlb:140', 'seed:boxing'],
     (v_now - interval '35 years')::date,
     'Bag work, conditioning. No sparring yet.'),
    (v_trainer_id, 'Sam Holloway', 'sam.h@example.com', 'active',
     array['tier:rec', 'weight:middleweight', 'stance:orthodox',
           'height:72', 'weightlb:172', 'seed:boxing'],
     (v_now - interval '41 years')::date,
     'Wants to spar eventually. Solid on mitts.'),
    (v_trainer_id, 'Beatriz Cruz', 'bea.c@example.com', 'active',
     array['tier:rec', 'weight:featherweight', 'stance:southpaw',
           'height:64', 'weightlb:133', 'seed:boxing'],
     (v_now - interval '29 years')::date,
     'Lost 20 lb. Wants 20 more.'),
    (v_trainer_id, 'Wesley Ng', 'wesley.n@example.com', 'active',
     array['tier:rec', 'weight:welterweight', 'stance:orthodox',
           'height:69', 'weightlb:155', 'seed:boxing'],
     (v_now - interval '33 years')::date,
     'Stress relief 3x/week.');

  select array_agg(id) into v_fighter_ids
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags);

  -- Pro #1 — Reign Marshall: 5W-1L-0D (4 KO) with upcoming title eliminator
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes,
    opponent_record, opponent_height_in, opponent_reach_in, opponent_age, opponent_stance
  ) values
    (v_trainer_id, v_pro_ids[1], 'Marco Reyes', v_now - interval '2 months',
     'Barclays Center, Brooklyn', 'win', 'KO', 'Left hook in round 4.',
     '14-3-1 (9 KO)', 70, 72, 30, 'orthodox'),
    (v_trainer_id, v_pro_ids[1], 'Anthony Stark', v_now - interval '6 months',
     'MGM Grand, Las Vegas', 'win', 'UD', '119-109 cards.',
     '11-4-0 (5 KO)', 69, 71, 29, 'southpaw'),
    (v_trainer_id, v_pro_ids[1], 'Hector Velazquez', v_now - interval '10 months',
     'Madison Square Garden', 'win', 'TKO', 'Stoppage round 6.',
     '8-2-0 (4 KO)', 71, 73, 27, 'orthodox'),
    (v_trainer_id, v_pro_ids[1], 'Kwame Johnson', v_now - interval '14 months',
     'StubHub Center, LA', 'win', 'UD', 'Clean win.',
     '7-1-0 (3 KO)', 70, 72, 26, 'orthodox'),
    (v_trainer_id, v_pro_ids[1], 'Tyler West', v_now - interval '18 months',
     'Wynn, Vegas', 'loss', 'SD', 'Tough split.',
     '12-0-1 (7 KO)', 72, 75, 31, 'orthodox'),
    (v_trainer_id, v_pro_ids[1], 'Jorge Aguilar', v_now - interval '22 months',
     'T-Mobile Arena', 'win', 'KO', 'Body shot in 3.',
     '4-0-0 (3 KO)', 68, 69, 25, 'orthodox'),
    (v_trainer_id, v_pro_ids[1], 'Brandon Ortega', v_now + interval '8 weeks',
     'Barclays Center, Brooklyn', null, null, 'Title eliminator. Camp opens Monday.',
     '18-1-0 (12 KO)', 72, 75, 29, 'orthodox');

  -- Pro #2 — Diego Vargas: 2W-1L-1D
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes,
    opponent_record, opponent_height_in, opponent_reach_in, opponent_age, opponent_stance
  ) values
    (v_trainer_id, v_pro_ids[2], 'Eli Pratchett', v_now - interval '3 months',
     'Pechanga Arena, San Diego', 'win', 'TKO', 'Corner stopped it round 7.',
     '15-5-0 (8 KO)', 68, 70, 32, 'orthodox'),
    (v_trainer_id, v_pro_ids[2], 'Marcus Tate', v_now - interval '8 months',
     'Hard Rock, Atlantic City', 'draw', 'MD', 'Closer than we wanted.',
     '10-2-1 (4 KO)', 67, 69, 30, 'southpaw'),
    (v_trainer_id, v_pro_ids[2], 'Damian Cole', v_now - interval '12 months',
     'The Forum, LA', 'win', 'UD', 'Boxed beautifully.',
     '8-3-0 (2 KO)', 66, 68, 28, 'orthodox'),
    (v_trainer_id, v_pro_ids[2], 'Kenta Sato', v_now - interval '16 months',
     'Saitama Super Arena, Tokyo', 'loss', 'KO', 'Caught with a counter.',
     '20-2-0 (15 KO)', 70, 71, 31, 'orthodox'),
    (v_trainer_id, v_pro_ids[2], 'Ariel Banzon', v_now + interval '12 weeks',
     'Resorts World, Vegas', null, null, '10-rounder. Headlining undercard.',
     '12-2-0 (6 KO)', 68, 70, 28, 'orthodox');

  -- Amateur fights
  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes,
    opponent_record, opponent_height_in, opponent_reach_in, opponent_age, opponent_stance
  ) values
    (v_trainer_id, v_amateur_ids[1], 'Sara Pavlos', v_now - interval '1 month',
     'NY Athletic Club', 'win', 'UD', 'Dominant.',
     '3-2-0', 61, 63, 21, 'orthodox'),
    (v_trainer_id, v_amateur_ids[1], 'Lila Henderson', v_now - interval '4 months',
     'Brooklyn USA Boxing', 'win', 'KO', 'Stopped her in 2.',
     '2-1-0', 62, 63, 22, 'southpaw'),
    (v_trainer_id, v_amateur_ids[1], 'Joyce Vatti', v_now - interval '7 months',
     'Bronx PAL', 'loss', 'SD', 'Tough split.',
     '5-0-0', 63, 65, 23, 'orthodox');

  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes,
    opponent_record, opponent_height_in, opponent_reach_in, opponent_age, opponent_stance
  ) values
    (v_trainer_id, v_amateur_ids[2], 'Marcus Webb', v_now - interval '2 months',
     'Mendez Boxing Gym', 'win', 'UD', 'Outclassed him.',
     '4-3-0', 69, 71, 25, 'orthodox'),
    (v_trainer_id, v_amateur_ids[2], 'Devon Reese', v_now - interval '5 months',
     'Yonkers Athletic Club', 'win', 'TKO', 'Body work paid off.',
     '3-2-0', 71, 72, 26, 'southpaw'),
    (v_trainer_id, v_amateur_ids[2], 'Quintin Walsh', v_now + interval '3 weeks',
     'Brooklyn USA Boxing', null, null, 'Smoker night.',
     '5-1-0', 70, 71, 23, 'orthodox');

  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes,
    opponent_record, opponent_height_in, opponent_reach_in, opponent_age, opponent_stance
  ) values
    (v_trainer_id, v_amateur_ids[3], 'Aiyana Cruz', v_now - interval '6 weeks',
     'Coney Island PAL', 'win', 'UD', 'Footwork was sharp.',
     '2-3-0', 62, 63, 19, 'orthodox'),
    (v_trainer_id, v_amateur_ids[3], 'Sasha Park', v_now - interval '4 months',
     'NY Boxing Day', 'draw', 'MD', 'Even cards.',
     '3-2-1', 64, 65, 21, 'southpaw');

  insert into public.boxing_fights (
    trainer_id, fighter_id, opponent_name, starts_at, venue, result, decision, notes,
    opponent_record, opponent_height_in, opponent_reach_in, opponent_age, opponent_stance
  ) values
    (v_trainer_id, v_amateur_ids[4], 'Felix Wallace', v_now - interval '2 weeks',
     'Brooklyn USA Boxing', 'win', 'UD', 'Smart, controlled performance.',
     '1-2-0', 67, 68, 19, 'orthodox');

  -- Payments
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

  -- Recent training so the heatmap + recent-results panel light up
  foreach v_cid in array v_fighter_ids[1:6] loop
    insert into public.sessions (
      trainer_id, client_id, starts_at, ends_at, status, session_type, notes
    ) values
      (v_trainer_id, v_cid,
       date_trunc('day', v_now) + interval '17 hours',
       date_trunc('day', v_now) + interval '18 hours',
       'completed', 'Boxing training (12R)',
       '5R mitts · 4R bag · 3R conditioning');
  end loop;

  -- One fighter who's been off the mat — drives the inactive callout
  -- (no sessions logged for Wesley Ng so he'll show up under "Off the mat")

  select count(*) into v_count
    from public.clients
    where trainer_id = v_trainer_id and 'seed:boxing' = any(tags);

  return 'Seeded ' || v_count
    || ' fighters with full tale-of-the-tape, ~30 fight rows '
    || '(past + upcoming with opponent stats), ~20 payments, training sessions. '
    || 'Reload your gym.';
end;
$$;
