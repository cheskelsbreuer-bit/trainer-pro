// Exercise Group app — tokens + tag-parsing helpers.
//
// Visual intent: dark navy primary, blue accent, light cream body.
// Borrowed faithfully from the original mom-built single-file HTML
// app so coaches who used that one feel instantly at home.

import type { Client } from '../lib/database.types';

// Colors read from the coach's chosen appearance (--tp-* vars). The hex
// after the comma is mom's exact original navy look, used as the
// fallback — so her app stays pixel-identical unless she changes it.
export const E = {
  bg: 'var(--tp-bg, #f0f4f8)',
  ink: 'var(--tp-ink, #222)',
  inkSoft: 'var(--tp-ink-soft, #444)',
  mute: '#777',
  muteFaint: '#999',
  card: 'var(--tp-surface, #ffffff)',
  rule: 'var(--tp-rule, #e5eaf0)',
  ruleSoft: '#eef',
  rowAlt: '#f8fbff',
  rowHover: '#f5f9ff',
  primary: 'var(--tp-primary, #2d6a9f)',
  primaryDeep: 'color-mix(in srgb, var(--tp-primary, #2d6a9f) 72%, black)',
  accent: 'var(--tp-accent, #7ec8f5)',
  green: '#27ae60',
  greenDeep: '#1e8449',
  orange: '#e67e22',
  orangeDeep: '#d35400',
  red: '#e74c3c',
  redDeep: '#c0392b',
  gray: '#95a5a6',
  grayDeep: '#7f8c8d',
  badgeActiveBg: '#d4edda',
  badgeActiveTxt: '#155724',
  badgePauseBg: '#fff3cd',
  badgePauseTxt: '#856404',
  badgeArchiveBg: '#e8d5f5',
  badgeArchiveTxt: '#6a1b9a',
} as const;

// Tag prefixes — what we stored on each client when we imported.
// Same prefixes used by the import script in import_to_supabase.py.
const GROUP_TAG = 'group:';
const RATE_TAG = 'rate:';
const TOTAL_CLASSES_TAG = 'totalclasses:';
const TOTAL_OWED_TAG = 'totalowed:';
const TOTAL_PAID_TAG = 'totalpaid:';
const BALANCE_TAG = 'balance:';
const PAUSED_CLASSES_TAG = 'pausedclasses:';
const START_DATE_TAG = 'startdate:';
const END_DATE_TAG = 'enddate:';

function tagS(tags: string[] | null | undefined, prefix: string): string | null {
  if (!tags) return null;
  for (const t of tags) {
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

/** Group slug like "monday-wednesday" → display "Monday, Wednesday". */
export function readGroup(client: Client): string {
  const slug = tagS(client.tags, GROUP_TAG) ?? '';
  if (!slug) return '';
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(', ');
}
export function readGroupSlug(client: Client): string {
  return tagS(client.tags, GROUP_TAG) ?? '';
}
/** Rate per class — falls back to clients.rate_per_session. */
export function readRate(client: Client): number {
  const fromTag = tagN(client.tags, RATE_TAG);
  if (fromTag !== null && fromTag > 0 && fromTag < 1_000_000) return fromTag;
  if (client.rate_per_session && client.rate_per_session > 0)
    return Number(client.rate_per_session);
  return 15; // mom's default
}
export function readTotalClasses(c: Client): number {
  return tagN(c.tags, TOTAL_CLASSES_TAG) ?? 0;
}
export function readTotalOwed(c: Client): number {
  return tagN(c.tags, TOTAL_OWED_TAG) ?? 0;
}
export function readTotalPaid(c: Client): number {
  return tagN(c.tags, TOTAL_PAID_TAG) ?? 0;
}
export function readBalance(c: Client): number {
  return tagN(c.tags, BALANCE_TAG) ?? 0;
}
export function readPausedClasses(c: Client): number {
  return tagN(c.tags, PAUSED_CLASSES_TAG) ?? 0;
}
export function readStartDate(c: Client): string | null {
  return tagS(c.tags, START_DATE_TAG);
}
export function readEndDate(c: Client): string | null {
  return tagS(c.tags, END_DATE_TAG);
}

/** Apply a payment to a client's tags — bumps totalpaid + recomputes balance. */
export function tagsAfterPayment(
  prev: string[],
  amount: number,
): string[] {
  const map = new Map<string, string>();
  for (const t of prev ?? []) {
    const idx = t.indexOf(':');
    if (idx > 0) map.set(t.slice(0, idx + 1), t.slice(idx + 1));
    else map.set(t, '');
  }
  const owed = parseFloat(map.get(TOTAL_OWED_TAG) ?? '0') || 0;
  const paidPrev = parseFloat(map.get(TOTAL_PAID_TAG) ?? '0') || 0;
  const paidNext = paidPrev + amount;
  map.set(TOTAL_PAID_TAG, String(Math.round(paidNext * 100) / 100));
  map.set(BALANCE_TAG, String(Math.round((owed - paidNext) * 100) / 100));
  return Array.from(map.entries()).map(([k, v]) =>
    v === '' ? k : `${k}${v}`,
  );
}

/** Format $ with sign — positive owed, negative credit. */
export function formatBalance(n: number): { label: string; tone: 'owe' | 'credit' | 'zero' } {
  if (n === 0) return { label: '$0', tone: 'zero' };
  if (n > 0) return { label: `$${n.toFixed(0)} owed`, tone: 'owe' };
  return { label: `$${(-n).toFixed(0)} credit`, tone: 'credit' };
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function shortDateMD(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

// All the days-of-week mom's groups use. Used by filters + Group cards.
export const WEEKDAY_GROUPS = ['Sunday', 'Monday', 'Wednesday', 'Thursday'] as const;

/** Pull the set of distinct day-of-week tokens across a client list. */
export function uniqueGroups(clients: Client[]): string[] {
  const set = new Set<string>();
  for (const c of clients) {
    const slug = readGroupSlug(c);
    for (const day of slug.split('-')) {
      const cap = day.trim();
      if (cap)
        set.add(cap.charAt(0).toUpperCase() + cap.slice(1));
    }
  }
  return Array.from(set);
}

/** True if the member belongs to this single day-of-week group. */
export function clientInGroup(c: Client, day: string): boolean {
  const slug = readGroupSlug(c).toLowerCase();
  return slug.split('-').includes(day.toLowerCase());
}
