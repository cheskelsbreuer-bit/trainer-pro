// Group fitness studio template — design tokens + helpers.
//
// Visual intent: modern commercial-studio vibe. Inky slate background,
// bright electric-violet accent, plenty of negative space. Different
// from mom's pay-per-class exercise app (which is paper-cream + navy
// — designed for a single instructor) and different from the dojo /
// boxing dark themes.

export const S = {
  bg: '#F7F8FB',
  ink: '#0F172A',
  inkSoft: '#334155',
  mute: '#64748B',
  muteFaint: '#94A3B8',
  card: '#FFFFFF',
  rule: '#E5EAF2',
  ruleSoft: '#F1F4F9',
  // Primary accent — electric violet, the modern commercial-studio look
  primary: '#7C3AED',
  primaryDeep: '#5B21B6',
  primarySoft: '#EDE9FE',
  // Secondary — bright teal for energy / "live" tags
  accent: '#06B6D4',
  accentDeep: '#0E7490',
  // Status colors
  ok: '#16A34A',
  okSoft: '#DCFCE7',
  warn: '#F59E0B',
  warnSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
} as const;

export const HEADING_FONT =
  "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Class-type colors — picked to feel distinct on a calendar grid. */
export const CLASS_TYPE_COLORS = [
  '#7C3AED', // violet
  '#06B6D4', // teal
  '#F59E0B', // amber
  '#EC4899', // pink
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F97316', // orange
  '#8B5CF6', // purple
] as const;

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Format an HH:MM 24h string as 7:00 am. */
export function fmtTime(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

/** Minutes from "HH:MM" — used to position events on the schedule grid. */
export function timeToMinutes(hhmm: string): number {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtMoney(n: number, currency = '$'): string {
  return `${currency}${n.toFixed(0)}`;
}
