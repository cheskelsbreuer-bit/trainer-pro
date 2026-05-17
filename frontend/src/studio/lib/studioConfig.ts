// Per-trainer studio config — class types, instructors, weekly
// schedule, bookings, passes. Stored as JSON under
// trainers.public_profile.studio so we don't need new tables for v1.
// (PublicProfile's other keys — .hero / .about / .contact / .gallery —
// stay untouched; we only read/write the .studio sub-key.)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { CLASS_TYPE_COLORS } from '../theme';

// ── Types ──────────────────────────────────────────────────────────────

export interface ClassType {
  id: string;
  name: string;          // "Vinyasa Yoga", "Spin", "HIIT"
  color: string;         // hex from CLASS_TYPE_COLORS
  durationMin: number;   // typical length
  description?: string;
}

export interface Instructor {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  /** Set of class-type ids this instructor can teach. */
  teaches: string[];
}

/** A recurring class slot — repeats every week on a given day + time. */
export interface ScheduledClass {
  id: string;
  classTypeId: string;
  instructorId: string | null;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  startTime: string;     // HH:MM 24h
  capacity: number;      // max members per class
  room?: string;
  /** Optional ISO date this slot starts being active. */
  startsOn?: string;
  /** Optional ISO date the slot ends. */
  endsOn?: string;
}

/** A member's booking for a specific date of a scheduled class. */
export interface Booking {
  id: string;
  scheduledClassId: string;
  clientId: string;
  /** YYYY-MM-DD of the specific class instance booked. */
  date: string;
  status: 'reserved' | 'attended' | 'no-show' | 'canceled' | 'waitlist';
  createdAt: string;
}

/** A member's class pack or unlimited membership. */
export interface Pass {
  id: string;
  clientId: string;
  type: 'pack' | 'unlimited' | 'drop-in';
  /** Remaining for 'pack' types. Ignored for unlimited / drop-in. */
  classesRemaining?: number;
  /** Original pack size, for display. */
  originalSize?: number;
  /** YYYY-MM-DD when the pass expires. */
  expiresOn?: string;
  /** Pack name from purchase. */
  label: string;
  purchasedOn: string;
}

export interface StudioSettings {
  studioName: string;
  studioTagline: string;
  currency: string;
  defaultClassDurationMin: number;
  /** Lead time required to book — in minutes. */
  bookingLeadMin: number;
  /** Lead time required to cancel without forfeit — in minutes. */
  cancellationCutoffMin: number;
}

export interface StudioAppConfig {
  classTypes: ClassType[];
  instructors: Instructor[];
  schedule: ScheduledClass[];
  bookings: Booking[];
  passes: Pass[];
  settings: StudioSettings;
}

// ── Defaults ──────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: StudioSettings = {
  studioName: '',
  studioTagline: 'Group classes for every body.',
  currency: '$',
  defaultClassDurationMin: 60,
  bookingLeadMin: 60,
  cancellationCutoffMin: 720, // 12 hours
};

/** A sensible starter catalog for a new studio. */
export const STARTER_CLASS_TYPES: ClassType[] = [
  {
    id: 'ct-yoga',
    name: 'Vinyasa Yoga',
    color: CLASS_TYPE_COLORS[0],
    durationMin: 60,
    description: 'All-levels flow class.',
  },
  {
    id: 'ct-spin',
    name: 'Spin',
    color: CLASS_TYPE_COLORS[1],
    durationMin: 45,
    description: 'Indoor cycling with rhythm-based intervals.',
  },
  {
    id: 'ct-hiit',
    name: 'HIIT',
    color: CLASS_TYPE_COLORS[2],
    durationMin: 45,
    description: 'High-intensity interval training, full body.',
  },
  {
    id: 'ct-pilates',
    name: 'Pilates',
    color: CLASS_TYPE_COLORS[3],
    durationMin: 50,
    description: 'Mat pilates focused on core + alignment.',
  },
];

export const EMPTY_CONFIG: StudioAppConfig = {
  classTypes: [],
  instructors: [],
  schedule: [],
  bookings: [],
  passes: [],
  settings: DEFAULT_SETTINGS,
};

// ── Hydration ─────────────────────────────────────────────────────────

function hydrate(raw: unknown): StudioAppConfig {
  const r = (raw ?? {}) as Partial<StudioAppConfig>;
  return {
    classTypes: Array.isArray(r.classTypes) ? r.classTypes : [],
    instructors: Array.isArray(r.instructors) ? r.instructors : [],
    schedule: Array.isArray(r.schedule) ? r.schedule : [],
    bookings: Array.isArray(r.bookings) ? r.bookings : [],
    passes: Array.isArray(r.passes) ? r.passes : [],
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
  };
}

// ── Hook ──────────────────────────────────────────────────────────────

interface TrainerProfileRow {
  id: string;
  public_profile: Record<string, unknown> | null;
}

export function useStudioConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['studio-config', user?.id],
    queryFn: async (): Promise<StudioAppConfig> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('id, public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as TrainerProfileRow).public_profile ?? {};
      return hydrate((profile as Record<string, unknown>).studio);
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: StudioAppConfig) => {
      if (!user) throw new Error('Not signed in');
      const { data: cur, error: e1 } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user.id)
        .single();
      if (e1) throw e1;
      const profile = ((cur as { public_profile: Record<string, unknown> } | null)?.public_profile ?? {}) as Record<
        string,
        unknown
      >;
      const nextProfile = { ...profile, studio: next };
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: nextProfile })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-config'] }),
  });

  return { ...query, save };
}

// ── Date helpers for the schedule ────────────────────────────────────

/** Returns the YYYY-MM-DD of the first day of the current week (Sunday). */
export function weekStart(d: Date = new Date()): Date {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** All concrete bookings for a given date (resolves recurring schedule). */
export function classInstancesForDate(
  cfg: StudioAppConfig,
  date: Date,
): { sc: ScheduledClass; iso: string; booked: Booking[] }[] {
  const dow = date.getDay() as ScheduledClass['dayOfWeek'];
  const iso = isoDate(date);
  return cfg.schedule
    .filter((sc) => sc.dayOfWeek === dow)
    .filter((sc) => !sc.startsOn || sc.startsOn <= iso)
    .filter((sc) => !sc.endsOn || sc.endsOn >= iso)
    .map((sc) => ({
      sc,
      iso,
      booked: cfg.bookings.filter(
        (b) => b.scheduledClassId === sc.id && b.date === iso && b.status !== 'canceled',
      ),
    }))
    .sort((a, b) => a.sc.startTime.localeCompare(b.sc.startTime));
}
