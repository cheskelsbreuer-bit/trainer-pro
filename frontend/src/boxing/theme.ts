// Boxing tokens + data helpers. Deliberately NOT a UI primitives library:
// the dojo's mistake was sharing primitives between apps. Each boxing
// page composes its own JSX. This file is data-shaped only:
//   - color tokens (CSS-variable strings — actual values in index.css)
//   - tier system + weight class catalog
//   - fighter-tag helpers
//   - W-L-D record computation
//   - theme mode hook (dark/light)
//
// Design intent for the visual language:
//   - Fight-poster aesthetic: pure black sheet, bone-white type, red.
//   - HUGE numerals as decoration (records, weights, dates).
//   - Newsprint serif moments mixed with condensed display sans.
//   - Blue is reserved for the literal "blue corner" of a single fight
//     comparison, NOT a co-brand color.

import { useEffect, useState } from 'react';

export const C = {
  ink: 'var(--boxing-ink)',
  inkSoft: 'var(--boxing-ink-soft)',
  paper: 'var(--boxing-paper)',
  paperSoft: 'var(--boxing-paper-soft)',
  rule: 'var(--boxing-rule)',
  text: 'var(--boxing-text)',
  textDim: 'var(--boxing-text-dim)',
  textFaint: 'var(--boxing-text-faint)',
  red: 'var(--boxing-red)',
  redDeep: 'var(--boxing-red-deep)',
  blueCorner: 'var(--boxing-blue-corner)',
  blueCornerDeep: 'var(--boxing-blue-corner-deep)',
  beltGold: 'var(--boxing-belt-gold)',
  beltGoldDeep: 'var(--boxing-belt-gold-deep)',
  ok: 'var(--boxing-ok)',
  warn: 'var(--boxing-warn)',
  danger: 'var(--boxing-danger)',
} as const;

// Display font — Bebas Neue is loaded globally; combine with a slab for
// "fight poster" feel when used heavily. Keep this in one place so every
// boxing component pulls from here.
export const DISPLAY_FONT =
  "'Bebas Neue', 'Oswald', 'Arial Narrow', system-ui, sans-serif";
export const NEWSPRINT_FONT =
  "'Bebas Neue', 'Georgia', serif";

// ── Tier system ──────────────────────────────────────────────────────
export interface FighterTier {
  id: string;
  label: string;
  color: string;
  description: string;
}
export const FIGHTER_TIERS: FighterTier[] = [
  {
    id: 'rec',
    label: 'Recreational',
    color: '#9B9B95',
    description: 'Fitness boxers. Bag, mitts, conditioning — no sparring or competition.',
  },
  {
    id: 'amateur',
    label: 'Amateur',
    color: '#1E88E5',
    description: 'USA Boxing registered. Eligible for sparring, smokers, amateur bouts.',
  },
  {
    id: 'pro',
    label: 'Pro',
    color: '#E10F1F',
    description: 'Licensed professional. Camps, weight cuts, fight cards.',
  },
];

// ── Weight classes ───────────────────────────────────────────────────
export interface WeightClass {
  id: string;
  label: string;
  lbsMax: number | null;
}
export const WEIGHT_CLASSES: WeightClass[] = [
  { id: 'atomweight', label: 'Atomweight', lbsMax: 105 },
  { id: 'jr-flyweight', label: 'Jr. Flyweight', lbsMax: 112 },
  { id: 'flyweight', label: 'Flyweight', lbsMax: 119 },
  { id: 'bantamweight', label: 'Bantamweight', lbsMax: 125 },
  { id: 'featherweight', label: 'Featherweight', lbsMax: 132 },
  { id: 'lightweight', label: 'Lightweight', lbsMax: 141 },
  { id: 'welterweight', label: 'Welterweight', lbsMax: 152 },
  { id: 'middleweight', label: 'Middleweight', lbsMax: 165 },
  { id: 'light-heavyweight', label: 'Light Heavyweight', lbsMax: 178 },
  { id: 'cruiserweight', label: 'Cruiserweight', lbsMax: 201 },
  { id: 'heavyweight', label: 'Heavyweight', lbsMax: null },
];

// Tag prefixes — boxing-specific attributes stored on clients.tags.
export const TIER_TAG = 'tier:';
export const WEIGHT_TAG = 'weight:';
export const STANCE_TAG = 'stance:';

export type Stance = 'orthodox' | 'southpaw';

export function readTier(tags: string[] | null | undefined): FighterTier {
  if (!tags) return FIGHTER_TIERS[0];
  for (const t of tags) {
    if (t.startsWith(TIER_TAG)) {
      const id = t.slice(TIER_TAG.length);
      const found = FIGHTER_TIERS.find((x) => x.id === id);
      if (found) return found;
    }
  }
  return FIGHTER_TIERS[0];
}
export function readWeight(tags: string[] | null | undefined): WeightClass | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(WEIGHT_TAG)) {
      const id = t.slice(WEIGHT_TAG.length);
      const w = WEIGHT_CLASSES.find((x) => x.id === id);
      if (w) return w;
    }
  }
  return null;
}
export function readStance(tags: string[] | null | undefined): Stance | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(STANCE_TAG)) {
      const v = t.slice(STANCE_TAG.length);
      if (v === 'orthodox' || v === 'southpaw') return v;
    }
  }
  return null;
}

// ── W-L-D record ─────────────────────────────────────────────────────
export interface FightRow {
  id: string;
  fighter_id: string;
  opponent_name: string | null;
  starts_at: string;
  result: 'win' | 'loss' | 'draw' | null;
  decision: string | null;
  venue: string | null;
  notes: string | null;
}
export interface Record {
  w: number;
  l: number;
  d: number;
  ko: number;
  total: number;
}
export function computeRecord(fights: FightRow[]): Record {
  let w = 0, l = 0, d = 0, ko = 0;
  for (const f of fights) {
    if (f.result === 'win') {
      w++;
      if (f.decision === 'KO' || f.decision === 'TKO') ko++;
    } else if (f.result === 'loss') l++;
    else if (f.result === 'draw') d++;
  }
  return { w, l, d, ko, total: w + l + d };
}
export function recordString(r: Record): string {
  return `${r.w}-${r.l}-${r.d}`;
}

// ── Theme mode ───────────────────────────────────────────────────────
export type ThemeMode = 'dark' | 'light';
const THEME_KEY = 'boxing-theme';

export function useBoxingTheme(): [ThemeMode, () => void] {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, mode);
    }
  }, [mode]);
  return [mode, () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))];
}
