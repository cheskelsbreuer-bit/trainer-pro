// Nutrition coach app — tokens + data helpers. Deliberately a thin
// file (data + tokens only, no UI primitive library) so each page
// composes its own JSX, the way every prior template-app does now.
//
// Visual intent: warm cream paper, sage green primary, soft coral
// accent for "needs attention", honey for habits. Type pairing is
// Cormorant Garamond (serif display) + Inter (body).

import { useEffect, useState } from 'react';

export const N = {
  paper: 'var(--nut-paper)',
  card: 'var(--nut-card)',
  inset: 'var(--nut-inset)',
  rule: 'var(--nut-rule)',
  ruleSoft: 'var(--nut-rule-soft)',
  ink: 'var(--nut-ink)',
  inkSoft: 'var(--nut-ink-soft)',
  mute: 'var(--nut-mute)',
  muteFaint: 'var(--nut-mute-faint)',
  sage: 'var(--nut-sage)',
  sageDeep: 'var(--nut-sage-deep)',
  sageSoft: 'var(--nut-sage-soft)',
  coral: 'var(--nut-coral)',
  coralDeep: 'var(--nut-coral-deep)',
  coralSoft: 'var(--nut-coral-soft)',
  honey: 'var(--nut-honey)',
  honeySoft: 'var(--nut-honey-soft)',
  ok: 'var(--nut-ok)',
  warn: 'var(--nut-warn)',
  danger: 'var(--nut-danger)',
} as const;

// Display font — Outfit. Warm geometric sans-serif used by current-gen
// coaching apps (PN, Headway, Noom-adjacent). Friendly but professional;
// reads as "I'm a real piece of software" not "I'm a magazine."
// The variable name is kept as SERIF_FONT because every page imports it;
// changing the name would touch dozens of files. The semantic is "the
// display font" now.
export const SERIF_FONT =
  "'Outfit', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
// Body font — Inter (the de-facto standard for modern web apps,
// including PN's own site).
export const BODY_FONT =
  "'Inter', 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// Theme mode — defaults to LIGHT for the wellness aesthetic (most
// nutrition apps are paper-mode by default).
export type NutritionTheme = 'light' | 'dark';
const THEME_KEY = 'nutrition-theme';
export function useNutritionTheme(): [NutritionTheme, () => void] {
  const [mode, setMode] = useState<NutritionTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, mode);
  }, [mode]);
  return [mode, () => setMode((m) => (m === 'light' ? 'dark' : 'light'))];
}

// Tag prefixes — nutrition-specific attributes on clients.tags.
// The app is built around PN (Precision Nutrition) coaching: Goals →
// Skills → daily Practices. Each client has an ACTIVE PRACTICE (the
// 2-week habit they're working on right now). Macros are kept as
// secondary detail — PN coaches use them but they're not the lead.
export const GOAL_TAG = 'goal:'; // 'fat-loss' | 'maintenance' | 'muscle-gain' | 'health'
export const PRACTICE_TAG = 'practice:'; // id of current PN practice, e.g. 'practice:eat-slowly'
export const PRACTICE_STARTED_TAG = 'pstart:'; // ISO date this practice began
export const CALORIES_TAG = 'kcal:'; // optional daily target
export const PROTEIN_TAG = 'protein:'; // optional grams/day
export const CARBS_TAG = 'carbs:';
export const FATS_TAG = 'fats:';
export const WEIGHT_LB_TAG = 'weightlb:';
export const GOAL_WEIGHT_TAG = 'goalweightlb:';
export const STARTING_WEIGHT_TAG = 'startingweightlb:';

