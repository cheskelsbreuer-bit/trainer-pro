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

export const SERIF_FONT =
  "'Cormorant Garamond', 'Cormorant', Georgia, 'Times New Roman', serif";
export const BODY_FONT =
  "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

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
export const GOAL_TAG = 'goal:'; // 'fat-loss' | 'maintenance' | 'muscle-gain' | 'health'
export const CALORIES_TAG = 'kcal:'; // daily target, e.g. 'kcal:2200'
export const PROTEIN_TAG = 'protein:'; // grams/day
export const CARBS_TAG = 'carbs:';
export const FATS_TAG = 'fats:';
export const WEIGHT_LB_TAG = 'weightlb:'; // shared concept with boxing — but used differently here
export const GOAL_WEIGHT_TAG = 'goalweightlb:';
export const STARTING_WEIGHT_TAG = 'startingweightlb:';

export const NUTRITION_GOALS = [
  { id: 'fat-loss', label: 'Fat loss', color: '#D87456' },
  { id: 'maintenance', label: 'Maintenance', color: '#6B8E5A' },
  { id: 'muscle-gain', label: 'Muscle gain', color: '#D9A441' },
  { id: 'health', label: 'General health', color: '#8B7E6A' },
];

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

// Check-in row — backed by the nutrition_check_ins table.
export interface CheckInRow {
  id: string;
  trainer_id: string;
  client_id: string;
  week_starting: string; // YYYY-MM-DD
  weight_lb: number | null;
  body_fat_pct: number | null;
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
