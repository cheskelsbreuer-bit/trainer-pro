// Dojo design tokens. The martial-arts app deliberately breaks from the
// rest of Trainer Pro's pastel-rounded look. The aesthetic borrows from
// real dojo software (Kicksite, Martialytics, Zen Planner) and from the
// traditional dojo color story: deep charcoal interior, crimson accent,
// gold for honor/rank, parchment for text.
//
// Belt sequences come from the major arts. The dojo Settings page lets the
// sensei pick which system applies — Karate (10 ranks), Taekwondo (10 ranks),
// BJJ (5 adult ranks), Judo (6 ranks), Krav Maga (5 levels).

export const DOJO_COLORS = {
  // Full-page surfaces
  bgPage: '#0A0A0B', // near-black, with a tiny hint of warmth
  bgPanel: '#16161A', // raised surfaces (cards, sidebar)
  bgPanelHover: '#1F1F25',
  bgInset: '#0E0E11', // sunken (tables, code blocks)
  divider: '#2A2A31',

  // Type
  textPrimary: '#F5F5F4', // off-white parchment
  textSecondary: '#A1A1AA', // zinc-400
  textMuted: '#71717A', // zinc-500

  // Brand — crimson dojo red
  brand: '#DC2626', // red-600
  brandHover: '#B91C1C', // red-700
  brandSoft: '#7F1D1D', // red-900 for filled chips on dark
  brandRing: 'rgba(220, 38, 38, 0.4)',

  // Honor — gold for rank highlights and key totals
  gold: '#F59E0B', // amber-500
  goldSoft: '#78350F', // amber-900

  // Status
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
} as const;

export interface Belt {
  /** Internal id, e.g. 'white', 'green', 'black-1' */
  id: string;
  /** Display name shown to the sensei: 'Green Belt', 'Black Belt — 1st Dan' */
  label: string;
  /** Hex of the visible belt color */
  color: string;
  /** Whether this is post-black-belt (dan rank). Drives gold dan-bar styling. */
  dan?: boolean;
}

// Karate (most common) — 9 kyu colors + black. We model the first three dan
// ranks; higher dans can be added on the Settings page once needed.
export const KARATE_BELTS: Belt[] = [
  { id: 'white', label: 'White Belt', color: '#F5F5F4' },
  { id: 'yellow', label: 'Yellow Belt', color: '#FACC15' },
  { id: 'orange', label: 'Orange Belt', color: '#FB923C' },
  { id: 'green', label: 'Green Belt', color: '#22C55E' },
  { id: 'blue', label: 'Blue Belt', color: '#3B82F6' },
  { id: 'purple', label: 'Purple Belt', color: '#A855F7' },
  { id: 'brown', label: 'Brown Belt', color: '#92400E' },
  { id: 'red', label: 'Red Belt', color: '#DC2626' },
  { id: 'black-1', label: 'Black Belt — 1st Dan', color: '#0A0A0B', dan: true },
  { id: 'black-2', label: 'Black Belt — 2nd Dan', color: '#0A0A0B', dan: true },
  { id: 'black-3', label: 'Black Belt — 3rd Dan', color: '#0A0A0B', dan: true },
];

// Brazilian Jiu-Jitsu — long ranks, few colors. Stripes happen between belts.
export const BJJ_BELTS: Belt[] = [
  { id: 'white', label: 'White Belt', color: '#F5F5F4' },
  { id: 'blue', label: 'Blue Belt', color: '#3B82F6' },
  { id: 'purple', label: 'Purple Belt', color: '#A855F7' },
  { id: 'brown', label: 'Brown Belt', color: '#92400E' },
  { id: 'black', label: 'Black Belt', color: '#0A0A0B', dan: true },
];

// Taekwondo (WT/Kukkiwon-style) — most common Gup/Dan sequence.
export const TKD_BELTS: Belt[] = [
  { id: 'white', label: 'White Belt', color: '#F5F5F4' },
  { id: 'yellow', label: 'Yellow Belt', color: '#FACC15' },
  { id: 'green', label: 'Green Belt', color: '#22C55E' },
  { id: 'blue', label: 'Blue Belt', color: '#3B82F6' },
  { id: 'red', label: 'Red Belt', color: '#DC2626' },
  { id: 'black-1', label: 'Black Belt — 1st Dan', color: '#0A0A0B', dan: true },
  { id: 'black-2', label: 'Black Belt — 2nd Dan', color: '#0A0A0B', dan: true },
];

export const BELT_SYSTEMS = {
  karate: { label: 'Karate', belts: KARATE_BELTS },
  bjj: { label: 'Brazilian Jiu-Jitsu', belts: BJJ_BELTS },
  taekwondo: { label: 'Taekwondo', belts: TKD_BELTS },
} as const;

export type BeltSystemId = keyof typeof BELT_SYSTEMS;

// Default system if the sensei hasn't picked one yet.
export const DEFAULT_BELT_SYSTEM: BeltSystemId = 'karate';

/**
 * A student's belt is stored as a tag on their client row, formatted
 * `belt:<id>`. Family group as `family:<slug>`. Discipline preference and
 * other dojo settings live on the trainer row (settings page).
 */
export const BELT_TAG_PREFIX = 'belt:';
export const FAMILY_TAG_PREFIX = 'family:';

export function readBeltFromTags(
  tags: string[] | null | undefined,
  system: BeltSystemId,
): Belt | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(BELT_TAG_PREFIX)) {
      const id = t.slice(BELT_TAG_PREFIX.length);
      const belt = BELT_SYSTEMS[system].belts.find((b) => b.id === id);
      if (belt) return belt;
    }
  }
  return null;
}

export function readFamilyFromTags(tags: string[] | null | undefined): string | null {
  if (!tags) return null;
  for (const t of tags) {
    if (t.startsWith(FAMILY_TAG_PREFIX)) return t.slice(FAMILY_TAG_PREFIX.length);
  }
  return null;
}