// Expanded goal list. The first 4 are the most common — they stay on
// the home / clients filter strip. The rest are still pickable in the
// add-client modal but don't crowd the filters. Real coaches handle a
// wide range of goals, this matches what Healthie / Practice Better /
// Nutrium offer in their goal taxonomies.
export const NUTRITION_GOALS = [
  { id: 'fat-loss', label: 'Fat loss', color: '#D87456' },
  { id: 'maintenance', label: 'Maintenance', color: '#6B8E5A' },
  { id: 'muscle-gain', label: 'Muscle gain', color: '#D9A441' },
  { id: 'health', label: 'General health', color: '#8B7E6A' },
  { id: 'performance', label: 'Sports performance', color: '#1F8FB5' },
  { id: 'endurance', label: 'Endurance training', color: '#4A8FCE' },
  { id: 'postpartum', label: 'Postpartum recovery', color: '#C28BB5' },
  { id: 'prenatal', label: 'Prenatal nutrition', color: '#C25C7A' },
  { id: 'gut-health', label: 'Gut health', color: '#7A9B7B' },
  { id: 'energy', label: 'Energy & fatigue', color: '#E89D4A' },
  { id: 'sleep', label: 'Sleep support', color: '#7A7BB5' },
  { id: 'longevity', label: 'Longevity & healthspan', color: '#5B8B7B' },
  { id: 'blood-sugar', label: 'Blood sugar / pre-diabetes', color: '#B85A47' },
  { id: 'cardio-health', label: 'Heart health', color: '#C0392B' },
  { id: 'plant-based', label: 'Plant-based transition', color: '#558B6E' },
  { id: 'hormones', label: 'Hormone balance', color: '#8E6BB5' },
];
// The 4 goals that show up in the home + clients filter pills (so the
// strip doesn't get crowded). All 16 are still pickable on Add-client.
export const FEATURED_GOAL_IDS = ['fat-loss', 'maintenance', 'muscle-gain', 'health'];

/** Suggest a starting PN practice based on the client's goal. Used by
 *  the Add-client modal's "Not sure?" auto-pick button. */
export function suggestStartingPractice(goalId: string): string {
  // Eat slowly is PN's universally-recommended starter — works for
  // almost every goal. We diverge for muscle-gain (protein-first
  // matters more there) and a few others where evidence + PN canon
  // points elsewhere.
  switch (goalId) {
    case 'muscle-gain':
      return 'protein-each-meal';
    case 'energy':
    case 'sleep':
      return 'sleep-7h';
    case 'gut-health':
      return 'eat-slowly';
    case 'postpartum':
    case 'prenatal':
      return 'protein-each-meal';
    case 'performance':
    case 'endurance':
      return 'hand-portion-carbs';
    case 'blood-sugar':
      return 'veggies-each-meal';
    case 'longevity':
    case 'cardio-health':
    case 'plant-based':
      return 'veggies-each-meal';
    default:
      return 'eat-slowly';
  }
}

// ── PN Practices Library ─────────────────────────────────────────────
// The Precision Nutrition curriculum, broken into skills and the daily
// practices (habits) that build them. A coach assigns ONE practice at
// a time for roughly 2 weeks. Each practice should be:
//   Simple (9-10/10 confidence), Segmental, Sequential, Strategic, Supported.
// (The 5-S formula from PN.)
//
// `order` is the recommended sequence inside a skill — assign in order
// for new clients. Some practices use PN's hand-portions vocabulary:
//   palm = protein, fist = veggies, cupped hand = carbs, thumb = fats.

export interface NutritionSkill {
  id: string;
  label: string;
  color: string;
  blurb: string;
}

export const NUTRITION_SKILLS: NutritionSkill[] = [
  {
    id: 'hunger-awareness',
    label: 'Hunger & appetite awareness',
    color: '#D87456',
    blurb: 'Learn to feel real hunger and fullness — the bedrock skill before any rules or macros.',
  },
  {
    id: 'food-quality',
    label: 'Food quality & whole foods',
    color: '#6B8E5A',
    blurb: 'Tilt the plate toward minimally-processed foods most meals.',
  },
  {
    id: 'portions',
    label: 'Portion awareness (hand portions)',
    color: '#D9A441',
    blurb: 'Eyeball calorie control without weighing food — palm, fist, cupped hand, thumb.',
  },
  {
    id: 'meal-frequency',
    label: 'Meal frequency & timing',
    color: '#8B7E6A',
    blurb: 'Eat on a rhythm that suits the client — protein at every meal, smart carbs around training.',
  },
  {
    id: 'environment',
    label: 'Environment & planning',
    color: '#5BA9D9',
    blurb: 'Make the right choice the easy choice. Meal prep, kitchen setup, grocery routine.',
  },
  {
    id: 'recovery',
    label: 'Recovery — sleep, stress, breath',
    color: '#A47BB8',
    blurb: 'Sleep, stress, and recovery move the needle as much as food. Often more.',
  },
  {
    id: 'mindset',
    label: 'Mindset & identity',
    color: '#C25C7A',
    blurb: 'Why over what. Values, identity, all-or-something thinking, self-compassion.',
  },
];

