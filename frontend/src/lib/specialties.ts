// Single source of truth for specialty pills + the toolkit each one unlocks.
//
// Keep this in sync with what supabase stores in `trainers.specialties` (text[]).
// Slugs MUST match across:
//   - OnboardingWizard step 4
//   - DirectorySettingsCard
//   - FindTrainersPage filter
//   - Dashboard "Your toolkit" widget
//
// When you add a new specialty:
//   1. Add an entry below
//   2. Pick what tools that specialty should surface on the dashboard
//   3. (No DB migration needed — it's a free-form text[])

export interface SpecialtyOption {
  val: string;
  label: string;
  emoji: string;
}

export const SPECIALTIES: SpecialtyOption[] = [
  { val: 'strength', label: 'Strength training', emoji: '🏋️' },
  { val: 'weight_loss', label: 'Weight loss', emoji: '⚖️' },
  { val: 'general_fitness', label: 'General fitness', emoji: '💪' },
  { val: 'bodybuilding', label: 'Bodybuilding', emoji: '💯' },
  { val: 'athletic_performance', label: 'Athletic performance', emoji: '🏃' },
  { val: 'mobility_rehab', label: 'Mobility & rehab', emoji: '🧘' },
  { val: 'yoga_pilates', label: 'Yoga / pilates', emoji: '🪷' },
  { val: 'group_classes', label: 'Group classes', emoji: '👥' },
  { val: 'sports_specific', label: 'Sports-specific', emoji: '⚽' },
  { val: 'martial_arts', label: 'Martial arts', emoji: '🥋' },
  { val: 'boxing_kickboxing', label: 'Boxing / kickboxing', emoji: '🥊' },
  { val: 'senior_fitness', label: 'Senior fitness', emoji: '🌿' },
  { val: 'pre_postnatal', label: 'Pre / postnatal', emoji: '🤱' },
  { val: 'nutrition_coaching', label: 'Nutrition coaching', emoji: '🥗' },
  { val: 'childcare', label: 'Babysitting / childcare', emoji: '🧸' },
];

export const SPECIALTIES_BY_VAL: Record<string, SpecialtyOption> = SPECIALTIES.reduce(
  (acc, s) => {
    acc[s.val] = s;
    return acc;
  },
  {} as Record<string, SpecialtyOption>,
);

// ─────────────── Toolkit / mini-apps each specialty unlocks ───────────────
// Drives the "Your toolkit" widget on the Dashboard. Each tool has a status —
// `live` shows up as a clickable card, `soon` shows up as a coming-soon hint.
// The same tool can appear under multiple specialties; we de-dupe at render.

export type ToolStatus = 'live' | 'soon';

export interface SpecialtyTool {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  status: ToolStatus;
  href?: string;
}

