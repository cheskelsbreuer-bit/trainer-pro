// Per-trainer config for the Exercise Group app — notes, settings, log,
// folders, categories. Stored as a JSON sub-tree under
// trainers.public_profile.exercise so we don't need new tables.
// (PublicProfile already uses .hero/.about/.contact/.gallery keys —
//  we only touch the .exercise key, leaving those alone.)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// ── Types ──────────────────────────────────────────────────────────────

export interface NoteSection {
  heading: string;
  body: string;
}
export interface Combo {
  id: string;
  title: string;
  category: string;
  folderId?: string | null;
  sections: NoteSection[];
  createdAt: string;
  updatedAt: string;
}
export interface NoteFolder {
  id: string;
  name: string;
  category: string;
}
export interface Category {
  id: string;
  name: string;
  icon: string;
}
export interface ExerciseSettings {
  /** Default rate per class (for new members). */
  defaultPerClass: number;
  /** Group display name (overrides trainers.business_name when set). */
  groupName?: string;
  groupSubtitle?: string;
  groupEmoji?: string;
  currency: string; // '$', '₪', '€', '£'
  dateFormat: 'mdy' | 'dmy' | 'iso';
  /** Methods shown in the record-payment modal. */
  paymentMethods: string[];
  /** SMS reminder template — supports {firstName}, {balance}, {currency}. */
  smsTemplate: string;
  /** Family discount: percent off OR flat dollars off, applied per family member. */
  familyDiscount: { type: 'percent' | 'dollar'; value: number };
  /** Read-only lock blocks the edit toggle even on this device. */
  readOnlyLock: boolean;
  /** 4-digit PIN required to flip into edit mode. Empty = no PIN. */
  editPin: string;
}
export interface LogEntry {
  id: string;
  ts: string;
  category: 'payment' | 'member' | 'settings' | 'pause' | 'archive' | 'note' | 'misc';
  action: string;
  details?: string;
}
export interface ExerciseAppConfig {
  combos: Combo[];
  folders: NoteFolder[];
  categories: Category[];
  settings: ExerciseSettings;
  log: LogEntry[];
}

// ── Defaults ───────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cardio', name: 'Cardio', icon: '🏃' },
  { id: 'strength', name: 'Strength', icon: '💪' },
  { id: 'core', name: 'Core', icon: '🧘' },
  { id: 'stretch', name: 'Stretch', icon: '🤸' },
  { id: 'dance', name: 'Dance', icon: '💃' },
  { id: 'warmup', name: 'Warm-up', icon: '🔥' },
  { id: 'cooldown', name: 'Cool-down', icon: '❄️' },
  { id: 'choreo', name: 'Choreography', icon: '🎵' },
  { id: 'class-plans', name: 'Class plans', icon: '📋' },
  { id: 'admin', name: 'Admin notes', icon: '📝' },
  { id: 'misc', name: 'Misc', icon: '⭐' },
];

export const DEFAULT_SETTINGS: ExerciseSettings = {
  defaultPerClass: 15,
  groupName: '',
  groupSubtitle: '',
  groupEmoji: '💪',
  currency: '$',
  dateFormat: 'mdy',
  paymentMethods: ['Cash', 'Check', 'Venmo', 'Zelle', 'Other'],
  smsTemplate:
    "Hi {firstName}! Just a friendly reminder that your balance for exercise class is {currency}{balance}. Thanks!",
  familyDiscount: { type: 'percent', value: 50 },
  readOnlyLock: false,
  editPin: '',
};

export const EMPTY_CONFIG: ExerciseAppConfig = {
  combos: [],
  folders: [],
  categories: DEFAULT_CATEGORIES,
  settings: DEFAULT_SETTINGS,
  log: [],
};

// ── Merge utility: hydrate from a partial saved config ─────────────────

function hydrate(raw: unknown): ExerciseAppConfig {
  const r = (raw ?? {}) as Partial<ExerciseAppConfig>;
  return {
    combos: Array.isArray(r.combos) ? r.combos : [],
    folders: Array.isArray(r.folders) ? r.folders : [],
    categories:
      Array.isArray(r.categories) && r.categories.length > 0
        ? r.categories
        : DEFAULT_CATEGORIES,
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
    log: Array.isArray(r.log) ? r.log : [],
  };
}

// ── Hook: read & mutate the whole config ───────────────────────────────

interface TrainerProfileRow {
  id: string;
  public_profile: Record<string, unknown> | null;
}

export function useExerciseConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['exercise-config', user?.id],
    queryFn: async (): Promise<ExerciseAppConfig> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('id, public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as TrainerProfileRow).public_profile ?? {};
      const ex = (profile as Record<string, unknown>).exercise;
      return hydrate(ex);
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: ExerciseAppConfig) => {
      if (!user) throw new Error('Not signed in');
      // Re-fetch the latest profile so we don't clobber other keys
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
      const nextProfile = { ...profile, exercise: next };
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: nextProfile })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise-config'] }),
  });

  return { ...query, save };
}

// ── Tiny "add a log entry" helper — capped at 200 entries ──────────────

export function appendLog(
  cfg: ExerciseAppConfig,
  category: LogEntry['category'],
  action: string,
  details?: string,
): ExerciseAppConfig {
  const entry: LogEntry = {
    id: `lg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date().toISOString(),
    category,
    action,
    details,
  };
  return { ...cfg, log: [entry, ...cfg.log].slice(0, 200) };
}
