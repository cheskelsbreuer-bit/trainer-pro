// Coaching methodologies — the 5 frameworks the app supports.
// The coach picks ONE methodology in Settings; the Habit Library, the
// Add-client practice picker, the home page copy, and the AI chatbot
// system prompt all swap to match.
//
// We support 5:
//   1. pn  — Precision Nutrition (habit-based, 2-week practices, hand portions)
//   2. rp  — Renaissance Periodization / macro-based (weigh food, hit macros)
//   3. ie  — Intuitive Eating (Tribole/Resch's 10 principles, anti-diet)
//   4. iin — Integrative Nutrition (IIN: bio-individuality, primary food)
//   5. custom — coach defines their own habit list
//
// Each methodology defines:
//   - id, label, tagline, philosophy, color
//   - levelLabels — what to call Level 1 / Level 2
//   - skills — categories the practices fall into
//   - practices — the daily habits / principles, tagged by level + skill
//   - usesHandPortions — whether to show the PN hand-portions panel
//   - usesMacros — whether to emphasise macros in the UI
//   - chatbotSystemPrompt — methodology-specific addendum for the AI

export interface MethodologySkill {
  id: string;
  label: string;
  color: string;
  blurb: string;
}

export interface MethodologyPractice {
  id: string;
  label: string;
  blurb: string;
  skillId: string;
  order: number;
  level: 1 | 2;
  rationale: string;
  measure: string;
}

export interface NutritionLevel {
  id: 1 | 2;
  label: string;
  tagline: string;
  blurb: string;
  color: string;
}

export interface Methodology {
  id: 'pn' | 'rp' | 'ie' | 'iin' | 'custom';
  label: string;
  shortLabel: string;
  tagline: string;
  philosophy: string;
  color: string;
  // What to call Level 1 and Level 2 in this methodology's vocabulary
  levels: [NutritionLevel, NutritionLevel];
  skills: MethodologySkill[];
  practices: MethodologyPractice[];
  usesHandPortions: boolean;
  usesMacros: boolean;
  // Headline used on the Home / dashboard (replaces "PN Practice" etc.)
  homeHeadline: string;
  // Vocabulary tweaks
  practiceWord: string; // 'practice' for PN, 'principle' for IE, 'task' for RP
  // Methodology-specific addendum to the chatbot system prompt
  chatbotPersona: string;
}

// ── Level templates used by most methodologies ─────────────────────────
const LEVEL_FOUND: NutritionLevel = {
  id: 1,
  label: 'Level 1 — Foundational Habits',
  tagline: 'Create stability and awareness.',
  blurb:
    'The base layer. Hydration, sleep, slowing down at the table, daily movement, consistency. Every client starts here, no exceptions.',
  color: '#D87456',
};

const LEVEL_BALANCED: NutritionLevel = {
  id: 2,
  label: 'Level 2 — Balanced Eating',
  tagline: 'Building satisfying balanced meals without obsession.',
  blurb:
    'Once Level 1 is automatic, layer in balanced plates, portion awareness, hunger/fullness, and the harder behaviors — emotional eating, nighttime eating, liquid calories — handled without guilt.',
  color: '#6B8E5A',
};

// ── 1. PRECISION NUTRITION ────────────────────────────────────────────
const PN_SKILLS: MethodologySkill[] = [
  { id: 'hunger-awareness', label: 'Hunger & appetite awareness', color: '#D87456',
    blurb: 'Learn to feel real hunger and fullness — the bedrock skill before any rules or macros.' },
  { id: 'food-quality', label: 'Food quality & whole foods', color: '#6B8E5A',
    blurb: 'Tilt the plate toward minimally-processed foods most meals.' },
  { id: 'portions', label: 'Portion awareness (hand portions)', color: '#D9A441',
    blurb: 'Eyeball calorie control without weighing food — palm, fist, cupped hand, thumb.' },
  { id: 'meal-frequency', label: 'Meal frequency & timing', color: '#8B7E6A',
    blurb: 'Eat on a rhythm that suits the client — protein at every meal, smart carbs around training.' },
  { id: 'environment', label: 'Environment & planning', color: '#5BA9D9',
    blurb: 'Make the right choice the easy choice. Meal prep, kitchen setup, grocery routine.' },
  { id: 'recovery', label: 'Recovery — sleep, stress, breath', color: '#A47BB8',
    blurb: 'Sleep, stress, and recovery move the needle as much as food. Often more.' },
  { id: 'mindset', label: 'Mindset & identity', color: '#C25C7A',
    blurb: 'Why over what. Values, identity, all-or-something thinking, self-compassion.' },
];

