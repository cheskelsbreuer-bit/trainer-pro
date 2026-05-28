// Dojo design tokens. The martial-arts app deliberately breaks from the
// rest of Trainer Pro's pastel-rounded look. The aesthetic borrows from
// real dojo software (Kicksite, Martialytics, Zen Planner) and from the
// traditional dojo color story: deep charcoal interior, crimson accent,
// gold for honor/rank, parchment for text.
//
// Belt sequences come from the major arts. The dojo Settings page lets the
// sensei pick which system applies — Karate (10 ranks), Taekwondo (10 ranks),
// BJJ (5 adult ranks), Judo (6 ranks), Krav Maga (5 levels).

// Color tokens are CSS variables — actual values live in index.css under
// the .dojo-theme-dark and .dojo-theme-light classes. DojoLayout sets the
// active class on its root element based on the user's preference, so
// the same component code lights up correctly in either mode.
export const DOJO_COLORS = {
  bgPage: 'var(--dojo-bg-page)',
  bgPanel: 'var(--dojo-bg-panel)',
  bgPanelHover: 'var(--dojo-bg-panel-hover)',
  bgInset: 'var(--dojo-bg-inset)',
  divider: 'var(--dojo-divider)',

  textPrimary: 'var(--dojo-text-primary)',
  textSecondary: 'var(--dojo-text-secondary)',
  textMuted: 'var(--dojo-text-muted)',

  // Brand accent honors the coach's chosen primary; falls back to the
  // signature dojo crimson. (Dark/crimson shell stays fixed.)
  brand: 'var(--tp-primary, var(--dojo-brand))',
  brandHover: 'var(--tp-primary-deep, var(--dojo-brand-hover))',
  brandSoft: 'var(--tp-primary-soft, var(--dojo-brand-soft))',
  brandRing: 'var(--dojo-brand-ring)',

  gold: 'var(--dojo-gold)',
  goldSoft: 'var(--dojo-gold-soft)',
  /** Dark text used on gold-fill chips/buttons so the label stays legible. */
  goldText: 'var(--dojo-gold-text)',
  /** Text-on-gold for filled buttons — flips per theme so the contrast
   *  works in both dark and light modes (gold is amber in dark, brown in light). */
  onGold: 'var(--dojo-on-gold)',
  /** Text-on-brand — always white since brand is strong red in both modes. */
  onBrand: 'var(--dojo-on-brand)',

  ok: 'var(--dojo-ok)',
  warn: 'var(--dojo-warn)',
  danger: 'var(--dojo-danger)',
} as const;

