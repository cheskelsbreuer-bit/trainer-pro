// ── The module system — Trainer Pro's core differentiator ───────────
//
// Every other coaching app makes the coach fit a fixed product. We let
// each coach assemble their OWN app from capability "modules". Two
// coaches in the same template can have completely different apps.
//
// IMPORTANT (and per the no-reuse principle): this registry is only the
// BRAIN — it tracks which capabilities a coach has switched on. It does
// NOT contain any shared UI. Each template app renders its own pages in
// its own design language and simply asks "is module X on for this
// coach?" to decide whether to show its own tab.
//
// Storage: trainers.public_profile.modules.enabled = string[] of module
// ids. No new tables. Defaults to the template's starter bundle, so
// existing coaches see zero change until they open the switchboard.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from '../hooks/useAuth';

export type ModuleCategory =
  | 'core'
  | 'nutrition'
  | 'martial'
  | 'boxing'
  | 'studio'
  | 'exercise'
  | 'private'
  | 'comms'
  | 'growth'
  | 'crosscutting';

export interface AppModule {
  id: string;
  name: string;
  /** One-liner the coach reads in the switchboard. */
  description: string;
  icon: string; // emoji — neutral, each template styles its own nav anyway
  category: ModuleCategory;
  /** Template slugs this module is OFFERED to. 'all' = every template. */
  templates: string[] | 'all';
  /** Core modules are always on and can't be switched off. */
  core?: boolean;
  /** Short nudge shown when the app suggests turning this on. */
  suggest?: string;
}

// ── The catalog ──────────────────────────────────────────────────────
// Grouped loosely by category. `templates` controls which coaches even
// SEE a module in their switchboard — a boxing module never shows up
// for a nutrition coach.