const PN_PRACTICES: MethodologyPractice[] = [
  // Level 1
  { id: 'eat-slowly', label: 'Eat slowly', blurb: 'Take 15-20 minutes for each meal. Chew well, put the fork down between bites.',
    skillId: 'hunger-awareness', order: 1, level: 1,
    rationale: 'Slowing down lets satiety signals catch up before you overshoot. The single highest-ROI habit in PN.',
    measure: 'yes/no per meal' },
  { id: 'no-screens-meals', label: 'No screens at meals', blurb: 'Eat without phone, TV, or laptop. Plate, table, food. That\'s it.',
    skillId: 'hunger-awareness', order: 2, level: 1,
    rationale: 'Distracted eating dulls satiety cues — people consistently eat 20–50% more in front of a screen.',
    measure: 'yes/no per meal' },
  { id: 'hydration', label: 'Drink water throughout the day', blurb: 'Aim for ~2–3 litres of water daily. Glass on waking, glass before each meal.',
    skillId: 'food-quality', order: 1, level: 1,
    rationale: 'Mild dehydration is misread by the brain as hunger. Most "snack cravings" between meals are thirst in disguise.',
    measure: 'glasses or litres per day' },
  { id: 'protein-each-meal', label: 'Protein with every meal', blurb: '1–2 palm-sized portions of protein at each meal (1 for women, 2 for men).',
    skillId: 'food-quality', order: 2, level: 1,
    rationale: 'Protein is the most satiating macronutrient. Anchors the meal and prevents grazing.',
    measure: 'meals containing protein / total meals' },
  { id: 'meal-rhythm', label: 'Eat on a steady rhythm', blurb: '3 meals at roughly the same times each day. Don\'t skip; don\'t graze in between.',
    skillId: 'meal-frequency', order: 1, level: 1,
    rationale: 'A predictable rhythm regulates hunger hormones and stops the late-day "I haven\'t eaten all day" pattern.',
    measure: 'days following the rhythm / 7' },
  { id: 'meal-prep-3x', label: 'Prep 3 meals each week', blurb: 'Block 60–90 min once a week to cook 3 meals ahead.',
    skillId: 'environment', order: 1, level: 1,
    rationale: 'Eliminates the "what\'s for dinner" decision-fatigue moment that wrecks adherence on busy nights.',
    measure: '# of meals prepped this week' },
  { id: 'grocery-list', label: 'Shop from a list', blurb: 'Write a grocery list before each shop. Stick to it.',
    skillId: 'environment', order: 2, level: 1,
    rationale: 'Decisions get made in the kitchen, not at the checkout. Buy the right things, eat the right things.',
    measure: 'yes/no per shopping trip' },
  { id: 'sleep-7h', label: '7+ hours of sleep', blurb: 'Lights out at the same time most nights. Aim for 7 hours minimum.',
    skillId: 'recovery', order: 1, level: 1,
    rationale: 'Insufficient sleep wrecks hunger hormones and willpower. PN puts sleep on par with food.',
    measure: 'avg hours per night' },
  { id: 'five-breaths', label: '5 deep breaths before eating', blurb: 'Before each meal, take 5 slow breaths. Notice hunger level.',
    skillId: 'recovery', order: 2, level: 1,
    rationale: 'Down-shifts the nervous system into rest-and-digest. Slows the meal automatically.',
    measure: 'yes/no per meal' },
  { id: 'stress-walk', label: '10-min stress walk daily', blurb: 'One 10-minute walk a day, no phone. Mid-day if possible.',
    skillId: 'recovery', order: 3, level: 1,
    rationale: 'Movement + sunlight + non-screen time. Down-regulates stress, supports sleep, breaks workday grind.',
    measure: 'yes/no per day' },
  { id: 'movement-weekly', label: 'Move your body 3–5x a week', blurb: 'A mix of cardio and strength. Anything that gets you breathing harder.',
    skillId: 'recovery', order: 4, level: 1,
    rationale: 'Movement is non-negotiable for body composition, mood, sleep, and metabolic health.',
    measure: 'sessions per week' },
  { id: 'something-not-nothing', label: 'Something is better than nothing', blurb: 'When the perfect plan falls apart, do the something-version. Always.',
    skillId: 'mindset', order: 1, level: 1,
    rationale: 'PN\'s antidote to all-or-nothing thinking. Consistency, not intensity, wins.',
    measure: 'yes/no per day' },
  // Level 2
  { id: 'eat-to-80', label: 'Eat to 80% full', blurb: 'Stop at "satisfied," not "stuffed." Leave the table able to take a brisk walk.',
    skillId: 'hunger-awareness', order: 3, level: 2,
    rationale: 'Builds the appetite-awareness skill. Pairs naturally with "eat slowly" once that one is automatic.',
    measure: '1–10 fullness rating per meal' },
  { id: 'nighttime-cutoff', label: 'Stop eating after dinner', blurb: 'Close the kitchen 2–3 hours before bed. Tea, water, brushed teeth — done for the day.',
    skillId: 'hunger-awareness', order: 4, level: 2,
    rationale: 'Nighttime eating is rarely about hunger — it\'s usually decompression, boredom, or screen-time grazing.',
    measure: 'nights with kitchen closed / 7' },
  { id: 'veggies-each-meal', label: 'Veggies with every meal', blurb: '1–2 fist-sized portions of vegetables at each meal — fibre that keeps you full.',
    skillId: 'food-quality', order: 3, level: 2,
    rationale: 'Volume, fibre, micronutrients. Crowds out less helpful foods without restriction.',
    measure: 'meals containing veggies / total meals' },
  { id: 'balanced-plate', label: 'Build a balanced plate', blurb: 'Every meal: a palm of protein + a fist of veggies + a thumb of healthy fat + (optional) a cupped hand of carbs.',
    skillId: 'food-quality', order: 4, level: 2,
    rationale: 'Protein + fibre + fat together is the most satisfying combination in food science.',
    measure: 'meals built balanced / total meals' },
  { id: 'liquid-calories', label: 'Cut liquid calories', blurb: 'Stop drinking your calories. Coffee creamer, juice, soda, fancy lattes, alcohol.',
    skillId: 'food-quality', order: 5, level: 2,
    rationale: 'Liquid calories don\'t register as fullness — the easiest hidden source of overeating.',
    measure: 'days with no liquid calories / 7' },
  { id: 'volume-eating', label: 'Lean on low-calorie-density foods', blurb: 'Build meals around foods that are big in volume, small in calories — vegetables, broths, salads, fruit, lean proteins.',
    skillId: 'food-quality', order: 6, level: 2,
    rationale: 'Calorie density is the hidden lever in fat loss. Same calories, more volume = staying full on less.',
    measure: 'meals built around volume foods / total meals' },
  { id: 'whole-foods-most', label: 'Whole foods most of the time', blurb: 'Aim for ~80% of meals built around minimally-processed foods.',
    skillId: 'food-quality', order: 7, level: 2,
    rationale: 'PN\'s "80/20" principle — 80% whole foods, 20% flexibility, no rigidity, no guilt.',
    measure: '% of meals that are whole-food based' },
  { id: 'hand-portion-protein', label: 'Hand-portion protein', blurb: 'Use your palm to portion protein at each meal — no scale, no app.',
    skillId: 'portions', order: 1, level: 2,
    rationale: 'Calorie control without counting. The palm scales with body size.',
    measure: 'yes/no per meal' },
  { id: 'hand-portion-veggies', label: 'Hand-portion veggies', blurb: 'Use your fist to portion vegetables — at least one fist per meal.',
    skillId: 'portions', order: 2, level: 2,
    rationale: 'Fibre + volume, naturally scaled to body size.',
    measure: 'yes/no per meal' },
  { id: 'hand-portion-carbs', label: 'Hand-portion carbs', blurb: 'Use your cupped hand to portion starches — 1 cupped hand for fat loss, more around training.',
    skillId: 'portions', order: 3, level: 2,
    rationale: 'Carbs are an energy lever. Pull them down to lose fat, push them up to fuel training.',
    measure: 'yes/no per meal' },
  { id: 'hand-portion-fats', label: 'Hand-portion fats', blurb: 'Use your thumb to portion added fats (oil, nuts, dressings, cheese).',
    skillId: 'portions', order: 4, level: 2,
    rationale: 'Easy to under-track. The thumb prevents the slow drift up that derails fat-loss phases.',
    measure: 'yes/no per meal' },
  { id: 'emotional-eating-pause', label: 'Pause before emotional eating', blurb: 'When you reach for food and you\'re not hungry, pause for 5 minutes. Name the feeling. Drink water. Then decide.',
    skillId: 'mindset', order: 2, level: 2,
    rationale: 'Emotional eating isn\'t willpower failure — it\'s a coping skill that needs a substitute.',
    measure: 'pauses logged per week' },
  { id: 'mindful-indulgence', label: 'Mindful indulgence — "sometimes foods" without guilt', blurb: 'Pick the treat you actually want. Sit down, taste every bite, enjoy it fully. No guilt afterwards.',
    skillId: 'mindset', order: 3, level: 2,
    rationale: 'No food is "bad." Standing-up, distracted, guilt-ridden eating leads to MORE consumption, not less.',
    measure: 'mindful indulgences logged per week' },
  { id: 'identity-statement', label: 'Write your identity statement', blurb: '"I am the kind of person who ___" — fill it in, read it daily.',
    skillId: 'mindset', order: 4, level: 2,
    rationale: 'Behaviour follows identity. Naming who you\'re becoming is more powerful than naming what you\'re doing.',
    measure: 'yes/no per day' },
];

