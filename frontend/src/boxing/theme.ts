// Boxing gym design tokens. The boxing app deliberately breaks from BOTH
// Trainer Pro's pastel UI and the dojo's crimson-gold dojo aesthetic.
// Aesthetic borrows from real boxing software (Mat Track, Clubworx,
// XEPOS, Wodify combat) plus the visual language every fighter knows
// from the ring itself: red corner / blue corner / championship gold.
//
// Tier system (replaces "belts" — boxing has no traditional belts):
//   Recreational → Amateur → Pro. Each tier has typical training
//   commitments and (for Amateur+) USA Boxing weight-class registration.

import { useEffect, useState } from 'react';

// CSS variables live in index.css under .boxing-theme-dark / .boxing-theme-light.
// BoxingLayout puts the active class on its root element.
export const BOXING_COLORS = {
  bgPage: 'var(--boxing-bg-page)',
  bgPanel: 'var(--boxing-bg-panel)',
  bgPanelHover: 'var(--boxing-bg-panel-hover)',
  bgInset: 'var(--boxing-bg-inset)',
  divider: 'var(--boxing-divider)',

  textPrimary: 'var(--boxing-text-primary)',
  textSecondary: 'var(--boxing-text-secondary)',
  textMuted: 'var(--boxing-text-muted)',

  // Brand red — the gym's identity color. Equivalent to "red corner".
  red: 'var(--boxing-red)',
  redSoft: 'var(--boxing-red-soft)',
  redRing: 'var(--boxing-red-ring)',
  // Blue corner — the visual counterpart, used for amateur/secondary accents.
  blue: 'var(--boxing-blue)',
  blueSoft: 'var(--boxing-blue-soft)',
  blueRing: 'var(--boxing-blue-ring)',
  // Championship gold — record callouts, big numbers, ring of honor.
  gold: 'var(--boxing-gold)',
  goldSoft: 'var(--boxing-gold-soft)',

  onRed: 'var(--boxing-on-red)',
  onBlue: 'var(--boxing-on-blue)',
  onGold: 'var(--boxing-on-gold)',

  ok: 'var(--boxing-ok)',
  warn: 'var(--boxing-warn)',
  danger: 'var(--boxing-danger)',
} as const;

// Tier classifications. Mirrors how real boxing gyms classify their
// roster: Recreational (fitness), Amateur (USA Boxing registered),
// Pro (managed pro fighter). Each tier drives a different visual color.
export interface FighterTier {
  id: string;
  label: string;
  /** Visible accent color for this tier in chips, badges, cards. */
  color: string;
  /** Short blurb shown on the Tiers page describing this group. */
  description: string;
}

export const FIGHTER_TIERS: FighterTier[] = [
  {
    id: 'rec',
    label: 'Recreational',
    color: '#94A3B8',
    description:
      'Fitness boxers — bag, mitts, conditioning. No sparring or competition track.',
  },
  {
    id: 'amateur',
    label: 'Amateur',
    color: '#2563EB',
    description:
      'USA Boxing registered. Eligible for sparring, smokers, and amateur bouts.',
  },
  {
    id: 'pro',
    label: 'Pro',
    color: '#DC2626',
    description:
      'Licensed professional fighter. Managed for camps, weight cuts, fight cards.',
  },
];

// Weight classes — USA Boxing amateur/pro standard set used by most gyms.
// Limits are in pounds. Open / heavyweight has no upper bound.
export interface WeightClass {
  id: string;
  label: string;
  /** Upper limit in pounds. null = heavyweight (no cap). */
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

// Tag prefixes used on clients.tags to store boxing-specific attributes.
export const TIER_TAG_PREFIX = 'tier:';
export const WEIGHT_TAG_PREFIX = 'weight:';
export const STANCE_TAG_PREFIX = 'stance:'; // 'orthodox' | 'southpaw'

export type Stance = 'orthodox' | 'southpaw';

export function readTierFromTags(tags: string[] | null | undefined): FighterTier {
  if (!tags) return FIGHTER_TIERS[0];
  for (const t of tags) {
    if (t.startsWith(TIER_TAG_PREFIX)) {
      const id = t.slice(TIER_TAG_PREFIX.length);
      const tier = FIGHTER_TIERS.find((x) => x.id === id);
      if (tier) return tier;
    }
  }
  return FIGHTER_TIERS[0];
}

export function readWeightFromTags(
  tags: string[] | null | undefined,
): WeightClass | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(WEIGHT_TAG_PREFIX)) {
      const id = t.slice(WEIGHT_TAG_PREFIX.length);
      const w = WEIGHT_CLASSES.find((x) => x.id === id);
      if (w) return w;
    }
  }
  return null;
}

export function readStanceFromTags(
  tags: string[] | null | undefined,
): Stance | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(STANCE_TAG_PREFIX)) {
      const v = t.slice(STANCE_TAG_PREFIX.length);
      if (v === 'orthodox' || v === 'southpaw') return v;
    }
  }
  return null;
}

// ── Theme mode (dark / light) ───────────────────────────────────────
export type BoxingThemeMode = 'dark' | 'light';
const THEME_STORAGE_KEY = 'boxing-theme';

export function readBoxingThemePreference(): BoxingThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}
export function writeBoxingThemePreference(mode: BoxingThemeMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

// ── Fighter W-L-D record helpers ────────────────────────────────────
// The record is computed from the `boxing_fights` table (one row per bout)
// — see supabase/29_boxing_fights.sql. Each fight row has a `result` of
// 'win' / 'loss' / 'draw' / null (null = scheduled, not yet contested).
export interface FightRow {
  id: string;
  fighter_id: string;
  opponent_name: string | null;
  starts_at: string;
  result: 'win' | 'loss' | 'draw' | null;
  decision: string | null; // KO / TKO / UD / SD / MD / draw
  venue: string | null;
  notes: string | null;
}

export interface FighterRecord {
  wins: number;
  losses: number;
  draws: number;
  /** Number of wins by knockout (KO/TKO) — boxing brag metric. */
  knockouts: number;
  total: number;
}

export function computeRecord(fights: FightRow[]): FighterRecord {
  let wins = 0,
    losses = 0,
    draws = 0,
    knockouts = 0;
  for (const f of fights) {
    if (f.result === 'win') {
      wins++;
      if (f.decision === 'KO' || f.decision === 'TKO') knockouts++;
    } else if (f.result === 'loss') losses++;
    else if (f.result === 'draw') draws++;
  }
  return { wins, losses, draws, knockouts, total: wins + losses + draws };
}

export function formatRecord(r: FighterRecord, withKO = true): string {
  const base = `${r.wins}-${r.losses}-${r.draws}`;
  if (withKO && r.knockouts > 0) return `${base} (${r.knockouts} KO)`;
  return base;
}

// ── Stored theme + active tier preference (placeholder hook) ──────────
const ACTIVE_TIER_KEY = 'boxing-default-tier';
export function readActiveDefaultTier(): string {
  if (typeof window === 'undefined') return 'rec';
  return window.localStorage.getItem(ACTIVE_TIER_KEY) ?? 'rec';
}
export function writeActiveDefaultTier(id: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_TIER_KEY, id);
}

/** React hook for the theme mode so every boxing page can read + flip it. */
export function useBoxingTheme(): [BoxingThemeMode, () => void] {
  const [mode, setMode] = useState<BoxingThemeMode>(() => readBoxingThemePreference());
  useEffect(() => {
    writeBoxingThemePreference(mode);
  }, [mode]);
  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  return [mode, toggle];
}