export const MODULES: AppModule[] = [
  // ---- CORE (every template, always on) ----
  { id: 'dashboard', name: 'Dashboard', description: 'Your at-a-glance home screen.', icon: '📊', category: 'core', templates: 'all', core: true },
  { id: 'roster', name: 'Client roster', description: 'The people you work with.', icon: '👥', category: 'core', templates: 'all', core: true },
  { id: 'settings', name: 'Settings', description: 'Configure your app.', icon: '⚙️', category: 'core', templates: 'all', core: true },

  // ---- PAYMENTS / MONEY (most templates) ----
  { id: 'payments', name: 'Payment tracking', description: 'Record payments, balances, who owes what.', icon: '💰', category: 'crosscutting', templates: 'all' },
  { id: 'stripe', name: 'Online payments (Stripe)', description: 'Let clients pay you by card.', icon: '💳', category: 'crosscutting', templates: 'all', suggest: 'You have clients who owe money — collect it online.' },
  { id: 'class-billing', name: 'Per-class billing', description: 'Charge per class, track running balances.', icon: '🧾', category: 'exercise', templates: ['exercise_group'] },
  { id: 'packages', name: 'Packages & class packs', description: 'Sell 10-class packs, unlimited monthly, drop-ins.', icon: '🎟️', category: 'crosscutting', templates: ['group_studio', 'gym_membership', 'yoga_studio', 'solo_trainer'] },

  // ---- NUTRITION ----
  { id: 'habit-coaching', name: 'Habit coaching', description: 'Assign one practice at a time, by skill + level.', icon: '🌱', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'check-ins', name: 'Weekly check-ins', description: 'Structured client check-ins with photos + stats.', icon: '📥', category: 'nutrition', templates: ['nutrition_coach', 'online_coach'] },
  { id: 'recipes', name: 'Recipe library', description: 'Curated recipes to share with clients.', icon: '🍳', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'intake-forms', name: 'Intake forms', description: 'New-client questionnaire — story, body, mindset.', icon: '📋', category: 'nutrition', templates: ['nutrition_coach', 'online_coach'] },
  { id: 'resources', name: 'Resource library', description: 'Coach-written lessons attached to each practice.', icon: '📚', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'ask-coach', name: 'AI assistant', description: 'A methodology-trained chatbot for clients + you.', icon: '✨', category: 'nutrition', templates: ['nutrition_coach'] },
  { id: 'macros', name: 'Macro targets', description: 'Per-client protein / carb / fat targets.', icon: '🥩', category: 'nutrition', templates: ['nutrition_coach'], suggest: 'Some methods (RP) track macros — turn this on if you do.' },

  // ---- MARTIAL ARTS ----
  { id: 'belt-ranks', name: 'Belt / rank tracking', description: 'Track each student\'s belt and progression.', icon: '🥋', category: 'martial', templates: ['martial_arts'] },
  { id: 'testing-events', name: 'Belt testing events', description: 'Schedule and run rank tests.', icon: '🎓', category: 'martial', templates: ['martial_arts'] },
  { id: 'family-memberships', name: 'Family memberships', description: 'Group siblings + parents under one account.', icon: '👨‍👩‍👧', category: 'martial', templates: ['martial_arts', 'group_studio'] },

  // ---- BOXING ----
  { id: 'fighter-records', name: 'Fighter records', description: 'Win-loss-draw record per fighter.', icon: '🥊', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'rounds-training', name: 'Rounds & training log', description: 'Log rounds, drills, conditioning.', icon: '⏱️', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'tier-system', name: 'Fighter tiers', description: 'Beginner / amateur / pro tier tracking.', icon: '🏆', category: 'boxing', templates: ['boxing_gym'] },
  { id: 'fight-card', name: 'Fight card', description: 'Upcoming bouts and matchups.', icon: '📣', category: 'boxing', templates: ['boxing_gym'] },

  // ---- GROUP STUDIO ----
  { id: 'class-schedule', name: 'Class schedule', description: 'Weekly recurring class grid.', icon: '📅', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'class-types', name: 'Class types', description: 'Define yoga / spin / HIIT / etc.', icon: '🌀', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'instructors', name: 'Instructors', description: 'Staff roster + who teaches what.', icon: '🧑‍🏫', category: 'studio', templates: ['group_studio', 'yoga_studio', 'gym_membership'] },
  { id: 'bookings', name: 'Bookings & waitlists', description: 'Clients reserve a spot; waitlist when full.', icon: '🗓️', category: 'studio', templates: ['group_studio', 'yoga_studio'] },
  { id: 'attendance', name: 'Attendance tracking', description: 'Mark who showed up to each class.', icon: '✅', category: 'studio', templates: ['group_studio', 'yoga_studio', 'martial_arts', 'gym_membership'], suggest: 'You schedule classes — track who actually comes.' },

  // ---- EXERCISE GROUP (mom's model) ----
  { id: 'day-groups', name: 'Day-of-week groups', description: 'Organize members by class day.', icon: '🗂️', category: 'exercise', templates: ['exercise_group'] },
  { id: 'pause-records', name: 'Pause tracking', description: 'Track members on a break + when they return.', icon: '⏸️', category: 'exercise', templates: ['exercise_group'] },
  { id: 'notes-library', name: 'Notes & combos', description: 'Workout routines organized by category.', icon: '📝', category: 'exercise', templates: ['exercise_group', 'group_studio'] },

  // ---- PRIVATE / SOLO TRAINER ----
  { id: 'session-logging', name: 'Session logging', description: 'Log individual 1-on-1 sessions.', icon: '🏋️', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'workout-builder', name: 'Workout builder', description: 'Build + assign workout programs.', icon: '🏗️', category: 'private', templates: ['solo_trainer', 'athletic_performance', 'online_coach'] },
  { id: 'progress-photos', name: 'Progress photos', description: 'Before/after photo tracking.', icon: '📸', category: 'private', templates: ['solo_trainer', 'nutrition_coach', 'online_coach'] },

  // ---- COMMUNICATIONS (any template) ----
  { id: 'sms-reminders', name: 'SMS reminders', description: 'Auto-text balance + class reminders.', icon: '📱', category: 'comms', templates: 'all', suggest: 'Stop chasing payments by hand — auto-text reminders.' },
  { id: 'email-reminders', name: 'Email notifications', description: 'Welcome notes, receipts, check-in nudges.', icon: '✉️', category: 'comms', templates: 'all' },
  { id: 'messaging', name: 'Client messaging', description: 'In-app coach ↔ client chat.', icon: '💬', category: 'comms', templates: 'all' },
  { id: 'client-portal', name: 'Client portal', description: 'Let clients log in to see balance + progress.', icon: '🚪', category: 'comms', templates: 'all', suggest: 'Give clients their own login — every top app has this.' },

  // ---- GROWTH / EXTRAS (any template) ----
  { id: 'public-profile', name: 'Public page', description: 'A free hosted website for your practice.', icon: '🌐', category: 'growth', templates: 'all' },
  { id: 'online-booking', name: 'Online consult booking', description: 'Let prospects book a free intro call.', icon: '📆', category: 'growth', templates: 'all' },
  { id: 'directory', name: 'Find-a-coach directory', description: 'Get listed in the Trainer Pro directory.', icon: '📒', category: 'growth', templates: 'all' },
  { id: 'calendar-sync', name: 'Calendar sync', description: 'Sync sessions to Google Calendar.', icon: '🔄', category: 'growth', templates: 'all' },
  { id: 'reports', name: 'Reports & insights', description: 'Revenue, retention, trends.', icon: '📈', category: 'growth', templates: 'all', suggest: 'You have months of data — see the trends.' },
  { id: 'activity-log', name: 'Activity log', description: 'A history of everything that happened.', icon: '📜', category: 'growth', templates: 'all' },
  { id: 'birthdays', name: 'Birthdays', description: 'Surface client birthdays each month.', icon: '🎂', category: 'growth', templates: 'all' },
  { id: 'holidays', name: 'Holidays / closures', description: 'Mark days you\'re closed.', icon: '🏖️', category: 'growth', templates: 'all' },
  { id: 'tags', name: 'Client tags', description: 'Color-coded labels for filtering.', icon: '🏷️', category: 'growth', templates: 'all' },
  { id: 'custom-fields', name: 'Custom fields', description: 'Track your own per-client info.', icon: '✏️', category: 'growth', templates: 'all' },
];