const PN: Methodology = {
  id: 'pn',
  label: 'Precision Nutrition (PN)',
  shortLabel: 'PN',
  tagline: 'Habit-based coaching, one practice at a time.',
  philosophy:
    'PN teaches one habit at a time — about 14 days each — building from foundational habits (sleep, hydration, slowing down) to balanced eating skills (hand portions, balanced plate, hunger awareness). No food is off-limits. No tracking apps required. The hand-portions system replaces calorie counting.',
  color: '#D87456',
  levels: [LEVEL_FOUND, LEVEL_BALANCED],
  skills: PN_SKILLS,
  practices: PN_PRACTICES,
  usesHandPortions: true,
  usesMacros: false,
  homeHeadline: 'The PN Practice',
  practiceWord: 'practice',
  chatbotPersona:
    'You are a Precision Nutrition (PN)-trained coach. You teach one habit at a time using PN\'s 5-S framework (Simple, Segmental, Sequential, Strategic, Supported). You use hand portions instead of macros (palm = protein, fist = veggies, cupped hand = carbs, thumb = fats). You never give meal plans or calorie targets — you assign one practice for ~14 days and check confidence (9-or-10/10 means ready to layer in the next).',
};

// ── 2. RENAISSANCE PERIODIZATION (RP) — macro-first ────────────────
const RP_SKILLS: MethodologySkill[] = [
  { id: 'macros', label: 'Macro targets', color: '#C25C7A',
    blurb: 'The non-negotiable: protein, carbs, fats hit daily. Everything else flows from this.' },
  { id: 'tracking', label: 'Tracking & measurement', color: '#5BA9D9',
    blurb: 'Weigh food. Log meals. Weigh body weekly. Measurements monthly.' },
  { id: 'meal-timing', label: 'Meal timing', color: '#8B7E6A',
    blurb: '4–5 meals/day. Pre and post workout nutrition. Carbs around training.' },
  { id: 'phases', label: 'Diet phases', color: '#D9A441',
    blurb: 'Cut, maintain, gain — each is a structured phase with its own targets and timeline.' },
  { id: 'recovery', label: 'Recovery', color: '#A47BB8',
    blurb: 'Sleep, hydration, deload weeks. Recovery enables the diet, not the other way around.' },
];