export interface NutritionPractice {
  id: string;
  label: string;
  /** A 1-sentence client-facing description. */
  blurb: string;
  /** The skill it builds. */
  skillId: string;
  /** Recommended order within the skill (lower = assign first). */
  order: number;
  /** Why this one matters in PN's words. */
  rationale: string;
  /** How the client logs it daily (yes/no, count, scale, etc.). */
  measure: string;
  /** Curriculum level. 1 = Foundational Habits (stability & awareness),
   *  2 = Balanced Eating (the next layer up). */
  level: 1 | 2;
}

// Level metadata — mirrors the curriculum the head coach uses.
// Level 1 builds stability and awareness; Level 2 builds balanced
// eating without obsession. Coaches always finish a Level 1 base
// before layering Level 2 practices on top.
export interface NutritionLevel {
  id: 1 | 2;
  label: string;
  tagline: string;
  blurb: string;
  color: string;
}

export const NUTRITION_LEVELS: NutritionLevel[] = [
  {
    id: 1,
    label: 'Level 1 — Foundational Habits',
    tagline: 'Create stability and awareness.',
    blurb:
      'The base layer. Hydration, sleep, slowing down at the table, daily movement, consistency. Every client starts here, no exceptions.',
    color: '#D87456',
  },
  {
    id: 2,
    label: 'Level 2 — Balanced Eating',
    tagline: 'Building satisfying balanced meals without obsession.',
    blurb:
      'Once Level 1 is automatic, layer in balanced plates, portion awareness, hunger/fullness, and the harder behaviors — emotional eating, nighttime eating, liquid calories — handled without guilt.',
    color: '#6B8E5A',
  },
];