const TOOL_LIBRARY: Record<string, SpecialtyTool> = {
  group_sessions: {
    id: 'group_sessions',
    title: 'Group sessions',
    blurb: 'Schedule one slot, fill it with multiple attendees. Per-head package billing.',
    emoji: '👥',
    status: 'soon',
  },
  class_recurring: {
    id: 'class_recurring',
    title: 'Recurring class scheduler',
    blurb: 'Repeat your weekly classes automatically. Public sign-ups, waitlist, capacity caps.',
    emoji: '📅',
    status: 'soon',
  },
  pr_tracker: {
    id: 'pr_tracker',
    title: 'Personal records (PR) tracker',
    blurb: 'Track every client\'s big-three lifts. Auto-detects new PRs from session logs.',
    emoji: '🏆',
    status: 'soon',
  },
  periodization: {
    id: 'periodization',
    title: 'Program periodization',
    blurb: 'Strength blocks, deload weeks, peaking phases — built into the workout planner.',
    emoji: '📈',
    status: 'soon',
  },
  meal_plans: {
    id: 'meal_plans',
    title: 'Meal plans & macros',
    blurb: 'Build per-client meal plans. Macro targets. Send them to the client portal.',
    emoji: '🥗',
    status: 'soon',
  },
  habit_tracker: {
    id: 'habit_tracker',
    title: 'Habits & daily check-ins',
    blurb: 'Yes/no habits per client (water, steps, sleep). Streaks for accountability.',
    emoji: '✅',
    status: 'soon',
  },
  belt_progression: {
    id: 'belt_progression',
    title: 'Belt / rank progression',
    blurb: 'Track each student\'s belt level, stripes, time-in-grade, next-test eligibility.',
    emoji: '🥋',
    status: 'soon',
  },
  fight_log: {
    id: 'fight_log',
    title: 'Fight / sparring log',
    blurb: 'Log rounds, partners, drills. Spot patterns across a fighter\'s training cycle.',
    emoji: '🥊',
    status: 'soon',
  },
  par_q_plus: {
    id: 'par_q_plus',
    title: 'Senior-friendly intake',
    blurb: 'Extended PAR-Q+ with cardiovascular, balance, and medication checks.',
    emoji: '🌿',
    status: 'soon',
  },
  prenatal_intake: {
    id: 'prenatal_intake',
    title: 'Pre/postnatal intake',
    blurb: 'Trimester-aware screening, doctor clearance, contraindicated movement flags.',
    emoji: '🤱',
    status: 'soon',
  },
  body_comp: {
    id: 'body_comp',
    title: 'Body comp tracking',
    blurb: 'Weight, measurements, photos with side-by-side comparison.',
    emoji: '📸',
    status: 'live',
    href: '/progress',
  },
  workout_builder: {
    id: 'workout_builder',
    title: 'Workout builder',
    blurb: 'Templates, per-client plans, sets/reps/weights, video links.',
    emoji: '🏋️',
    status: 'live',
    href: '/workouts',
  },
  public_booking: {
    id: 'public_booking',
    title: 'Public booking page',
    blurb: 'Self-serve link clients use to book sessions or classes.',
    emoji: '🔗',
    status: 'live',
    href: '/settings',
  },
  mobility_assessments: {
    id: 'mobility_assessments',
    title: 'Mobility assessments',
    blurb: 'FMS-style movement screen, asymmetry tracking, corrective exercise prescriptions.',
    emoji: '🧘',
    status: 'soon',
  },
  athlete_testing: {
    id: 'athlete_testing',
    title: 'Athlete testing battery',
    blurb: '40-yd dash, vertical, broad jump — store and trend results across testing days.',
    emoji: '⚡',
    status: 'soon',
  },
};

export const SPECIALTY_TOOLS: Record<string, string[]> = {
  strength: ['workout_builder', 'pr_tracker', 'periodization', 'body_comp'],
  weight_loss: ['body_comp', 'meal_plans', 'habit_tracker'],
  general_fitness: ['workout_builder', 'public_booking', 'habit_tracker'],
  bodybuilding: ['pr_tracker', 'periodization', 'body_comp', 'meal_plans'],
  athletic_performance: ['athlete_testing', 'periodization', 'pr_tracker'],
  mobility_rehab: ['mobility_assessments', 'workout_builder'],
  yoga_pilates: ['class_recurring', 'group_sessions', 'public_booking'],
  group_classes: ['group_sessions', 'class_recurring', 'public_booking'],
  sports_specific: ['athlete_testing', 'periodization', 'pr_tracker'],
  martial_arts: ['belt_progression', 'fight_log', 'group_sessions'],
  boxing_kickboxing: ['fight_log', 'group_sessions', 'periodization'],
  senior_fitness: ['par_q_plus', 'mobility_assessments', 'habit_tracker'],
  pre_postnatal: ['prenatal_intake', 'workout_builder', 'mobility_assessments'],
  nutrition_coaching: ['meal_plans', 'habit_tracker', 'body_comp'],
};

export function toolsForSpecialties(slugs: string[]): SpecialtyTool[] {
  const seen = new Set<string>();
  const out: SpecialtyTool[] = [];
  for (const slug of slugs) {
    for (const toolId of SPECIALTY_TOOLS[slug] ?? []) {
      if (seen.has(toolId)) continue;
      const tool = TOOL_LIBRARY[toolId];
      if (!tool) continue;
      seen.add(toolId);
      out.push(tool);
    }
  }
  return out;
}