const RP_PRACTICES: MethodologyPractice[] = [
  // Level 1 — Foundations
  { id: 'rp-set-macros', label: 'Set your macro targets', blurb: 'Calculate protein/carb/fat targets for your phase. Write them on the fridge.',
    skillId: 'macros', order: 1, level: 1,
    rationale: 'You can\'t hit a target you haven\'t set. Numbers come first; food choices follow.',
    measure: 'targets set yes/no' },
  { id: 'rp-hit-protein', label: 'Hit protein every day', blurb: 'Hit your protein target ±10g, every day. This is non-negotiable.',
    skillId: 'macros', order: 2, level: 1,
    rationale: 'Protein is the macro that protects muscle in a cut and builds it in a gain. Miss everything else; never miss this.',
    measure: 'days protein hit / 7' },
  { id: 'rp-hit-calories', label: 'Hit calories ±100', blurb: 'Stay within 100 calories of your daily target.',
    skillId: 'macros', order: 3, level: 1,
    rationale: 'Calories are king for body composition. Macros within them are how you optimize.',
    measure: 'days within range / 7' },
  { id: 'rp-weigh-food', label: 'Weigh your food', blurb: 'Use a kitchen scale for everything you cook at home. Eyeballing is for restaurants only.',
    skillId: 'tracking', order: 1, level: 1,
    rationale: 'The #1 reason people "can\'t lose fat" is under-counting portions. The scale doesn\'t lie.',
    measure: 'meals weighed / total meals' },
  { id: 'rp-log-meals', label: 'Log every meal', blurb: 'MyFitnessPal or similar. Log before you eat, not after.',
    skillId: 'tracking', order: 2, level: 1,
    rationale: 'Logging before eating creates the pause that lets you adjust portions to hit your numbers.',
    measure: 'meals logged / total meals' },
  { id: 'rp-meal-frequency', label: '4–5 meals per day', blurb: 'Spread protein across 4–5 meals, ~3–4 hours apart.',
    skillId: 'meal-timing', order: 1, level: 1,
    rationale: 'Protein synthesis maxes out at ~40g per meal. Spreading meals captures more total synthesis.',
    measure: 'days with 4+ meals / 7' },
  { id: 'rp-pre-post-workout', label: 'Pre and post workout nutrition', blurb: 'Carbs + protein within 1-2 hours before lifting. Same within 1 hour after.',
    skillId: 'meal-timing', order: 2, level: 1,
    rationale: 'Training is when the body is most insulin-sensitive. Carbs around the session fuel and recover.',
    measure: 'workouts with PWO nutrition / total workouts' },
  { id: 'rp-hydration', label: '1ml water per kcal', blurb: 'If you eat 2,500 kcal, drink 2.5L water. Higher when you sweat.',
    skillId: 'recovery', order: 1, level: 1,
    rationale: 'Dehydration tanks training performance and is the #1 cause of fake hunger.',
    measure: 'litres per day' },
  { id: 'rp-sleep', label: '7-9 hours of sleep', blurb: 'Same bedtime, dark room, no screens 30 minutes before.',
    skillId: 'recovery', order: 2, level: 1,
    rationale: 'Sleep is when muscle repairs and hunger hormones reset. Underslept = under-recovered = stalled progress.',
    measure: 'avg hours per night' },
  // Level 2 — Optimization
  { id: 'rp-time-carbs', label: 'Time carbs around training', blurb: 'Highest carbs in pre/post-workout meals. Lower carbs further from training.',
    skillId: 'meal-timing', order: 3, level: 2,
    rationale: 'Once macros are dialed in, distribution matters. Carbs near training fuel work; lower carbs the rest of the day improve insulin sensitivity.',
    measure: 'days with timed carbs / 7' },
  { id: 'rp-refeeds', label: 'Plan refeed days', blurb: 'In a cut, schedule a higher-carb day every 7-14 days. Maintain or surplus calories.',
    skillId: 'phases', order: 1, level: 2,
    rationale: 'Refeeds restore glycogen, support training, and break the "cut grind" — psychological and physical reset.',
    measure: 'refeeds completed per cycle' },
  { id: 'rp-track-progress', label: 'Track measurements weekly', blurb: 'Weigh in same time, same conditions, 3-7 days/week. Average the numbers.',
    skillId: 'tracking', order: 3, level: 2,
    rationale: 'Daily weight is noise. Weekly averages reveal the actual trend.',
    measure: 'weigh-ins per week' },
  { id: 'rp-adjust-macros', label: 'Adjust macros every 2 weeks', blurb: 'Look at the trend. Body composition stalled? Adjust calories ±100-200. Rinse, repeat.',
    skillId: 'phases', order: 2, level: 2,
    rationale: 'Metabolism adapts. Static macros stop working. The discipline is in the adjustment cycle, not the initial setup.',
    measure: 'adjustments per phase' },
  { id: 'rp-deload', label: 'Strategic deload weeks', blurb: 'Every 6-8 weeks of hard training, take a deload — 50-60% of normal volume.',
    skillId: 'recovery', order: 3, level: 2,
    rationale: 'You don\'t grow during the work. You grow during the recovery. Deloads are when adaptation finishes.',
    measure: 'deloads per cycle' },
  { id: 'rp-diet-break', label: 'Diet break every 8-12 weeks', blurb: 'In a long cut, take a 1-2 week maintenance break. Eat at maintenance.',
    skillId: 'phases', order: 3, level: 2,
    rationale: 'Long cuts compound metabolic adaptations. A diet break re-elevates baseline and protects the metabolism for the rest of the cut.',
    measure: 'diet breaks per long cut' },
  { id: 'rp-volume-foods', label: 'Use volume foods to manage hunger', blurb: 'Pile veggies, lean proteins, broths, fruit when hungry but macros are spent.',
    skillId: 'macros', order: 4, level: 2,
    rationale: 'You can\'t out-discipline real hunger forever. Volume foods stretch the cut without breaking calorie targets.',
    measure: 'volume foods used per cut' },
];