export const NUTRITION_PRACTICES: NutritionPractice[] = [
  // ── LEVEL 1 — FOUNDATIONAL HABITS ─────────────────────────────────
  // The base layer. Stability and awareness before any "balanced
  // eating" work begins.

  // Hunger awareness — the canonical PN starting place
  {
    id: 'eat-slowly',
    label: 'Eat slowly',
    blurb: 'Take 15-20 minutes for each meal. Chew well, put the fork down between bites.',
    skillId: 'hunger-awareness',
    order: 1,
    level: 1,
    rationale:
      'Slowing down lets satiety signals catch up before you overshoot. The single highest-ROI habit in PN.',
    measure: 'yes/no per meal',
  },
  {
    id: 'no-screens-meals',
    label: 'No screens at meals',
    blurb: 'Eat without phone, TV, or laptop. Plate, table, food. That\'s it.',
    skillId: 'hunger-awareness',
    order: 2,
    level: 1,
    rationale:
      'Distracted eating dulls satiety cues — people consistently eat 20–50% more in front of a screen and remember less of the meal afterward.',
    measure: 'yes/no per meal',
  },
  // Food quality — Level 1 basics
  {
    id: 'hydration',
    label: 'Drink water throughout the day',
    blurb: 'Aim for ~2–3 litres of water daily. Glass on waking, glass before each meal.',
    skillId: 'food-quality',
    order: 1,
    level: 1,
    rationale:
      'Mild dehydration is misread by the brain as hunger. Most "snack cravings" between meals are thirst in disguise.',
    measure: 'glasses or litres per day',
  },
  {
    id: 'protein-each-meal',
    label: 'Protein with every meal',
    blurb: '1–2 palm-sized portions of protein at each meal (1 for women, 2 for men).',
    skillId: 'food-quality',
    order: 2,
    level: 1,
    rationale:
      'Protein is the most satiating macronutrient. Anchors the meal and prevents grazing.',
    measure: 'meals containing protein / total meals',
  },
  // Meal frequency — Level 1: getting the rhythm right
  {
    id: 'meal-rhythm',
    label: 'Eat on a steady rhythm',
    blurb: '3 meals at roughly the same times each day. Don\'t skip; don\'t graze in between.',
    skillId: 'meal-frequency',
    order: 1,
    level: 1,
    rationale:
      'A predictable rhythm regulates hunger hormones and stops the late-day "I haven\'t eaten all day, now I\'ll eat everything" pattern.',
    measure: 'days following the rhythm / 7',
  },
  // Environment — Level 1: consistency
  {
    id: 'meal-prep-3x',
    label: 'Prep 3 meals each week',
    blurb: 'Block 60–90 min once a week to cook 3 meals ahead.',
    skillId: 'environment',
    order: 1,
    level: 1,
    rationale:
      'Eliminates the "what\'s for dinner" decision-fatigue moment that wrecks adherence on busy nights.',
    measure: '# of meals prepped this week',
  },
  {
    id: 'grocery-list',
    label: 'Shop from a list',
    blurb: 'Write a grocery list before each shop. Stick to it.',
    skillId: 'environment',
    order: 2,
    level: 1,
    rationale: 'Decisions get made in the kitchen, not at the checkout. Buy the right things, eat the right things.',
    measure: 'yes/no per shopping trip',
  },
  // Recovery — Level 1: sleep, stress, breath, daily movement
  {
    id: 'sleep-7h',
    label: '7+ hours of sleep',
    blurb: 'Lights out at the same time most nights. Aim for 7 hours minimum.',
    skillId: 'recovery',
    order: 1,
    level: 1,
    rationale:
      'Insufficient sleep wrecks hunger hormones and willpower. PN puts sleep on par with food.',
    measure: 'avg hours per night',
  },
  {
    id: 'five-breaths',
    label: '5 deep breaths before eating',
    blurb: 'Before each meal, take 5 slow breaths. Notice hunger level.',
    skillId: 'recovery',
    order: 2,
    level: 1,
    rationale:
      'Down-shifts the nervous system into rest-and-digest. Slows the meal automatically. Builds stress awareness.',
    measure: 'yes/no per meal',
  },
  {
    id: 'stress-walk',
    label: '10-min stress walk daily',
    blurb: 'One 10-minute walk a day, no phone. Mid-day if possible.',
    skillId: 'recovery',
    order: 3,
    level: 1,
    rationale:
      'Movement + sunlight + non-screen time. Down-regulates stress, supports sleep, breaks workday grind.',
    measure: 'yes/no per day',
  },
  {
    id: 'movement-weekly',
    label: 'Move your body 3–5x a week',
    blurb: 'A mix of cardio (walks, runs, classes) and strength (weights, bodyweight). Anything that gets you breathing harder.',
    skillId: 'recovery',
    order: 4,
    level: 1,
    rationale:
      'Movement is non-negotiable for body composition, mood, sleep, and metabolic health. The exact form matters less than consistency.',
    measure: 'sessions per week',
  },
  // Mindset — Level 1: consistency over perfection
  {
    id: 'something-not-nothing',
    label: 'Something is better than nothing',
    blurb: 'When the perfect plan falls apart, do the something-version. Always.',
    skillId: 'mindset',
    order: 1,
    level: 1,
    rationale:
      'PN\'s antidote to all-or-nothing thinking. A 5-minute workout still beats no workout. Consistency, not intensity, wins.',
    measure: 'yes/no per day',
  },

  // ── LEVEL 2 — BALANCED EATING ────────────────────────────────────
  // Layered in only after Level 1 is automatic. Builds satisfying
  // balanced meals without obsession.

  // Hunger awareness — Level 2: hunger/fullness scale
  {
    id: 'eat-to-80',
    label: 'Eat to 80% full',
    blurb: 'Stop at "satisfied," not "stuffed." Leave the table able to take a brisk walk.',
    skillId: 'hunger-awareness',
    order: 3,
    level: 2,
    rationale:
      'Builds the appetite-awareness skill. Pairs naturally with "eat slowly" once that one is automatic.',
    measure: '1–10 fullness rating per meal',
  },
  {
    id: 'nighttime-cutoff',
    label: 'Stop eating after dinner',
    blurb: 'Close the kitchen 2–3 hours before bed. Tea, water, brushed teeth — done for the day.',
    skillId: 'hunger-awareness',
    order: 4,
    level: 2,
    rationale:
      'Nighttime eating is rarely about hunger — it\'s usually decompression, boredom, or screen-time grazing. Cutting it off resets sleep, morning hunger, and total intake.',
    measure: 'nights with kitchen closed / 7',
  },
  // Food quality — Level 2: balanced plate, calorie density, liquid cals
  {
    id: 'veggies-each-meal',
    label: 'Veggies with every meal',
    blurb: '1–2 fist-sized portions of vegetables at each meal — fibre that keeps you full.',
    skillId: 'food-quality',
    order: 3,
    level: 2,
    rationale:
      'Volume, fibre, micronutrients. Crowds out less helpful foods without restriction. The "stay full longer" lever.',
    measure: 'meals containing veggies / total meals',
  },
  {
    id: 'balanced-plate',
    label: 'Build a balanced plate',
    blurb: 'Every meal: a palm of protein + a fist of veggies + a thumb of healthy fat + (optional) a cupped hand of carbs.',
    skillId: 'food-quality',
    order: 4,
    level: 2,
    rationale:
      'Protein + fibre + fat together is the most satisfying combination in food science. Once a client can build this plate without thinking, hunger and cravings drop in half.',
    measure: 'meals built balanced / total meals',
  },
  {
    id: 'liquid-calories',
    label: 'Cut liquid calories',
    blurb: 'Stop drinking your calories. Coffee creamer, juice, soda, fancy lattes, alcohol — sub for water, plain coffee, sparkling water, or tea.',
    skillId: 'food-quality',
    order: 5,
    level: 2,
    rationale:
      'Liquid calories don\'t register as fullness — they\'re the easiest hidden source of overeating. Cutting them is often the single biggest fat-loss lever for women in their 30s–50s.',
    measure: 'days with no liquid calories / 7',
  },
  {
    id: 'volume-eating',
    label: 'Lean on low-calorie-density foods',
    blurb: 'Build meals around foods that are big in volume, small in calories — vegetables, broths, salads, fruit, lean proteins.',
    skillId: 'food-quality',
    order: 6,
    level: 2,
    rationale:
      'Calorie density is the hidden lever in fat loss. Same calories, more volume = staying full on less.',
    measure: 'meals built around volume foods / total meals',
  },
  {
    id: 'whole-foods-most',
    label: 'Whole foods most of the time',
    blurb: 'Aim for ~80% of meals built around minimally-processed foods.',
    skillId: 'food-quality',
    order: 7,
    level: 2,
    rationale:
      'PN\'s "80/20" principle — 80% whole foods, 20% flexibility, no rigidity, no guilt.',
    measure: '% of meals that are whole-food based',
  },
  // Portion awareness — Level 2: hand portions
  {
    id: 'hand-portion-protein',
    label: 'Hand-portion protein',
    blurb: 'Use your palm to portion protein at each meal — no scale, no app.',
    skillId: 'portions',
    order: 1,
    level: 2,
    rationale:
      'Calorie control without counting. The palm scales with body size, so each person\'s portion is right for them.',
    measure: 'yes/no per meal',
  },
  {
    id: 'hand-portion-veggies',
    label: 'Hand-portion veggies',
    blurb: 'Use your fist to portion vegetables — at least one fist per meal.',
    skillId: 'portions',
    order: 2,
    level: 2,
    rationale: 'Fibre + volume, naturally scaled to body size.',
    measure: 'yes/no per meal',
  },
  {
    id: 'hand-portion-carbs',
    label: 'Hand-portion carbs',
    blurb: 'Use your cupped hand to portion starches — 1 cupped hand for fat loss, more around training.',
    skillId: 'portions',
    order: 3,
    level: 2,
    rationale: 'Carbs are an energy lever. Pull them down to lose fat, push them up to fuel training.',
    measure: 'yes/no per meal',
  },
  {
    id: 'hand-portion-fats',
    label: 'Hand-portion fats',
    blurb: 'Use your thumb to portion added fats (oil, nuts, dressings, cheese).',
    skillId: 'portions',
    order: 4,
    level: 2,
    rationale: 'Easy to under-track. The thumb prevents the slow drift up that derails fat-loss phases.',
    measure: 'yes/no per meal',
  },
  // Mindset — Level 2: emotional eating, mindful indulgence, identity
  {
    id: 'emotional-eating-pause',
    label: 'Pause before emotional eating',
    blurb: 'When you reach for food and you\'re not hungry, pause for 5 minutes. Name the feeling. Drink water. Then decide.',
    skillId: 'mindset',
    order: 2,
    level: 2,
    rationale:
      'Emotional eating isn\'t a willpower failure — it\'s a coping skill that needs a substitute. The pause creates space to choose a real response (a walk, a call, a deep breath) or to eat anyway, without guilt.',
    measure: 'pauses logged per week',
  },
  {
    id: 'mindful-indulgence',
    label: 'Mindful indulgence — "sometimes foods" without guilt',
    blurb: 'Pick the treat you actually want. Sit down, taste every bite, enjoy it fully. No guilt afterwards.',
    skillId: 'mindset',
    order: 3,
    level: 2,
    rationale:
      'No food is "bad." Standing-up, distracted, guilt-ridden eating leads to MORE consumption, not less. Sit, savour, move on.',
    measure: 'mindful indulgences logged per week',
  },
  {
    id: 'identity-statement',
    label: 'Write your identity statement',
    blurb: '"I am the kind of person who ___" — fill it in, read it daily.',
    skillId: 'mindset',
    order: 4,
    level: 2,
    rationale:
      'Behaviour follows identity. Naming who you\'re becoming is more powerful than naming what you\'re doing.',
    measure: 'yes/no per day',
  },
];

