-- ============================================================================
-- TRAINER PRO — Starter exercise library (global)
-- ============================================================================
-- ~50 commonly-used exercises across strength, cardio, mobility, plyo, and
-- core. trainer_id and studio_id are null, so every trainer sees these via
-- the exercises_select RLS policy.
--
-- Idempotent: dedupes by name where trainer_id is null.
-- ============================================================================

-- Wipe any prior global seeds to keep this exact list
delete from public.exercises
  where trainer_id is null and studio_id is null
    and name in (
      -- list also at end of this file for clarity
      'Back Squat','Front Squat','Goblet Squat','Bulgarian Split Squat','Walking Lunge',
      'Romanian Deadlift','Conventional Deadlift','Trap-Bar Deadlift','Hip Thrust','Glute Bridge',
      'Leg Press','Leg Extension','Leg Curl','Calf Raise',
      'Bench Press','Incline Bench Press','Dumbbell Bench Press','Push-Up','Dips',
      'Overhead Press','Dumbbell Shoulder Press','Lateral Raise','Face Pull',
      'Pull-Up','Chin-Up','Lat Pulldown','Bent-Over Row','Seated Cable Row','Single-Arm DB Row',
      'Bicep Curl','Hammer Curl','Tricep Pushdown','Skull Crusher',
      'Plank','Side Plank','Hanging Leg Raise','Cable Crunch','Pallof Press','Dead Bug',
      'Box Jump','Broad Jump','Kettlebell Swing','Burpee',
      'Jump Rope','Treadmill Run','Stationary Bike','Rowing Machine','Stair Climber',
      'Cat-Cow','World''s Greatest Stretch','Foam Roll Quads','Foam Roll IT Band',
      'Banded Hip Opener','90/90 Hip Stretch'
    );

insert into public.exercises (name, category, primary_muscle, equipment, default_sets, default_reps, default_rest_sec, description) values
-- Lower body strength
('Back Squat',           'strength', 'quads',       'barbell',   3, '5-8',   180, 'Bar across upper traps, brace, descend until hips below knees, drive up.'),
('Front Squat',          'strength', 'quads',       'barbell',   3, '5-8',   150, 'Elbows high, bar on front delts, upright torso, full depth.'),
('Goblet Squat',         'strength', 'quads',       'dumbbell',  3, '8-12',   90, 'Hold a DB at chest, sit between heels, knees track over toes.'),
('Bulgarian Split Squat','strength', 'quads',       'dumbbell',  3, '8-10 ea', 90, 'Rear foot elevated, drop straight down, drive through front heel.'),
('Walking Lunge',        'strength', 'quads',       'dumbbell',  3, '10 ea',   90, 'Long step, back knee taps just above ground, stand and switch.'),
('Romanian Deadlift',    'strength', 'hamstrings',  'barbell',   3, '8-10',   120, 'Soft knees, hinge at hips, bar travels close to legs, feel hamstrings.'),
('Conventional Deadlift','strength', 'hamstrings',  'barbell',   3, '3-5',    180, 'Bar over mid-foot, neutral spine, push the floor away.'),
('Trap-Bar Deadlift',    'strength', 'hamstrings',  'barbell',   3, '5-8',    150, 'More quad-driven than conventional; great for athletes.'),
('Hip Thrust',           'strength', 'glutes',      'barbell',   3, '8-12',   120, 'Upper back on bench, drive hips up, squeeze glutes at top.'),
('Glute Bridge',         'strength', 'glutes',      'bodyweight',3, '12-15',   60, 'Bodyweight version of hip thrust; good warmup or for beginners.'),
('Leg Press',            'strength', 'quads',       'machine',   3, '10-12',  120, 'Feet shoulder-width, full range, do not lock out at top.'),
('Leg Extension',        'strength', 'quads',       'machine',   3, '12-15',   60, 'Isolation for quads; squeeze hard at top.'),
('Leg Curl',             'strength', 'hamstrings',  'machine',   3, '10-12',   60, 'Lying or seated; control eccentric.'),
('Calf Raise',           'strength', 'calves',      'machine',   3, '12-15',   45, 'Full stretch at bottom, full contraction at top.'),

-- Upper body push
('Bench Press',          'strength', 'chest',       'barbell',   3, '5-8',    150, 'Retracted scapulae, slight arch, bar to lower chest, drive feet.'),
('Incline Bench Press',  'strength', 'chest',       'barbell',   3, '6-10',   120, '30-45 degree bench, focuses upper pecs.'),
('Dumbbell Bench Press', 'strength', 'chest',       'dumbbell',  3, '8-12',    90, 'Greater range of motion than barbell; control eccentric.'),
('Push-Up',              'strength', 'chest',       'bodyweight',3, 'AMRAP',   60, 'Plank position, chest to floor, full lockout. Scale on knees if needed.'),
('Dips',                 'strength', 'chest',       'bodyweight',3, '6-12',    90, 'Lean forward for chest, upright for triceps.'),
('Overhead Press',       'strength', 'shoulders',   'barbell',   3, '5-8',    120, 'Bar from front rack, brace, press straight up, finish with shrug.'),
('Dumbbell Shoulder Press','strength','shoulders',  'dumbbell',  3, '8-12',    90, 'Seated or standing; greater stability demand than barbell.'),
('Lateral Raise',        'strength', 'shoulders',   'dumbbell',  3, '12-15',   45, 'Slight bend in elbows, lead with elbows, control on way down.'),
('Face Pull',            'strength', 'shoulders',   'cable',     3, '12-15',   45, 'Rope to face, pull elbows wide and high — great for posture.'),

