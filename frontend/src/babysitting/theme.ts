// Babysitting app — design tokens + kid-record helpers.
//
// Visual intent: warm and calm, like a well-kept storybook. Linen
// background, terracotta primary, soft teal accent, butter highlights,
// generous rounded corners. Reads the coach's chosen appearance via
// --tp-* vars so the Design tab still personalizes everything; the hex
// fallbacks are the babysitting default palette.

import type { Client } from '../lib/database.types';

export const B = {
  bg: 'var(--tp-bg, #faf6ef)',
  card: 'var(--tp-surface, #ffffff)',
  ink: 'var(--tp-ink, #37302a)',
  inkSoft: 'var(--tp-ink-soft, #6b6058)',
  mute: '#9a8f85',
  rule: 'var(--tp-rule, #eee5d9)',
  rowAlt: '#fdfaf4',
  primary: 'var(--tp-primary, #d96f4e)',
  primaryDeep: 'var(--tp-primary-deep, #a84f35)',
  primarySoft: 'var(--tp-primary-soft, #f9e4dc)',
  accent: 'var(--tp-accent, #4f9d94)',
  accentDeep: 'var(--tp-accent-deep, #35726b)',
  accentSoft: 'var(--tp-accent-soft, #e0f0ee)',
  butter: '#f2b84b',
  butterSoft: '#fdf3dc',
  green: '#4e9d5f',
  greenSoft: '#e4f2e7',
  red: '#cf4f38',
  redSoft: '#fbe7e2',
  plum: '#8a6a9f',
  plumSoft: '#f0e9f5',
  radius: 'var(--tp-radius, 16px)',
  radiusSm: 'var(--tp-radius-sm, 10px)',
  radiusLg: 'var(--tp-radius-lg, 22px)',
  pill: 'var(--tp-radius-pill, 999px)',
  fontDisplay: "var(--tp-font-display, 'Nunito', 'Segoe UI', sans-serif)",
  fontBody: "var(--tp-font-body, 'Nunito', 'Segoe UI', sans-serif)",
  shadow: '0 1px 2px rgba(70, 48, 32, 0.05), 0 10px 28px rgba(70, 48, 32, 0.07)',
  shadowSoft: '0 1px 2px rgba(70, 48, 32, 0.04), 0 4px 14px rgba(70, 48, 32, 0.05)',
} as const;

// Rotating pastel pairs for kid avatars — bg + readable ink.
export const AVATAR_TONES: ReadonlyArray<{ bg: string; ink: string }> = [
  { bg: '#fde3d3', ink: '#9a4a2c' },
  { bg: '#dcefec', ink: '#2f6d65' },
  { bg: '#fdf0cd', ink: '#8a6414' },
  { bg: '#ece3f3', ink: '#664680' },
  { bg: '#e2eed9', ink: '#4a6d38' },
  { bg: '#fbe3ea', ink: '#98455e' },
  { bg: '#dfe9f5', ink: '#3a5e85' },
  { bg: '#efe6da', ink: '#77573a' },
];

export function avatarTone(name: string): { bg: string; ink: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '?';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

// ── Kid record encoding ────────────────────────────────────────────────
// One `clients` row per kid. Kid-specific fields ride the tags text[]
// column with these prefixes (same mechanism the exercise vertical
// proved out, with the balance math fixed — see tagsAfterPayment):
//
//   family:<slug>     siblings share a family (slug of the family name)
//   parent:<name>     parent/guardian display name (for messages)
//   days:<mon-tue>    scheduled days, lowercase 3-letter, dash-joined
//   wrate:<n>         flat weekly rate in dollars
//   hrate:<n>         hourly rate in dollars
//   totalowed:<n>     lifetime billed
//   totalpaid:<n>     lifetime received
//   balance:<n>       always derived = totalowed - totalpaid (owes > 0)
//   startdate:<iso>   first day of care
//
// Real columns used directly (no tags): phone + email (the PARENT's
// contact), date_of_birth (the kid's birthday), medical_notes
// (allergies), notes (care notes), emergency_contact.

const FAMILY_TAG = 'family:';
const PARENT_TAG = 'parent:';
const DAYS_TAG = 'days:';
const WEEKLY_RATE_TAG = 'wrate:';
const HOURLY_RATE_TAG = 'hrate:';
const TOTAL_OWED_TAG = 'totalowed:';
const TOTAL_PAID_TAG = 'totalpaid:';
const BALANCE_TAG = 'balance:';
const START_DATE_TAG = 'startdate:';

function tagS(tags: string[] | null | undefined, prefix: string): string | null {
  for (const t of tags ?? []) {
    if (t.startsWith(prefix)) return t.slice(prefix.length);
  }
  return null;
}
function tagN(tags: string[] | null | undefined, prefix: string): number | null {
  const s = tagS(tags, prefix);
  if (s === null) return null;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
}

export function readFamilySlug(c: Client): string {
  return tagS(c.tags, FAMILY_TAG) ?? '';
}
export function readParent(c: Client): string {
  return tagS(c.tags, PARENT_TAG) ?? '';
}
export function readDaysSlug(c: Client): string {
  return tagS(c.tags, DAYS_TAG) ?? '';
}
export function readWeeklyRate(c: Client): number {
  const v = tagN(c.tags, WEEKLY_RATE_TAG);
  return v !== null && v >= 0 && v < 1_000_000 ? v : 0;
}
export function readHourlyRate(c: Client): number {
  const v = tagN(c.tags, HOURLY_RATE_TAG);
  return v !== null && v >= 0 && v < 1_000_000 ? v : 0;
}
export function readTotalOwed(c: Client): number {
  return tagN(c.tags, TOTAL_OWED_TAG) ?? 0;
}
export function readTotalPaid(c: Client): number {
  return tagN(c.tags, TOTAL_PAID_TAG) ?? 0;
}
/** Balance always derives from owed - paid; the balance: tag is a cache. */
export function readBalance(c: Client): number {
  const owed = tagN(c.tags, TOTAL_OWED_TAG);
  const paid = tagN(c.tags, TOTAL_PAID_TAG);
  if (owed !== null || paid !== null) {
    return Math.round(((owed ?? 0) - (paid ?? 0)) * 100) / 100;
  }
  return tagN(c.tags, BALANCE_TAG) ?? 0;
}
export function readStartDate(c: Client): string | null {
  return tagS(c.tags, START_DATE_TAG);
}

/** "Smith Family" → "smith" (stable slug for the family: tag). */
export function familySlugOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/family/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function familyLabel(slug: string): string {
  if (!slug) return '';
  return (
    slug
      .split('-')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') + ' family'
  );
}

// ── Days of the week (all 7 — schedules differ per family) ────────────
export const ALL_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const DAY_LABELS: Record<string, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};
export const DAY_SHORT: Record<string, string> = {
  sun: 'Sun',
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
};