const RP: Methodology = {
  id: 'rp',
  label: 'Renaissance Periodization (RP)',
  shortLabel: 'RP',
  tagline: 'Macro-based, evidence-driven, phased.',
  philosophy:
    'RP is the macro-first, evidence-based approach pioneered by Dr. Mike Israetel and Dr. Layne Norton. You weigh food, hit daily macro targets, and run structured diet phases (cut → maintain → gain). Body composition is the goal; tracking is the tool. Best for clients with a clear physique or performance goal who want a systematic, measurable approach.',
  color: '#C25C7A',
  levels: [
    { ...LEVEL_FOUND, label: 'Level 1 — Macro Foundations', tagline: 'Hit your numbers, every day.',
      blurb: 'Set the targets. Weigh the food. Log the meals. Build the discipline of hitting protein and calories before you optimize anything else.' },
    { ...LEVEL_BALANCED, label: 'Level 2 — Optimization', tagline: 'Refine the system.',
      blurb: 'Once you can hit your numbers consistently, layer in nutrient timing, refeeds, deloads, diet breaks, and the strategic adjustments that turn good results into great ones.' },
  ],
  skills: RP_SKILLS,
  practices: RP_PRACTICES,
  usesHandPortions: false,
  usesMacros: true,
  homeHeadline: 'Today\'s Macro Target',
  practiceWord: 'task',
  chatbotPersona:
    'You are a Renaissance Periodization (RP)-style coach. You set macro targets and diet phases (cut, maintain, gain). You believe in weighing food, logging meals, and adjusting calories every 2 weeks based on weekly weight averages. You speak in terms of macros (protein in grams, calorie targets), training periodization, and evidence-based diet science. You do NOT use hand portions. You do NOT shame foods, but you DO measure everything.',
};

// ── 3. INTUITIVE EATING (IE) — Tribole/Resch ────────────────────────
const IE_SKILLS: MethodologySkill[] = [
  { id: 'ie-trust', label: 'Rebuilding trust with food', color: '#A47BB8',
    blurb: 'Reject the diet mentality. Make peace with food. Quiet the food police.' },
  { id: 'ie-attunement', label: 'Body attunement', color: '#D87456',
    blurb: 'Honor hunger. Feel fullness. Discover the satisfaction factor.' },
  { id: 'ie-emotion', label: 'Emotional regulation', color: '#5BA9D9',
    blurb: 'Cope with emotions with kindness — food doesn\'t need to be the answer.' },
  { id: 'ie-respect', label: 'Body respect & gentle nutrition', color: '#6B8E5A',
    blurb: 'Respect your body where it is. Move for joy. Eat for nourishment AND pleasure.' },
];