// Hand-portion reference — used by the visual on the Practices page.
export const HAND_PORTIONS = [
  {
    id: 'palm',
    label: 'Palm',
    macroLabel: 'Protein',
    color: '#D87456',
    blurb:
      'Your palm = a protein portion. Women: 1 palm per meal. Men: 2 palms per meal.',
    examples: 'Chicken, fish, lean beef, tofu, Greek yogurt, eggs.',
  },
  {
    id: 'fist',
    label: 'Fist',
    macroLabel: 'Vegetables',
    color: '#6B8E5A',
    blurb:
      'Your fist = a veggie portion. Aim for 1–2 fists at every meal. No upper limit.',
    examples: 'Broccoli, spinach, peppers, carrots, salad, roasted veg.',
  },
  {
    id: 'cupped',
    label: 'Cupped hand',
    macroLabel: 'Carbs',
    color: '#D9A441',
    blurb:
      'Your cupped hand = a carb portion. Women: 1 cupped hand. Men: 2. Add more around training.',
    examples: 'Rice, oats, potatoes, pasta, beans, fruit.',
  },
  {
    id: 'thumb',
    label: 'Thumb',
    macroLabel: 'Fats',
    color: '#A47BB8',
    blurb:
      'Your thumb = a fat portion. Women: 1 thumb per meal. Men: 2 thumbs.',
    examples: 'Olive oil, nuts, avocado, cheese, butter, dressings.',
  },
];

