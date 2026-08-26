// ── The fenced roster — rule one of combining apps ───────────────────
//
// Every app owns its own people. Babysitting marks its rows 'bs:1'; the
// Coach app marks new rows 'coach:1' and NEVER shows rows carrying
// another app's marker. Legacy rows with no marker belong to the coach
// side (they predate the marker system). This is what stops a boxing
// coach's fighters or a sitter's kids from appearing as training
// clients when one person runs several businesses on one account.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Session, Payment } from '../../lib/database.types';

export const COACH_MARKER = 'coach:1';

/** Markers of OTHER apps whose people must never appear here. Grows as
 *  each new vertical app ships. */
export const FOREIGN_MARKERS = ['bs:1'];

export function isCoachClient(c: Client): boolean {
  const tags = c.tags ?? [];
  return !FOREIGN_MARKERS.some((m) => tags.includes(m));
}

export function useCoachClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-clients', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user!.id)
        .order('full_name', { ascending: true });
      if (error) throw error;
      // Fence in code, not just SQL: one place, one rule.
      return ((data ?? []) as Client[]).filter(isCoachClient);
    },
    enabled: !!user,
  });
}

/** Today's sessions (fenced to coach clients via the joined row). */
export function useTodaySessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-today-sessions', user?.id],
    queryFn: async (): Promise<(Session & { clients: Client | null })[]> => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(*)')
        .eq('trainer_id', user!.id)
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as (Session & { clients: Client | null })[];
      return rows.filter((s) => !s.clients || isCoachClient(s.clients));
    },
    enabled: !!user,
  });
}

/** This month's payments, fenced the same way. */
export function useMonthPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-month-payments', user?.id],
    queryFn: async (): Promise<(Payment & { clients: Client | null })[]> => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(*)')
        .eq('trainer_id', user!.id)
        .gte('paid_at', start.toISOString())
        .order('paid_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as (Payment & { clients: Client | null })[];
      return rows.filter((p) => !p.clients || isCoachClient(p.clients));
    },
    enabled: !!user,
  });
}

/** Create a coach client — always stamped with the coach marker. */
export function useAddCoachClient() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { full_name: string; phone?: string | null; email?: string | null }) => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('clients')
        .insert({
          trainer_id: user.id,
          full_name: input.full_name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          status: 'active',
          tags: [COACH_MARKER],
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach-clients'] }),
  });
}