-- Upper body pull
('Pull-Up',              'strength', 'back',        'bodyweight',3, '5-10',   120, 'Pronated grip, chest to bar, full extension at bottom.'),
('Chin-Up',              'strength', 'back',        'bodyweight',3, '5-10',   120, 'Supinated grip, more biceps involvement than pull-ups.'),
('Lat Pulldown',         'strength', 'back',        'cable',     3, '8-12',    90, 'Drive elbows down and back, squeeze lats at bottom.'),
('Bent-Over Row',        'strength', 'back',        'barbell',   3, '6-10',   120, 'Hinged torso, neutral spine, bar to lower ribs.'),
('Seated Cable Row',     'strength', 'back',        'cable',     3, '10-12',   60, 'Tall posture, drive elbows back, squeeze shoulder blades.'),
('Single-Arm DB Row',    'strength', 'back',        'dumbbell',  3, '8-10 ea', 60, 'Hand and knee on bench, row DB to hip, control eccentric.'),
('Bicep Curl',           'strength', 'arms',        'dumbbell',  3, '10-12',   45, 'Elbows pinned, no swinging, full range of motion.'),
('Hammer Curl',          'strength', 'arms',        'dumbbell',  3, '10-12',   45, 'Neutral grip; targets brachialis.'),
('Tricep Pushdown',      'strength', 'arms',        'cable',     3, '12-15',   45, 'Elbows pinned at sides, squeeze at lockout.'),
('Skull Crusher',        'strength', 'arms',        'barbell',   3, '8-12',    60, 'Lying tricep extension; control on the way down.'),

-- Core
('Plank',                'core',     'core',        'bodyweight',3, '30-60s',  45, 'Straight line head to heels, brace abs and glutes.'),
('Side Plank',           'core',     'core',        'bodyweight',3, '20-45s ea', 45, 'Targets obliques; stack feet, lift hips.'),
('Hanging Leg Raise',    'core',     'core',        'bodyweight',3, '8-12',    60, 'Bar hang, lift legs to 90 degrees with control.'),
('Cable Crunch',         'core',     'core',        'cable',     3, '12-15',   45, 'Kneel facing cable, crunch by curling spine, not pulling rope.'),
('Pallof Press',         'core',     'core',        'cable',     3, '10 ea',   45, 'Anti-rotation; press cable away from chest, resist twisting.'),
('Dead Bug',             'core',     'core',        'bodyweight',3, '10 ea',   45, 'Brace core, opposite arm/leg, low back stays glued to floor.'),

-- Plyometric / power
('Box Jump',             'plyo',     'quads',       'other',     4, '5',       90, 'Land softly with bent knees, step (do not jump) down.'),
('Broad Jump',           'plyo',     'quads',       'bodyweight',4, '3',       90, 'Hinge, swing arms, jump as far as possible, stick the landing.'),
('Kettlebell Swing',     'plyo',     'glutes',      'kettlebell',4, '15',      60, 'Hip-hinge, snap hips at top, KB floats — no shoulder lift.'),
('Burpee',               'plyo',     'core',        'bodyweight',3, '10',      60, 'Squat, kick back to plank, push-up optional, jump up.'),

-- Cardio
('Jump Rope',            'cardio',   'calves',      'other',     1, '30s on / 30s off x 8',  0, 'Light bounce, wrists do the work.'),
('Treadmill Run',        'cardio',   null,          'machine',   1, '20-30 min',              0, 'Steady-state aerobic at conversational pace.'),
('Stationary Bike',      'cardio',   null,          'machine',   1, '20-30 min',              0, 'Low-impact cardio; great for recovery days.'),
('Rowing Machine',       'cardio',   'back',        'machine',   1, '20-30 min',              0, 'Drive with legs, lean back, pull with arms — in that order.'),
('Stair Climber',        'cardio',   'glutes',      'machine',   1, '15-20 min',              0, 'Upright posture; do not lean on rails.'),

-- Mobility
('Cat-Cow',              'mobility', 'core',        'bodyweight',2, '8 reps',   30, 'Slow alternating spine flexion/extension on hands and knees.'),
('World''s Greatest Stretch','mobility','core',     'bodyweight',2, '5 ea',     30, 'Lunge + thoracic rotation + hamstring reach. Whole body in one move.'),
('Foam Roll Quads',      'mobility', 'quads',       'other',     1, '60s ea',   0, 'Slow rolls along front of thigh; pause on tender spots.'),
('Foam Roll IT Band',    'mobility', 'quads',       'other',     1, '60s ea',   0, 'Side of thigh; expect discomfort, breathe through it.'),
('Banded Hip Opener',    'mobility', 'glutes',      'band',      2, '10 ea',    30, 'Mini-band above knees, side-step or clamshells.'),
('90/90 Hip Stretch',    'mobility', 'glutes',      'bodyweight',2, '30s ea',   30, 'One leg in front at 90, one behind at 90; hinge over front leg.');