// Lookup helpers
export const PRACTICE_BY_ID: Record<string, NutritionPractice> =
  NUTRITION_PRACTICES.reduce(
    (acc, p) => {
      acc[p.id] = p;
      return acc;
    },
    {} as Record<string, NutritionPractice>,
  );

export const SKILL_BY_ID: Record<string, NutritionSkill> = NUTRITION_SKILLS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<string, NutritionSkill>,
);

/** Standard PN window — 2 weeks per practice. */
export const PRACTICE_WINDOW_DAYS = 14;

function tagN(tags: string[] | null | undefined, prefix: string): number | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(prefix)) {
      const v = parseInt(t.slice(prefix.length), 10);
      if (Number.isFinite(v)) return v;
    }
  }
  return null;
}
function tagS(tags: string[] | null | undefined, prefix: string): string | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(prefix)) return t.slice(prefix.length);
  }
  return null;
}

export function readGoal(tags: string[] | null | undefined) {
  const id = tagS(tags, GOAL_TAG);
  if (!id) return NUTRITION_GOALS[1];
  return NUTRITION_GOALS.find((g) => g.id === id) ?? NUTRITION_GOALS[1];
}
export function readActivePractice(
  tags: string[] | null | undefined,
): NutritionPractice | null {
  const id = tagS(tags, PRACTICE_TAG);
  if (!id) return null;
  return PRACTICE_BY_ID[id] ?? null;
}
export function readPracticeStart(
  tags: string[] | null | undefined,
): Date | null {
  const s = tagS(tags, PRACTICE_STARTED_TAG);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** Days the client has been on their current practice. Null if no practice. */
export function daysOnPractice(tags: string[] | null | undefined): number | null {
  const start = readPracticeStart(tags);
  if (!start) return null;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}
/** Is the 2-week window up (time to assign next practice)? */
export function isPracticeWindowDone(
  tags: string[] | null | undefined,
): boolean {
  const d = daysOnPractice(tags);
  return d != null && d >= PRACTICE_WINDOW_DAYS;
}
export function readCalorieTarget(tags: string[] | null | undefined) {
  return tagN(tags, CALORIES_TAG);
}
export function readProteinTarget(tags: string[] | null | undefined) {
  return tagN(tags, PROTEIN_TAG);
}
export function readCarbsTarget(tags: string[] | null | undefined) {
  return tagN(tags, CARBS_TAG);
}
export function readFatsTarget(tags: string[] | null | undefined) {
  return tagN(tags, FATS_TAG);
}
export function readCurrentWeight(tags: string[] | null | undefined) {
  return tagN(tags, WEIGHT_LB_TAG);
}
export function readGoalWeight(tags: string[] | null | undefined) {
  return tagN(tags, GOAL_WEIGHT_TAG);
}
export function readStartingWeight(tags: string[] | null | undefined) {
  return tagN(tags, STARTING_WEIGHT_TAG);
}

/** How far along is this client toward their goal weight? Returns a value
 *  in [0,1] for the green-bar progress display on the practice page. */
export function computeProgressToGoal(
  starting: number | null,
  current: number | null,
  goal: number | null,
): number | null {
  if (starting === null || current === null || goal === null) return null;
  if (starting === goal) return 1;
  const total = starting - goal; // positive if fat-loss, negative if muscle-gain
  const done = starting - current;
  if (total === 0) return 1;
  const pct = done / total;
  return Math.max(0, Math.min(1, pct));
}

// Check-in row — backed by the nutrition_check_ins table. Body
// measurements added in migration 34.
export interface CheckInRow {
  id: string;
  trainer_id: string;
  client_id: string;
  week_starting: string; // YYYY-MM-DD
  weight_lb: number | null;
  body_fat_pct: number | null;
  // Migration 34
  waist_in: number | null;
  hip_in: number | null;
  chest_in: number | null;
  photo_url: string | null;
  // /Migration 34
  energy_1_5: number | null;
  hunger_1_5: number | null;
  sleep_hours_avg: number | null;
  compliance_pct: number | null;
  client_notes: string | null;
  coach_reply: string | null;
  status: 'pending' | 'reviewed';
  submitted_at: string;
  reviewed_at: string | null;
}

// Coach ↔ client message — backed by nutrition_messages (migration 33).
export interface MessageRow {
  id: string;
  trainer_id: string;
  client_id: string;
  sender: 'coach' | 'client';
  body: string;
  read_at: string | null;
  created_at: string;
}

export function relativeWhen(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  const days = Math.floor(ms / day);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
}
