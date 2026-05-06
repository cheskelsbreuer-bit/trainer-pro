// Slot computation for the public booking page.

export interface BookingWindow {
  weekday: number; // 0 = Sun, 6 = Sat
  start: string; // "06:00"
  end: string; // "20:00"
}

export interface BookingSettings {
  lead_hours: number;
  max_days_ahead: number;
  default_duration_min: number;
  buffer_min: number;
  intro_text?: string;
  windows: BookingWindow[];
}

export interface BusySlot {
  starts_at: string; // ISO
  ends_at: string; // ISO
}

export interface ComputedSlot {
  start: Date;
  end: Date;
}

export interface SlotsByDay {
  day: Date;
  slots: ComputedSlot[];
}

function parseTime(hhmm: string, date: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

export function computeAvailableSlots(
  settings: BookingSettings,
  busy: BusySlot[],
  now: Date,
): SlotsByDay[] {
  const lookaheadDays = settings.max_days_ahead || 30;
  const leadMs = (settings.lead_hours || 24) * 3600_000;
  const minStart = new Date(now.getTime() + leadMs);
  const maxStart = new Date(now.getTime() + lookaheadDays * 86_400_000);
  const slotMin = settings.default_duration_min || 60;
  const stepMs = slotMin * 60_000;
  const bufferMs = (settings.buffer_min || 0) * 60_000;

  const busyRanges = busy.map((b) => ({
    start: new Date(b.starts_at).getTime(),
    end: new Date(b.ends_at).getTime() + bufferMs, // pad with buffer
  }));

  const days: SlotsByDay[] = [];
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= maxStart) {
    const weekday = cursor.getDay();
    const windows = settings.windows.filter((w) => w.weekday === weekday);
    const daySlots: ComputedSlot[] = [];

    for (const w of windows) {
      const winStart = parseTime(w.start, cursor);
      const winEnd = parseTime(w.end, cursor);
      let t = winStart.getTime();
      while (t + stepMs <= winEnd.getTime()) {
        const slotStart = t;
        const slotEnd = t + stepMs;
        if (slotStart >= minStart.getTime() && slotStart <= maxStart.getTime()) {
          const overlap = busyRanges.some(
            (b) => slotStart < b.end && slotEnd > b.start,
          );
          if (!overlap) {
            daySlots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
            });
          }
        }
        t += stepMs;
      }
    }

    if (daySlots.length > 0) {
      days.push({ day: new Date(cursor), slots: daySlots });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function readableErrorCode(code: string | null): string {
  switch (code) {
    case 'BOOKING_DISABLED':
      return 'This trainer is not currently accepting bookings.';
    case 'INVALID_EMAIL':
      return 'Please enter a valid email address.';
    case 'INVALID_NAME':
      return 'Please enter your name.';
    case 'TOO_SOON':
      return 'That time is too soon — pick a later slot.';
    case 'SLOT_TAKEN':
      return 'Sorry, someone just booked that slot. Pick another.';
    default:
      return code ?? 'Something went wrong. Try again.';
  }
}
