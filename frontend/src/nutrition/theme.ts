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

// ── Methodology re-exports ───────────────────────────────────────────
// The actual habit/practice/skill data lives in lib/methodologies.ts.
// theme.ts re-exports the union of ALL methodologies so existing
// lookups (e.g. PRACTICE_BY_ID) work regardless of which methodology
// a particular client was assigned under. The active methodology for
// the coach is read via useActiveMethodology() (defined below).
import {
  METHODOLOGIES,
  METHODOLOGY_BY_ID,
  DEFAULT_METHODOLOGY_ID,
  type Methodology,
  type MethodologySkill,
  type MethodologyPractice,
} from './lib/methodologies';

export {
  METHODOLOGIES,
  METHODOLOGY_BY_ID,
  DEFAULT_METHODOLOGY_ID,
  type Methodology,
};

// Re-export under the original names so existing code keeps compiling.
export type NutritionSkill = MethodologySkill;
export type NutritionPractice = MethodologyPractice;

// ── Active methodology hook ──────────────────────────────────────────
// Each coach picks ONE methodology for their account. We persist the
// choice in localStorage (and write it through to trainers.tags as
// `method:<id>` so it follows them across devices). The Habit Library,
// Add-client modal, AskCoach chatbot, and home page copy all read this.
const METHODOLOGY_KEY = 'nutrition-methodology';
const METHODOLOGY_TAG = 'method:';

function readMethodologyFromStorage(): Methodology['id'] {
  if (typeof window === 'undefined') return DEFAULT_METHODOLOGY_ID;
  const stored = window.localStorage.getItem(METHODOLOGY_KEY);
  if (stored && stored in METHODOLOGY_BY_ID) return stored as Methodology['id'];
  return DEFAULT_METHODOLOGY_ID;
}

export function useActiveMethodology(): [Methodology, (id: Methodology['id']) => void] {
  const [id, setId] = useState<Methodology['id']>(readMethodologyFromStorage);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(METHODOLOGY_KEY, id);
      // Notify other components in the same tab
      window.dispatchEvent(new CustomEvent('methodology:changed', { detail: id }));
    }
  }, [id]);
  // Listen for changes from other components (e.g. settings page)
  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent).detail as Methodology['id'];
      if (detail && detail in METHODOLOGY_BY_ID) setId(detail);
    }
    window.addEventListener('methodology:changed', onChange as EventListener);
    return () => window.removeEventListener('methodology:changed', onChange as EventListener);
  }, []);
  const m = METHODOLOGY_BY_ID[id] ?? METHODOLOGY_BY_ID[DEFAULT_METHODOLOGY_ID];
  return [m, setId];
}

export function readMethodologyFromTags(tags: string[] | null | undefined): Methodology['id'] {
  if (!tags) return DEFAULT_METHODOLOGY_ID;
  for (const t of tags) {
    if (t.startsWith(METHODOLOGY_TAG)) {
      const id = t.slice(METHODOLOGY_TAG.length);
      if (id in METHODOLOGY_BY_ID) return id as Methodology['id'];
    }
  }
  return DEFAULT_METHODOLOGY_ID;
}
export { METHODOLOGY_TAG };

// ── Aggregated catalogs (across ALL methodologies) ────────────────
// These exports are the union of every methodology's skills and
// practices. We aggregate so that existing tag-based lookups
// (clients.tags `practice:eat-slowly`) keep resolving even after the
// coach switches methodology. To get just the active methodology's
// data, call useActiveMethodology() in a component.
//
// Skill IDs are deduplicated by id — if two methodologies share a
// skill id (none currently do), the first wins.
function _aggregateSkills(): NutritionSkill[] {
  const seen = new Set<string>();
  const out: NutritionSkill[] = [];
  for (const m of METHODOLOGIES) {
    for (const s of m.skills) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
      }
    }
  }
  return out;
}
function _aggregatePractices(): NutritionPractice[] {
  const seen = new Set<string>();
  const out: NutritionPractice[] = [];
  for (const m of METHODOLOGIES) {
    for (const p of m.practices) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}

export const NUTRITION_SKILLS: NutritionSkill[] = _aggregateSkills();

// NutritionLevel — re-exported from the methodology library so all
// methodologies can use it. Each methodology defines its own level
// labels (e.g. PN: "Level 1 — Foundational Habits"; IE: "Phase 1 —
// Rebuild trust"; RP: "Level 1 — Macro Foundations").
export type NutritionLevel = Methodology['levels'][number];

// The default Level 1 + Level 2 templates — used when a methodology
// doesn't override them, and exported here for backwards compatibility
// with code that imports NUTRITION_LEVELS directly. To get the
// active methodology's labelled levels, call useActiveMethodology().
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

// NUTRITION_PRACTICES is the union of every methodology's practices,
// keyed by id (deduped). Lookups by client tag still work even after
// the coach switches methodology. For just the active methodology's
// practices, call useActiveMethodology().
export const NUTRITION_PRACTICES: NutritionPractice[] = _aggregatePractices();

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