export type DojoThemeMode = 'dark' | 'light';
const THEME_STORAGE_KEY = 'dojo-theme';
export function readDojoThemePreference(): DojoThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}
export function writeDojoThemePreference(mode: DojoThemeMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

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

// Judo (IJF) — six kyu colors + black for dan. Same root system as karate
// (Kano invented both grading systems) but the color sequence differs.
export const JUDO_BELTS: Belt[] = [
  { id: 'white', label: 'White Belt', color: '#F5F5F4' },
  { id: 'yellow', label: 'Yellow Belt', color: '#FACC15' },
  { id: 'orange', label: 'Orange Belt', color: '#FB923C' },
  { id: 'green', label: 'Green Belt', color: '#22C55E' },
  { id: 'blue', label: 'Blue Belt', color: '#3B82F6' },
  { id: 'brown', label: 'Brown Belt', color: '#92400E' },
  { id: 'black-1', label: 'Black Belt — 1st Dan', color: '#0A0A0B', dan: true },
];

// Krav Maga (most common Practitioner / Graduate / Expert system used by
// IKMF and Krav Maga Global). Krav doesn't use colored belts on the mat
// but the level structure is what dojos track.
export const KRAV_LEVELS: Belt[] = [
  { id: 'p1', label: 'Practitioner 1', color: '#94A3B8' },
  { id: 'p2', label: 'Practitioner 2', color: '#64748B' },
  { id: 'p3', label: 'Practitioner 3', color: '#475569' },
  { id: 'p4', label: 'Practitioner 4', color: '#334155' },
  { id: 'p5', label: 'Practitioner 5', color: '#1E293B' },
  { id: 'g1', label: 'Graduate 1', color: '#F59E0B', dan: true },
  { id: 'g2', label: 'Graduate 2', color: '#D97706', dan: true },
  { id: 'g3', label: 'Graduate 3', color: '#B45309', dan: true },
  { id: 'g4', label: 'Graduate 4', color: '#92400E', dan: true },
  { id: 'g5', label: 'Graduate 5', color: '#78350F', dan: true },
  { id: 'e1', label: 'Expert 1', color: '#0A0A0B', dan: true },
  { id: 'e2', label: 'Expert 2', color: '#0A0A0B', dan: true },
  { id: 'e3', label: 'Expert 3', color: '#0A0A0B', dan: true },
];

// MMA — no traditional belt system. Most gyms classify by experience tier
// (Fundamentals / Intermediate / Advanced / Competition / Pro) and fight
// record. We model the experience tier here; per-fighter record lives on
// the student profile.
export const MMA_LEVELS: Belt[] = [
  { id: 'fundamentals', label: 'Fundamentals', color: '#94A3B8' },
  { id: 'intermediate', label: 'Intermediate', color: '#3B82F6' },
  { id: 'advanced', label: 'Advanced', color: '#7C3AED' },
  { id: 'competition', label: 'Competition Team', color: '#DC2626' },
  { id: 'amateur', label: 'Amateur Fighter', color: '#B45309', dan: true },
  { id: 'pro', label: 'Pro Fighter', color: '#0A0A0B', dan: true },
];

export const BELT_SYSTEMS = {
  karate: { label: 'Karate', belts: KARATE_BELTS },
  bjj: { label: 'Brazilian Jiu-Jitsu', belts: BJJ_BELTS },
  taekwondo: { label: 'Taekwondo', belts: TKD_BELTS },
  judo: { label: 'Judo', belts: JUDO_BELTS },
  krav_maga: { label: 'Krav Maga', belts: KRAV_LEVELS },
  mma: { label: 'MMA', belts: MMA_LEVELS },
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

// ── Active belt system ────────────────────────────────────────────────
// Which discipline this dojo runs. Persisted in localStorage so the
// sensei's pick in Settings actually applies to the rest of the app.
// A future migration will move this onto the trainers row; for now
// per-browser persistence is the lowest-friction fix.
const BELT_SYSTEM_STORAGE_KEY = 'dojo-belt-system';

export function readActiveBeltSystem(): BeltSystemId {
  if (typeof window === 'undefined') return DEFAULT_BELT_SYSTEM;
  const stored = window.localStorage.getItem(BELT_SYSTEM_STORAGE_KEY);
  if (stored && stored in BELT_SYSTEMS) return stored as BeltSystemId;
  return DEFAULT_BELT_SYSTEM;
}

export function writeActiveBeltSystem(id: BeltSystemId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BELT_SYSTEM_STORAGE_KEY, id);
}

/** React hook — re-reads when the user changes the system in Settings.
 *  Other tabs/components see the change after their next render. */
import { useEffect, useState } from 'react';

export function useActiveBeltSystem(): [BeltSystemId, (id: BeltSystemId) => void] {
  const [id, setId] = useState<BeltSystemId>(() => readActiveBeltSystem());

  // Listen for storage events from other tabs and for our own custom
  // 'dojo-belt-system-changed' event fired by writeActiveBeltSystem.
  useEffect(() => {
    function refresh() {
      setId(readActiveBeltSystem());
    }
    window.addEventListener('storage', refresh);
    window.addEventListener('dojo-belt-system-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('dojo-belt-system-changed', refresh);
    };
  }, []);

  function update(next: BeltSystemId) {
    writeActiveBeltSystem(next);
    setId(next);
    // Tell other components in the SAME tab to re-read.
    window.dispatchEvent(new Event('dojo-belt-system-changed'));
  }

  return [id, update];
}
