// ── Workouts: plans, live logs, and "last time" ──────────────────────
//
// Rides the existing tables — no migrations:
//   workout_plans: one row per WORKOUT DAY ("Lower A"), exercises as a
//     JSON block list. client_id null = the coach's template.
//   workout_logs: what actually happened — same block shape plus the
//     per-set actuals. RLS already lets clients write their OWN logs,
//     which is what powers the client app's solo days.
//
// Extra JSON keys (group, rest_sec, set_actuals) are invisible to the
// classic app, so both apps stay compatible.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { WorkoutPlan } from '../../lib/database.types';

export interface SetActual {
  weight: number | null;
  reps: number | null;
}

export interface CoachBlock {
  name: string;
  sets: number;
  reps: number | string; // "8-12", 10, "AMRAP"
  weight: number | null; // starting suggestion
  rest_sec?: number;
  notes?: string | null;
  /** Superset letter — blocks sharing a letter run together (A1/A2). */
  group?: string;
}

export interface ActualBlock extends CoachBlock {
  set_actuals: SetActual[];
}

export interface CoachLog {
  id: string;
  trainer_id: string;
  client_id: string;
  session_id: string | null;
  plan_id: string | null;
  exercises_actual: ActualBlock[];
  rpe: number | null;
  notes: string | null;
  logged_at: string;
}

/** "60 lb × 8 · 8 · 7" from a logged block. */
export function summarizeActual(b: ActualBlock): string {
  const done = (b.set_actuals ?? []).filter((s) => s.reps != null);
  if (!done.length) return '—';
  const w = done.find((s) => s.weight != null)?.weight;
  const reps = done.map((s) => s.reps).join(' · ');
  return w != null ? `${w} lb × ${reps}` : `${reps} reps`;
}

// ── Plans ─────────────────────────────────────────────────────────────
export function usePlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-plans', user?.id],
    queryFn: async (): Promise<WorkoutPlan[]> => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('trainer_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
    enabled: !!user,
  });
}

export function useSavePlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      client_id: string | null;
      exercises: CoachBlock[];
      description?: string | null;
    }) => {
      if (!user) throw new Error('Not signed in');
      const row = {
        name: input.name,
        client_id: input.client_id,
        description: input.description ?? null,
        exercises: input.exercises,
        is_template: input.client_id === null,
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase.from('workout_plans').update(row).eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from('workout_plans')
        .insert({ trainer_id: user.id, ...row })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-plans'] }),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-plans'] }),
  });
}

/** Hand a template to a client: copy the day into their plan list. */
export function useAssignPlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { template: WorkoutPlan; client_id: string }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('workout_plans').insert({
        trainer_id: user.id,
        client_id: input.client_id,
        name: input.template.name,
        description: input.template.description,
        exercises: input.template.exercises,
        is_template: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-plans'] }),
  });
}

// ── Logs ──────────────────────────────────────────────────────────────
/** The most recent log per plan for a client — powers "last time". */
export function useClientLogs(clientId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-logs', clientId],
    queryFn: async (): Promise<CoachLog[]> => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('client_id', clientId!)
        .order('logged_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as CoachLog[];
    },
    enabled: !!user && !!clientId,
  });
}

/** Latest actuals per exercise NAME across a client's recent logs —
 *  what "last time: 60 × 8,8,7" reads from, plan or no plan. */
export function lastByExercise(logs: CoachLog[] | undefined): Map<string, ActualBlock> {
  const m = new Map<string, ActualBlock>();
  for (const log of logs ?? []) {
    for (const b of log.exercises_actual ?? []) {
      const key = (b.name ?? '').trim().toLowerCase();
      if (key && !m.has(key)) m.set(key, b);
    }
  }
  return m;
}

export function useSaveLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      trainer_id: string;
      client_id: string;
      session_id?: string | null;
      plan_id?: string | null;
      exercises_actual: ActualBlock[];
      notes?: string | null;
      rpe?: number | null;
    }) => {
      const { error } = await supabase.from('workout_logs').insert({
        trainer_id: input.trainer_id,
        client_id: input.client_id,
        session_id: input.session_id ?? null,
        plan_id: input.plan_id ?? null,
        exercises_actual: input.exercises_actual,
        notes: input.notes ?? null,
        rpe: input.rpe ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['coach-logs', v.client_id] });
    },
  });
}

/** Mark the calendar session done once the workout is saved — and if
 *  the client has a pack, burn one session off it (the session is then
 *  paid by the pack, so it never shows up as owed). */
export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sessionId: string; client?: { id: string; package_balance: number } | null }) => {
      const usePack = (input.client?.package_balance ?? 0) > 0;
      const { error } = await supabase
        .from('sessions')
        .update(usePack ? { status: 'completed', paid: true } : { status: 'completed' })
        .eq('id', input.sessionId);
      if (error) throw error;
      if (usePack && input.client) {
        const { error: e2 } = await supabase
          .from('clients')
          .update({ package_balance: input.client.package_balance - 1 })
          .eq('id', input.client.id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['coach-today-sessions'] });
      void qc.invalidateQueries({ queryKey: ['coach-clients'] });
      void qc.invalidateQueries({ queryKey: ['coach-owed'] });
    },
  });
}