const IE_PRACTICES: MethodologyPractice[] = [
  // Level 1 — Rebuild trust + attunement
  { id: 'ie-reject-diet', label: 'Principle 1: Reject the diet mentality', blurb: 'Throw out the diet books. Stop following meal plans. Notice the rules you carry and let them go, one at a time.',
    skillId: 'ie-trust', order: 1, level: 1,
    rationale: 'The diet cycle drives the binge cycle. Until clients stop dieting, intuitive eating can\'t take root.',
    measure: 'food rules released per week' },
  { id: 'ie-honor-hunger', label: 'Principle 2: Honor your hunger', blurb: 'Feed yourself when you\'re hungry — don\'t wait until you\'re ravenous.',
    skillId: 'ie-attunement', order: 1, level: 1,
    rationale: 'Biological hunger ignored becomes overeating later. Rebuild the trust by responding to early hunger.',
    measure: 'meals eaten when hungry, not "scheduled"' },
  { id: 'ie-make-peace', label: 'Principle 3: Make peace with food', blurb: 'Give yourself unconditional permission to eat. No food is forbidden.',
    skillId: 'ie-trust', order: 2, level: 1,
    rationale: 'Forbidden foods drive cravings. When everything is allowed, nothing is special — and the urgency disappears.',
    measure: 'forbidden foods reintroduced' },
  { id: 'ie-challenge-police', label: 'Principle 4: Challenge the food police', blurb: 'Notice the inner voice that calls food "good" or "bad." Talk back to it.',
    skillId: 'ie-trust', order: 3, level: 1,
    rationale: 'The food police were installed by diet culture. Naming and challenging them is how clients reclaim their own voice.',
    measure: 'food-police thoughts noticed and reframed' },
  { id: 'ie-feel-fullness', label: 'Principle 6: Feel your fullness', blurb: 'Pause mid-meal. Check in. Are you still hungry? Comfortably full? Stop when satisfied.',
    skillId: 'ie-attunement', order: 2, level: 1,
    rationale: 'Fullness is a signal you can learn to read again — but only by pausing to listen. Slow eating is the practice.',
    measure: 'meals paused to check fullness' },
  { id: 'ie-cope-emotions', label: 'Principle 7: Cope with emotions with kindness', blurb: 'When emotions push you to eat, pause. Name the feeling. Try a non-food response (a walk, a call, a deep breath, a journal entry).',
    skillId: 'ie-emotion', order: 1, level: 1,
    rationale: 'Food is a coping skill — not a bad one, just a single one. Building a wider toolkit is how emotional eating loosens its grip.',
    measure: 'non-food coping responses per week' },
  // Level 2 — Refine + nourish
  { id: 'ie-satisfaction', label: 'Principle 5: Discover the satisfaction factor', blurb: 'Eat the foods you actually want, in pleasant settings, without distraction. Notice when you\'re satisfied — physically AND mentally.',
    skillId: 'ie-attunement', order: 3, level: 2,
    rationale: 'Without satisfaction, no portion ever feels enough. Satisfaction completes the meal.',
    measure: 'meals where satisfaction was noticed' },
  { id: 'ie-respect-body', label: 'Principle 8: Respect your body', blurb: 'Accept your genetic blueprint. Stop the body-shame talk. Dress in clothes that fit you NOW.',
    skillId: 'ie-respect', order: 1, level: 2,
    rationale: 'You can\'t hate your body into the body you want. Respect comes first; care follows.',
    measure: 'body-respect actions per week' },
  { id: 'ie-joyful-movement', label: 'Principle 9: Movement — feel the difference', blurb: 'Move your body in ways that feel GOOD. Notice how energized, strong, or calm you feel afterwards.',
    skillId: 'ie-respect', order: 2, level: 2,
    rationale: 'Punishment-based exercise is unsustainable. Movement that feels good gets repeated.',
    measure: 'enjoyable movement sessions per week' },
  { id: 'ie-gentle-nutrition', label: 'Principle 10: Honor your health with gentle nutrition', blurb: 'Make food choices that honor health AND pleasure. Progress, not perfection. One meal doesn\'t define your nutrition; the pattern does.',
    skillId: 'ie-respect', order: 3, level: 2,
    rationale: 'The final principle — only when the other 9 are integrated. Nutrition without rules.',
    measure: 'gentle-nutrition choices per week' },
];

const IE: Methodology = {
  id: 'ie',
  label: 'Intuitive Eating',
  shortLabel: 'IE',
  tagline: 'The 10 principles. No diets. No rules.',
  philosophy:
    'Intuitive Eating, developed by Evelyn Tribole and Elyse Resch, is the anti-diet approach. The 10 principles rebuild trust between you and food — start by rejecting diets, honoring hunger, making peace with food. Then layer in body respect, gentle nutrition, and joyful movement. Best for clients with a history of dieting, restriction, or disordered eating who need to heal their relationship with food before any "optimization" can happen.',
  color: '#A47BB8',
  levels: [
    { ...LEVEL_FOUND, label: 'Phase 1 — Rebuild trust',
      tagline: 'Reject diets. Honor hunger. Make peace with food.',
      blurb: 'The first 7 principles. Heal the relationship with food before refining anything. No tracking, no rules, no plans — just attunement and trust.' },
    { ...LEVEL_BALANCED, label: 'Phase 2 — Refine and nourish',
      tagline: 'Satisfaction. Body respect. Gentle nutrition.',
      blurb: 'Once trust is rebuilt, layer in the deeper principles — discovering satisfaction, respecting the body you have, and choosing nutrition for both health AND pleasure.' },
  ],
  skills: IE_SKILLS,
  practices: IE_PRACTICES,
  usesHandPortions: false,
  usesMacros: false,
  homeHeadline: 'Today\'s Principle',
  practiceWord: 'principle',
  chatbotPersona:
    'You are an Intuitive Eating-trained coach (in the Tribole/Resch tradition). You believe diets fail and harm. You NEVER recommend tracking, weighing, or counting. You teach the 10 principles in order — reject the diet mentality first, honor hunger, make peace with food, etc. You use HAES (Health at Every Size) language. You frame all "rules" as installed by diet culture and worth challenging. You support clients in rebuilding their relationship with food and body, not in achieving weight outcomes.',
};

// ── 4. INTEGRATIVE NUTRITION (IIN) ──────────────────────────────────
const IIN_SKILLS: MethodologySkill[] = [
  { id: 'iin-primary', label: 'Primary food', color: '#C28BB5',
    blurb: 'Relationships, career, movement, spirituality — the things that feed you OFF the plate.' },
  { id: 'iin-secondary', label: 'Secondary food', color: '#6B8E5A',
    blurb: 'What\'s actually on the plate — bio-individual, crowd-in, seasonal, whole foods.' },
  { id: 'iin-bioind', label: 'Bio-individuality', color: '#D9A441',
    blurb: 'Your body is unique. The right diet for you is not the right diet for anyone else.' },
  { id: 'iin-cravings', label: 'Cravings as messages', color: '#D87456',
    blurb: 'Cravings aren\'t weakness — they\'re information. Listen to what they\'re telling you.' },
  { id: 'iin-lifestyle', label: 'Lifestyle & self-care', color: '#5B8B7B',
    blurb: 'Sleep, movement, nature, connection. The lifestyle that surrounds the food.' },
];

