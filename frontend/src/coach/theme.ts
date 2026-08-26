// ── Coach — the flagship 1-on-1 training app ─────────────────────────
//
// Design: "Chalk & Iron" (approved sketch, Aug 2026). Two grounds, one
// identity: DARK for the gym floor (early mornings, one hand, big
// targets), LIGHT for desk work (programming, review). Display type is
// Barlow Semi Condensed — athletic without the squeeze; working type is
// Archivo with tabular numerals wherever numbers line up.
//
// This file is the single source of truth for the app's look. Pages
// read tokens; they never invent colors.

// Comfy pass (owner feedback): the floor stays dark for 5am gyms, but
// warm — coffee-brown blacks, cream text, softened coral accent, rounder
// shapes. Cozy leather gym bag, not server room.
export const FLOOR = {
  bg: '#1b1713',
  card: '#26211a',
  cardDeep: '#201b16',
  edge: '#3a322a',
  edgeSoft: '#2c2620',
  ink: '#f6f1e7',
  inkSoft: '#ddd5c7',
  mute: '#a89d8c',
  accent: '#f07a52',
  accentInk: '#301407',
  accentSoft: '#3a281e',
  accentSoftInk: '#ffbb9a',
  good: '#66c795',
  goodInk: '#0f271b',
  goodSoft: '#243027',
  goodSoftInk: '#96dcb8',
  warnSoft: '#332a1a',
  warnSoftInk: '#e9c887',
  bad: '#f2a3a3',
  badSoft: '#3d2622',
  badEdge: '#553229',
  info: '#a3c0e6',
  infoSoft: '#262d38',
} as const;

export const DESK = {
  bg: '#f5f4f0',
  card: '#ffffff',
  cardSub: '#faf9f5',
  edge: '#e4e2db',
  edgeSoft: '#eeece5',
  fill: '#f0efe9',
  ink: '#1a1c20',
  inkSoft: '#33383f',
  mute: '#8a8f99',
  dim: '#6c7280',
  accent: '#d94f22',
  accentDeep: '#b53f18',
  accentSoft: '#fdf3ec',
  accentSoftInk: '#8a4a22',
  good: '#2f8f5f',
  goodSoft: '#e8f2ec',
  warn: '#b8860b',
  dark: '#1a1c20',
  darkInk: '#f5f4f0',
  darkMute: '#b9bec7',
  darkEdge: '#2a2e35',
} as const;

export const TYPE = {
  display: "'Barlow Semi Condensed', 'Arial Narrow', system-ui, sans-serif",
  body: "'Archivo', system-ui, -apple-system, sans-serif",
} as const;

export const RADII = { sm: 13, md: 16, lg: 19, xl: 22, pill: 999 } as const;

/** Minimum one-hand hit target on the floor screens (research: logging
 *  happens in 30-90s rest windows, phone in one hand). */
export const HIT = 44;

export function formatMoney(n: number): string {
  const whole = Math.abs(n % 1) < 0.005;
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function timeOf(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}
