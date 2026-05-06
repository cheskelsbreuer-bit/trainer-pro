-- ============================================================================
-- TRAINER PRO — Demo Data Seed
-- ============================================================================
-- Populates the database with 8 fake clients, ~25 sessions across recent and
-- upcoming weeks, ~10 payments, and a handful of progress entries.
--
-- Idempotent: identifies demo rows by emails ending in '@trainerpro.demo'.
-- Re-running wipes those rows and recreates them. Use as a "reset" button.
--
-- Prereq: at least one trainer must exist. Sign up first, then run this.
-- ============================================================================

do $$
declare
  t_id uuid;
  c_sarah uuid; c_marcus uuid; c_priya uuid; c_james uuid;
  c_elena uuid; c_david uuid; c_lisa uuid; c_rachel uuid;
  today date := current_date;
begin
  -- 1. Find the trainer ----------------------------------------------------
  select id into t_id from public.trainers order by created_at limit 1;
  if t_id is null then
    raise exception 'No trainer row found. Sign up via the app first, then re-run this seed.';
  end if;

  -- 2. Wipe any prior demo rows -------------------------------------------
  -- Cascades from clients delete most things; payments are orphan-resistant
  -- because they reference clients with on delete cascade.
  delete from public.clients where trainer_id = t_id and email like '%@trainerpro.demo';

  -- 3. Clients -------------------------------------------------------------
  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'Sarah Mitchell', 'sarah@trainerpro.demo', '555-0101', '1992-03-14',
     'Train for first marathon — October 2026',
     null,
     'Tom Mitchell (husband) — 555-0151',
     'active', array['morning','marathon-prep','demo'], 95.00, 8,
     'Prefers Tue/Thu 6am. No coffee before workouts.')
  returning id into c_sarah;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'Marcus Chen', 'marcus@trainerpro.demo', '555-0102', '1988-07-22',
     'Squat 405, deadlift 500, bench 315 by end of year',
     'Mild left shoulder impingement — avoid overhead press above 135 lbs',
     'Jenny Chen (wife) — 555-0152',
     'active', array['evening','strength','demo'], 110.00, 4,
     'Lifts heavy. Loves form coaching.')
  returning id into c_marcus;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'Priya Patel', 'priya@trainerpro.demo', '555-0103', '1995-11-08',
     'Lose 25 lbs and run a 5K under 30 minutes',
     null,
     'Anita Patel (sister) — 555-0153',
     'active', array['weight-loss','high-priority','demo'], 80.00, 0,
     'Pays per session in cash. Coming twice a week.')
  returning id into c_priya;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'James O''Connor', 'james@trainerpro.demo', '555-0104', '1980-02-19',
     'Stay healthy, manage back pain, build core strength',
     'L4-L5 disc bulge. Cleared by orthopedist for lifting under 60% 1RM.',
     'Mary O''Connor (wife) — 555-0154',
     'active', array['lunch','post-rehab','demo'], 90.00, 12,
     'Bought a 12-pack last week. Loves Romanian deadlifts.')
  returning id into c_james;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'Elena Volkov', 'elena@trainerpro.demo', '555-0105', '1990-09-30',
     'Get back into shape after vacation',
     null,
     'Dimitri Volkov (brother) — 555-0155',
     'paused', array['evening','demo'], 95.00, 6,
     'On vacation until late May. Resuming June 1.')
  returning id into c_elena;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'David Thompson', 'david@trainerpro.demo', '555-0106', '1985-04-12',
     'Compete in masters powerlifting — meet in August 2026',
     null,
     'Karen Thompson (wife) — 555-0156',
     'active', array['weekend','strength','demo'], 120.00, 10,
     'Just bought a 10-pack. Meet on August 22.')
  returning id into c_david;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'Lisa Wang', 'lisa@trainerpro.demo', '555-0107', '1998-12-03',
     'Recover from ACL repair, return to club volleyball by fall',
     'ACL reconstructed Feb 2026. Cleared by PT for resistance training, no jumping yet.',
     'Helen Wang (mother) — 555-0157',
     'active', array['morning','post-rehab','new-client','demo'], 100.00, 5,
     'Ortho follow-up monthly. Send progress notes after sessions.')
  returning id into c_lisa;

  insert into public.clients
    (trainer_id, full_name, email, phone, date_of_birth, goals, medical_notes,
     emergency_contact, status, tags, rate_per_session, package_balance, notes)
  values
    (t_id, 'Rachel Goldberg', 'rachel@trainerpro.demo', '555-0108', '1986-06-21',
     'Maintain fitness during pregnancy',
     'Currently 22 weeks pregnant. Modify all exercises accordingly.',
     'Ben Goldberg (husband) — 555-0158',
     'archived', array['demo'], 90.00, 0,
     'Moved out of state January 2026. Archived but kept for records.')
  returning id into c_rachel;

  -- 4. Sessions — past 2 weeks (mostly completed, a no-show, a cancellation)
  insert into public.sessions (trainer_id, client_id, starts_at, ends_at, status, session_type, location, notes, price, paid) values
    (t_id, c_sarah,  (today - 15) + time '06:00', (today - 15) + time '07:00', 'completed', 'training', 'Studio',  '5-mile tempo run; felt strong',     95.00, true),
    (t_id, c_sarah,  (today - 13) + time '06:00', (today - 13) + time '07:00', 'completed', 'training', 'Studio',  'Strength + hip mobility',           95.00, true),
    (t_id, c_sarah,  (today - 11) + time '06:00', (today - 11) + time '07:00', 'completed', 'training', 'Park',    'Hill repeats; nailed last 2',       95.00, true),
    (t_id, c_sarah,  (today - 8)  + time '06:00', (today - 8)  + time '07:00', 'completed', 'training', 'Studio',  'Lower body strength',               95.00, true),
    (t_id, c_sarah,  (today - 6)  + time '06:00', (today - 6)  + time '07:00', 'completed', 'training', 'Park',    '8-mile long run; HR steady',         95.00, true),
    (t_id, c_sarah,  (today - 4)  + time '06:00', (today - 4)  + time '07:00', 'completed', 'training', 'Studio',  'Recovery + foam rolling',           95.00, true),

    (t_id, c_marcus, (today - 14) + time '18:00', (today - 14) + time '19:00', 'cancelled', 'training', 'Studio',  'Cancelled — work conflict',         null,   false),
    (t_id, c_marcus, (today - 12) + time '18:00', (today - 12) + time '19:00', 'completed', 'training', 'Studio',  'Squat 365x3, felt heavy',          110.00, true),
    (t_id, c_marcus, (today - 7)  + time '18:00', (today - 7)  + time '19:00', 'completed', 'training', 'Studio',  'Deadlift session — 455x1 PR',      110.00, true),
    (t_id, c_marcus, (today - 5)  + time '18:00', (today - 5)  + time '19:00', 'completed', 'training', 'Studio',  'Bench + accessories',              110.00, true),

    (t_id, c_priya,  (today - 15) + time '17:00', (today - 15) + time '18:00', 'no_show',   'training', 'Studio',  'No call no show. Followed up.',    null,   false),
    (t_id, c_priya,  (today - 13) + time '17:00', (today - 13) + time '18:00', 'completed', 'training', 'Studio',  'Full body circuit; 30 min cardio',  80.00, true),
    (t_id, c_priya,  (today - 8)  + time '17:00', (today - 8)  + time '18:00', 'completed', 'training', 'Studio',  'Lower body + treadmill intervals',  80.00, true),
    (t_id, c_priya,  (today - 6)  + time '17:00', (today - 6)  + time '18:00', 'completed', 'training', 'Studio',  'Upper body push; weight down 1.5#', 80.00, true),
    (t_id, c_priya,  (today - 1)  + time '17:00', (today - 1)  + time '18:00', 'completed', 'training', 'Studio',  'Core + cardio',                     80.00, true),

    (t_id, c_james,  (today - 13) + time '12:30', (today - 13) + time '13:30', 'completed', 'training', 'Studio',  'Core + Romanian deadlifts (light)', 90.00, true),
    (t_id, c_james,  (today - 6)  + time '12:30', (today - 6)  + time '13:30', 'completed', 'training', 'Studio',  'Mobility + light squats',           90.00, true),

    (t_id, c_david,  (today - 10) + time '09:00', (today - 10) + time '10:00', 'completed', 'training', 'Studio',  'Squat day — 405x3 working set',    120.00, true),
    (t_id, c_david,  (today - 3)  + time '09:00', (today - 3)  + time '10:00', 'completed', 'training', 'Studio',  'Deadlift day — 495x2',             120.00, true),

    (t_id, c_lisa,   (today - 7)  + time '07:00', (today - 7)  + time '08:00', 'completed', 'training', 'Studio',  'Quad strengthening; no impact',    100.00, true);

  -- 5. Sessions — next 2 weeks (all scheduled, mix of confirmed) ---------
  insert into public.sessions (trainer_id, client_id, starts_at, ends_at, status, session_type, location) values
    (t_id, c_sarah,  today + time '06:00',         today + time '07:00',         'confirmed', 'training', 'Studio'),
    (t_id, c_sarah,  (today + 2) + time '06:00',   (today + 2) + time '07:00',   'scheduled', 'training', 'Park'),
    (t_id, c_sarah,  (today + 7) + time '06:00',   (today + 7) + time '07:00',   'scheduled', 'training', 'Studio'),
    (t_id, c_sarah,  (today + 9) + time '06:00',   (today + 9) + time '07:00',   'scheduled', 'training', 'Studio'),

    (t_id, c_marcus, today + time '18:00',         today + time '19:00',         'confirmed', 'training', 'Studio'),
    (t_id, c_marcus, (today + 2) + time '18:00',   (today + 2) + time '19:00',   'scheduled', 'training', 'Studio'),
    (t_id, c_marcus, (today + 7) + time '18:00',   (today + 7) + time '19:00',   'scheduled', 'training', 'Studio'),

    (t_id, c_priya,  (today + 1) + time '17:00',   (today + 1) + time '18:00',   'confirmed', 'training', 'Studio'),
    (t_id, c_priya,  (today + 5) + time '17:00',   (today + 5) + time '18:00',   'scheduled', 'training', 'Studio'),
    (t_id, c_priya,  (today + 7) + time '17:00',   (today + 7) + time '18:00',   'scheduled', 'training', 'Studio'),

    (t_id, c_james,  (today + 1) + time '12:30',   (today + 1) + time '13:30',   'scheduled', 'training', 'Studio'),
    (t_id, c_james,  (today + 8) + time '12:30',   (today + 8) + time '13:30',   'scheduled', 'training', 'Studio'),

    (t_id, c_david,  (today + 3) + time '09:00',   (today + 3) + time '10:00',   'confirmed', 'training', 'Studio'),
    (t_id, c_david,  (today + 10) + time '09:00',  (today + 10) + time '10:00',  'scheduled', 'training', 'Studio'),

    (t_id, c_lisa,   today + time '07:00',         today + time '08:00',         'scheduled', 'assessment', 'Studio'),
    (t_id, c_lisa,   (today + 8) + time '07:00',   (today + 8) + time '08:00',   'scheduled', 'training', 'Studio');

  -- 6. Payments ------------------------------------------------------------
  insert into public.payments (trainer_id, client_id, amount, payment_type, sessions_covered, description, method, paid_at) values
    (t_id, c_sarah,  95.00,  'session',  1,  'Session payment',                    'venmo',   today - 13),
    (t_id, c_sarah,  95.00,  'session',  1,  'Session payment',                    'venmo',   today - 11),
    (t_id, c_sarah,  95.00,  'session',  1,  'Session payment',                    'venmo',   today - 8),
    (t_id, c_sarah,  95.00,  'session',  1,  'Session payment',                    'venmo',   today - 6),
    (t_id, c_marcus, 440.00, 'package',  4,  '4-session package',                  'zelle',   today - 18),
    (t_id, c_priya,  80.00,  'session',  1,  'Session payment',                    'cash',    today - 13),
    (t_id, c_priya,  80.00,  'session',  1,  'Session payment',                    'cash',    today - 8),
    (t_id, c_priya,  80.00,  'session',  1,  'Session payment',                    'cash',    today - 6),
    (t_id, c_priya,  80.00,  'session',  1,  'Session payment',                    'cash',    today - 1),
    (t_id, c_james,  1080.00,'package',  12, '12-session package — back rehab',    'stripe',  today - 14),
    (t_id, c_david,  1200.00,'package',  10, '10-session package — meet prep',     'stripe',  today - 5),
    (t_id, c_lisa,   500.00, 'package',  5,  '5-session package — ACL recovery',   'zelle',   today - 8),
    (t_id, c_elena,  570.00, 'package',  6,  '6-session package — pre-vacation',   'zelle',   today - 25);

  -- 7. Progress entries ----------------------------------------------------
  insert into public.progress_entries (trainer_id, client_id, metric_type, metric_value, metric_unit, measured_at, notes) values
    (t_id, c_priya, 'weight', 168.5, 'lbs', today - 25, 'Starting weight'),
    (t_id, c_priya, 'weight', 166.2, 'lbs', today - 18, null),
    (t_id, c_priya, 'weight', 164.8, 'lbs', today - 11, null),
    (t_id, c_priya, 'weight', 163.4, 'lbs', today - 4,  'Down 5.1 lbs in 3 weeks'),
    (t_id, c_marcus, 'pr_squat',    365, 'lbs', today - 12, '3 reps at 365'),
    (t_id, c_marcus, 'pr_deadlift', 455, 'lbs', today - 7,  'PR! Single, clean lockout'),
    (t_id, c_david,  'pr_squat',    405, 'lbs', today - 10, 'Working set 3x405'),
    (t_id, c_david,  'pr_deadlift', 495, 'lbs', today - 3,  'Working double at 495');

  raise notice 'Demo seed complete. 8 clients, 21 past + 16 upcoming sessions, 13 payments, 8 progress entries.';
end $$;