const IIN_PRACTICES: MethodologyPractice[] = [
  // Level 1 — Primary food + foundations
  { id: 'iin-find-why', label: 'Identify your "why"', blurb: 'Write 3 sentences about why nourishment matters to you right now. Read it weekly.',
    skillId: 'iin-primary', order: 1, level: 1,
    rationale: 'IIN starts with meaning. Without a "why," lasting change doesn\'t stick.',
    measure: 'why written + reviewed weekly' },
  { id: 'iin-circle-life', label: 'Audit your "Circle of Life"', blurb: 'Score yourself 1-10 on relationships, career, movement, spirituality, sleep, joy. Notice the lows. Pick ONE to nudge up.',
    skillId: 'iin-primary', order: 2, level: 1,
    rationale: 'IIN\'s signature exercise. Most "food problems" are actually primary-food problems.',
    measure: 'audit completed + 1 area chosen' },
  { id: 'iin-add-veg', label: 'Add 1 vegetable to every meal', blurb: 'Don\'t restrict — ADD. One veg at every meal, no matter what else is on the plate.',
    skillId: 'iin-secondary', order: 1, level: 1,
    rationale: 'IIN\'s "crowd in" principle. Adding nourishment naturally edges out the less-helpful.',
    measure: 'meals with added veg / total meals' },
  { id: 'iin-water', label: 'Drink 8 glasses of water', blurb: 'Pure, clean water — at least 8 glasses a day. Filter if you can.',
    skillId: 'iin-lifestyle', order: 1, level: 1,
    rationale: 'Water is the most overlooked nutrient. Hydration affects energy, skin, digestion, mood.',
    measure: 'glasses per day' },
  { id: 'iin-joy-movement', label: '30 min of movement you ENJOY', blurb: 'Walking, dancing, yoga, gardening, swimming — anything that feels good. 30 minutes a day.',
    skillId: 'iin-lifestyle', order: 2, level: 1,
    rationale: 'IIN doesn\'t prescribe a workout. Movement that\'s enjoyable gets repeated; movement that\'s punishment gets dropped.',
    measure: 'enjoyable-movement days / 7' },
  { id: 'iin-sleep', label: 'Sleep 7-9 hours', blurb: 'Honour your circadian rhythm. Sleep when you\'re tired, wake when you\'re rested.',
    skillId: 'iin-lifestyle', order: 3, level: 1,
    rationale: 'Sleep is when the body repairs, the mind resets, and cravings normalize.',
    measure: 'avg hours per night' },
  { id: 'iin-reduce-sugar', label: 'Reduce sugar gradually', blurb: 'No going cold turkey — reduce by half this week. Then half again next week. Notice cravings shift.',
    skillId: 'iin-secondary', order: 2, level: 1,
    rationale: 'Sugar reduction without restriction. Honoring the body\'s adaptation pace prevents the binge backlash.',
    measure: 'sugar-free days per week' },
  { id: 'iin-primary-tweak', label: 'One primary-food tweak per week', blurb: 'Each week, change ONE thing in primary food — call a friend, walk in nature, take a bath, journal.',
    skillId: 'iin-primary', order: 3, level: 1,
    rationale: 'Slow, sustainable lifestyle change. One nudge per week compounds in 6 months.',
    measure: 'primary-food tweaks per month' },
  // Level 2 — Bio-individuality + lifestyle deepening
  { id: 'iin-find-bioind', label: 'Identify YOUR bio-individuality', blurb: 'Notice: which foods give you energy? Which drain you? When are you hungry? When are you full? Track for 2 weeks, no judgment.',
    skillId: 'iin-bioind', order: 1, level: 2,
    rationale: 'There is no universal "right diet." Your body has answers — but only if you listen.',
    measure: 'days tracking + insights captured' },
  { id: 'iin-crowd-in', label: 'Crowd in whole foods (80/20)', blurb: 'Aim for 80% whole, real food. The other 20% is for joy, celebration, and life.',
    skillId: 'iin-secondary', order: 3, level: 2,
    rationale: 'Crowd-in beats restrict-out. Adding good food displaces less-helpful food without willpower.',
    measure: '% of meals built around whole food' },
  { id: 'iin-cook-new-meal', label: 'Cook one new whole-food meal/week', blurb: 'Try one new recipe a week, built around real, whole ingredients. Make cooking a primary-food joy.',
    skillId: 'iin-secondary', order: 4, level: 2,
    rationale: 'Cooking is primary AND secondary food — the act of making it nourishes you, then the meal does too.',
    measure: 'new meals cooked per month' },
  { id: 'iin-cravings-curious', label: 'Get curious about cravings', blurb: 'When a craving hits, ask: am I tired? thirsty? lonely? bored? stressed? What primary-food need is showing up?',
    skillId: 'iin-cravings', order: 1, level: 2,
    rationale: 'IIN says cravings are messages from the body — they\'re information, not weakness.',
    measure: 'cravings explored per week' },
  { id: 'iin-reduce-inflammatory', label: 'Reduce inflammatory foods', blurb: 'Notice how you feel after processed sugar, refined flour, alcohol, industrial seed oils. Reduce gradually.',
    skillId: 'iin-secondary', order: 5, level: 2,
    rationale: 'IIN doesn\'t demonize foods, but it does invite awareness. Notice the cause-effect; let it inform choice.',
    measure: 'inflammatory-food-free days per week' },
  { id: 'iin-seasonal', label: 'Eat seasonally and locally', blurb: 'Buy what\'s in season. Visit a farmer\'s market. Notice the energy difference.',
    skillId: 'iin-secondary', order: 6, level: 2,
    rationale: 'Seasonal food is fresher, more nutrient-dense, and connects you to land + community.',
    measure: 'seasonal meals per week' },
  { id: 'iin-mindful-eating', label: 'Mindful eating practice', blurb: 'For at least one meal a day: no screens, no rushing. Notice flavor, texture, smell. Chew slowly.',
    skillId: 'iin-lifestyle', order: 4, level: 2,
    rationale: 'Mindful eating turns "fuel" into nourishment. Same calories, profoundly different effect.',
    measure: 'mindful meals per week' },
  { id: 'iin-self-care-ritual', label: 'A daily self-care ritual', blurb: 'Pick one: bath, journal, walk in nature, meditation. Do it daily. Protect the time.',
    skillId: 'iin-lifestyle', order: 5, level: 2,
    rationale: 'Self-care is a primary-food cornerstone. The ritual is what makes it stick.',
    measure: 'days the ritual happened / 7' },
];