export function readDays(c: Client): string[] {
  return readDaysSlug(c)
    .split('-')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => (ALL_DAYS as readonly string[]).includes(d));
}

export function daysLabel(c: Client): string {
  const days = readDays(c);
  if (!days.length) return '';
  return days.map((d) => DAY_SHORT[d]).join(' · ');
}

/** Is this kid scheduled today? (device-local weekday) */
export function scheduledToday(c: Client, now = new Date()): boolean {
  const key = ALL_DAYS[now.getDay()];
  return readDays(c).includes(key);
}

// ── Money mutations on the tag map ────────────────────────────────────
// All three helpers rebuild balance: from totalowed - totalpaid, so the
// invariant can never drift (the exercise vertical's manual-edit clobber
// and delete-without-reversal bugs are structurally impossible here).

function toMap(prev: string[] | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of prev ?? []) {
    const idx = t.indexOf(':');
    if (idx > 0) map.set(t.slice(0, idx + 1), t.slice(idx + 1));
    else map.set(t, '');
  }
  return map;
}
function fromMap(map: Map<string, string>): string[] {
  return Array.from(map.entries()).map(([k, v]) => (v === '' ? k : `${k}${v}`));
}
function recomputeBalance(map: Map<string, string>): void {
  const owed = parseFloat(map.get(TOTAL_OWED_TAG) ?? '0') || 0;
  const paid = parseFloat(map.get(TOTAL_PAID_TAG) ?? '0') || 0;
  map.set(TOTAL_OWED_TAG, String(Math.round(owed * 100) / 100));
  map.set(TOTAL_PAID_TAG, String(Math.round(paid * 100) / 100));
  map.set(BALANCE_TAG, String(Math.round((owed - paid) * 100) / 100));
}

/** Money received → totalpaid goes up, balance recomputed. */
export function tagsAfterPayment(prev: string[], amount: number): string[] {
  const map = toMap(prev);
  const paid = parseFloat(map.get(TOTAL_PAID_TAG) ?? '0') || 0;
  map.set(TOTAL_PAID_TAG, String(paid + amount));
  recomputeBalance(map);
  return fromMap(map);
}

/** A charge (billing) → totalowed goes up, balance recomputed.
 *  Negative amount = credit / discount. */
export function tagsAfterCharge(prev: string[], amount: number): string[] {
  const map = toMap(prev);
  const owed = parseFloat(map.get(TOTAL_OWED_TAG) ?? '0') || 0;
  map.set(TOTAL_OWED_TAG, String(owed + amount));
  recomputeBalance(map);
  return fromMap(map);
}

/** Deleting a recorded payment must give the money "back" to the balance. */
export function tagsAfterPaymentDeleted(prev: string[], amount: number): string[] {
  return tagsAfterPayment(prev, -amount);
}

/** Write/replace simple identity tags (family, parent, days, rates, start). */
export function tagsWithProfile(
  prev: string[] | null | undefined,
  profile: {
    familySlug?: string | null;
    parent?: string | null;
    daysSlug?: string | null;
    weeklyRate?: number | null;
    hourlyRate?: number | null;
    startDate?: string | null;
  },
): string[] {
  const map = toMap(prev);
  const setOrDrop = (prefix: string, v: string | null | undefined) => {
    if (v === undefined) return; // untouched
    if (v === null || v === '') map.delete(prefix);
    else map.set(prefix, v);
  };
  setOrDrop(FAMILY_TAG, profile.familySlug);
  setOrDrop(PARENT_TAG, profile.parent);
  setOrDrop(DAYS_TAG, profile.daysSlug);
  setOrDrop(
    WEEKLY_RATE_TAG,
    profile.weeklyRate === undefined ? undefined : profile.weeklyRate ? String(profile.weeklyRate) : null,
  );
  setOrDrop(
    HOURLY_RATE_TAG,
    profile.hourlyRate === undefined ? undefined : profile.hourlyRate ? String(profile.hourlyRate) : null,
  );
  setOrDrop(START_DATE_TAG, profile.startDate);
  recomputeBalance(map);
  return fromMap(map);
}

// ── Formatting ────────────────────────────────────────────────────────
export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(2)}`;
}

export function formatBalance(n: number): { label: string; tone: 'owe' | 'credit' | 'zero' } {
  if (Math.abs(n) < 0.005) return { label: 'Paid up', tone: 'zero' };
  if (n > 0) return { label: `${formatMoney(n)} owed`, tone: 'owe' };
  return { label: `${formatMoney(-n)} credit`, tone: 'credit' };
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ageOf(dobIso: string | null | undefined): string {
  if (!dobIso) return '';
  const d = new Date(dobIso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 0) return '';
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yr`;
}