export const MODULE_BY_ID: Record<string, AppModule> = MODULES.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<string, AppModule>,
);

// ── Starter bundles — the default ON set per template ────────────────
// These mirror what each template app currently shows, so turning the
// module system on changes NOTHING for existing coaches until they
// open the switchboard.

const ALWAYS_CORE = ['dashboard', 'roster', 'settings', 'payments'];

export const STARTER_BUNDLES: Record<string, string[]> = {
  nutrition_coach: [
    ...ALWAYS_CORE,
    'habit-coaching', 'check-ins', 'recipes', 'intake-forms', 'resources',
    'ask-coach', 'public-profile', 'online-booking',
  ],
  martial_arts: [
    ...ALWAYS_CORE,
    'belt-ranks', 'class-schedule', 'attendance', 'family-memberships',
    'public-profile',
  ],
  boxing_gym: [
    ...ALWAYS_CORE,
    'fighter-records', 'rounds-training', 'tier-system', 'fight-card',
    'public-profile',
  ],
  group_studio: [
    ...ALWAYS_CORE,
    'class-schedule', 'class-types', 'instructors', 'bookings', 'attendance',
    'packages', 'public-profile', 'online-booking',
  ],
  exercise_group: [
    ...ALWAYS_CORE,
    'class-billing', 'day-groups', 'pause-records', 'notes-library',
    'reports', 'activity-log', 'birthdays', 'holidays', 'tags', 'custom-fields',
  ],
  gym_membership: [...ALWAYS_CORE, 'class-schedule', 'attendance', 'packages', 'public-profile'],
  yoga_studio: [...ALWAYS_CORE, 'class-schedule', 'class-types', 'instructors', 'bookings', 'packages', 'public-profile'],
  solo_trainer: [...ALWAYS_CORE, 'session-logging', 'workout-builder', 'packages', 'public-profile'],
  athletic_performance: [...ALWAYS_CORE, 'session-logging', 'workout-builder', 'public-profile'],
  online_coach: [...ALWAYS_CORE, 'check-ins', 'session-logging', 'workout-builder', 'intake-forms', 'public-profile'],
};

export function starterBundle(templateSlug: string | undefined): string[] {
  if (templateSlug && STARTER_BUNDLES[templateSlug]) return STARTER_BUNDLES[templateSlug];
  return ALWAYS_CORE;
}

/** Modules available to OFFER for a given template (for the switchboard). */
export function modulesForTemplate(templateSlug: string | undefined): AppModule[] {
  return MODULES.filter(
    (m) =>
      m.templates === 'all' ||
      (templateSlug ? m.templates.includes(templateSlug) : false),
  );
}

// ── Hook ─────────────────────────────────────────────────────────────

interface TrainerModulesRow {
  public_profile: Record<string, unknown> | null;
}

export function useEnabledModules(templateSlug: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['app-modules', user?.id],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      const profile = (data as TrainerModulesRow).public_profile ?? {};
      const stored = (profile as Record<string, unknown>).modules as
        | { enabled?: string[] }
        | undefined;
      if (stored?.enabled && Array.isArray(stored.enabled)) {
        return new Set(stored.enabled);
      }
      // No stored set yet — default to the template's starter bundle.
      return new Set(starterBundle(templateSlug));
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: Set<string>) => {
      if (!user) throw new Error('Not signed in');
      const { data: cur, error: e1 } = await supabase
        .from('trainers')
        .select('public_profile')
        .eq('id', user.id)
        .single();
      if (e1) throw e1;
      const profile = ((cur as TrainerModulesRow | null)?.public_profile ?? {}) as Record<
        string,
        unknown
      >;
      const nextProfile = { ...profile, modules: { enabled: Array.from(next) } };
      const { error } = await supabase
        .from('trainers')
        .update({ public_profile: nextProfile })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-modules'] }),
  });

  const enabled = query.data ?? new Set(starterBundle(templateSlug));

  function isOn(id: string): boolean {
    const mod = MODULE_BY_ID[id];
    if (mod?.core) return true;
    return enabled.has(id);
  }

  function toggle(id: string) {
    const mod = MODULE_BY_ID[id];
    if (mod?.core) return; // can't toggle core
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    save.mutate(next);
  }

  return { enabled, isOn, toggle, isLoading: query.isLoading, saving: save.isPending };
}