const IIN: Methodology = {
  id: 'iin',
  label: 'Integrative Nutrition (IIN)',
  shortLabel: 'IIN',
  tagline: 'Bio-individuality. Primary food + secondary food.',
  philosophy:
    'The Institute for Integrative Nutrition (IIN) approach: there is no one diet that works for everyone (bio-individuality), and what feeds you OFF the plate (primary food — relationships, career, movement, spirituality) matters as much as what\'s ON the plate (secondary food). Crowd in nourishment rather than restrict; cravings are messages, not weakness; lifestyle and food work together. Best for clients who want a holistic, lifestyle-first approach.',
  color: '#C28BB5',
  levels: [
    { ...LEVEL_FOUND, label: 'Phase 1 — Primary food + foundations',
      tagline: 'What feeds you OFF the plate matters most.',
      blurb: 'Identify your why. Audit your relationships, career, movement, spirituality. Add water, vegetables, sleep, joyful movement. Build the lifestyle base before optimizing the food.' },
    { ...LEVEL_BALANCED, label: 'Phase 2 — Bio-individuality + deeper nourishment',
      tagline: 'Tune the food to YOU.',
      blurb: 'Discover what your unique body needs. Crowd in whole foods, listen to cravings as information, eat seasonally, deepen self-care. Nutrition that fits your life, not someone else\'s.' },
  ],
  skills: IIN_SKILLS,
  practices: IIN_PRACTICES,
  usesHandPortions: false,
  usesMacros: false,
  homeHeadline: 'Today\'s Nourishment',
  practiceWord: 'practice',
  chatbotPersona:
    'You are an Integrative Nutrition (IIN)-trained Health Coach. You believe in bio-individuality (no one diet works for everyone) and the concept of primary food (relationships, career, movement, spirituality) being as important as secondary food (what\'s on the plate). You use the "crowd in" approach — add nourishment rather than restrict. You treat cravings as information, not weakness. You speak holistically, including lifestyle alongside food. You don\'t prescribe macros, calorie counts, or rigid meal plans.',
};

// ── 5. CUSTOM — coach builds their own ───────────────────────────────
const CUSTOM: Methodology = {
  id: 'custom',
  label: 'Custom — your own program',
  shortLabel: 'Custom',
  tagline: 'Build your own habit library.',
  philosophy:
    'Use your own coaching framework. The Habit Library starts empty — add habits, organize them into Level 1 / Level 2, group them by skill. Use the app\'s scaffolding (2-week practices, client tracking, check-ins) with content you write yourself.',
  color: '#5B8B7B',
  levels: [
    { ...LEVEL_FOUND, label: 'Level 1 — Foundations', tagline: 'Your foundational habits.',
      blurb: 'The base layer of your coaching framework. Add the habits you teach to every new client.' },
    { ...LEVEL_BALANCED, label: 'Level 2 — Refinement', tagline: 'Your advanced habits.',
      blurb: 'The next layer. The habits you introduce once Level 1 is solid.' },
  ],
  skills: [
    { id: 'custom-foundational', label: 'Foundational', color: '#5B8B7B',
      blurb: 'The basics every client needs.' },
    { id: 'custom-eating', label: 'Eating skills', color: '#D87456',
      blurb: 'Habits around food, meals, and nutrition.' },
    { id: 'custom-lifestyle', label: 'Lifestyle', color: '#A47BB8',
      blurb: 'Sleep, movement, stress, recovery.' },
    { id: 'custom-mindset', label: 'Mindset', color: '#C25C7A',
      blurb: 'How clients think about food and themselves.' },
  ],
  practices: [],
  usesHandPortions: false,
  usesMacros: false,
  homeHeadline: 'Today\'s Habit',
  practiceWord: 'habit',
  chatbotPersona:
    'You are a personal nutrition coach using a custom-built coaching framework. Adapt your guidance to whatever habits the coach has set up for the client. Stay practical, supportive, and methodology-neutral — meet clients where they are.',
};

// ── Registry ─────────────────────────────────────────────────────────
export const METHODOLOGIES: Methodology[] = [PN, RP, IE, IIN, CUSTOM];

export const METHODOLOGY_BY_ID: Record<Methodology['id'], Methodology> = {
  pn: PN,
  rp: RP,
  ie: IE,
  iin: IIN,
  custom: CUSTOM,
};

export const DEFAULT_METHODOLOGY_ID: Methodology['id'] = 'pn';
