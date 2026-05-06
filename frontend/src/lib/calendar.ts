// Date math + scheduling helpers for the calendar UI.
// Native Date only — no date-fns dep. Treats Sunday as the start of the week.

import type { Session } from './database.types';

export type CalendarView = 'week' | 'month';

// ---------- core date math ----------

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay()); // Sunday
  return x;
}

export function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  x.setMilliseconds(-1);
  return x;
}

export function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function endOfMonth(d: Date): Date {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  x.setMilliseconds(-1);
  return x;
}

// Range visible in the month grid: prev-month padding through next-month padding.
export function monthGridRange(d: Date): { from: Date; to: Date } {
  const from = startOfWeek(startOfMonth(d));
  const last = endOfMonth(d);
  const to = endOfWeek(last);
  return { from, to };
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return sameDay(d, new Date());
}

// ---------- formatting ----------

export function formatDayHeader(d: Date): { weekday: string; day: number } {
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    day: d.getDate(),
  };
}

export function formatHourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function formatRangeTitle(view: CalendarView, anchor: Date): string {
  if (view === 'week') {
    const s = startOfWeek(anchor);
    const e = addDays(s, 6);
    const sameMonth = s.getMonth() === e.getMonth();
    if (sameMonth) {
      return `${s.toLocaleDateString(undefined, { month: 'long' })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(
      undefined,
      { month: 'short', day: 'numeric', year: 'numeric' },
    )}`;
  }
  return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// ---------- positioning math (week view) ----------

export const DAY_START_HOUR = 6; // 6 AM
export const DAY_END_HOUR = 24; // midnight (exclusive — last visible hour is 11 PM)
export const SLOT_MINUTES = 30; // 30-minute time slots
export const PIXELS_PER_MINUTE = 0.65; // height tuning — 18h × 60 × 0.65 ≈ 702px tall

export function minutesFromDayStart(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() - DAY_START_HOUR * 60;
}

export function clampToVisibleHours(d: Date): Date {
  const x = new Date(d);
  if (x.getHours() < DAY_START_HOUR) {
    x.setHours(DAY_START_HOUR, 0, 0, 0);
  }
  if (x.getHours() >= DAY_END_HOUR) {
    x.setHours(DAY_END_HOUR - 1, 0, 0, 0);
  }
  return x;
}

// ---------- conflict detection ----------

export type Overlap = { conflicts: Session[] };

export function findConflicts(
  sessions: Session[],
  candidateStart: Date,
  candidateEnd: Date,
  excludeId?: string,
): Session[] {
  const startMs = candidateStart.getTime();
  const endMs = candidateEnd.getTime();
  return sessions.filter((s) => {
    if (s.id === excludeId) return false;
    if (s.status === 'cancelled' || s.status === 'no_show') return false;
    const sStart = new Date(s.starts_at).getTime();
    const sEnd = new Date(s.ends_at).getTime();
    return sStart < endMs && sEnd > startMs;
  });
}

// ---------- recurring expansion ----------

export function expandRecurring(
  starts: Date,
  ends: Date,
  weeks: number,
): { starts_at: string; ends_at: string }[] {
  const out: { starts_at: string; ends_at: string }[] = [];
  for (let i = 0; i < weeks; i++) {
    out.push({
      starts_at: addDays(starts, i * 7).toISOString(),
      ends_at: addDays(ends, i * 7).toISOString(),
    });
  }
  return out;
}

// ---------- snapping ----------

// Snap a Date to the nearest N-minute slot.
export function snapToSlot(d: Date, slotMinutes = 15): Date {
  const x = new Date(d);
  const m = x.getMinutes();
  const snapped = Math.round(m / slotMinutes) * slotMinutes;
  x.setMinutes(snapped, 0, 0);
  return x;
}

// Convert a Y pixel offset (within a day column starting at DAY_START_HOUR)
// into a snapped Date on the given day.
export function pixelToTime(day: Date, yPx: number, slotMinutes = 15): Date {
  const minutesFromStart = Math.max(0, yPx / PIXELS_PER_MINUTE);
  const x = startOfDay(day);
  x.setHours(DAY_START_HOUR, 0, 0, 0);
  x.setMinutes(x.getMinutes() + minutesFromStart);
  return snapToSlot(x, slotMinutes);
}
