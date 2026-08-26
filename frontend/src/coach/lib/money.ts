// ── Money: packs, owed sessions, and payments ────────────────────────
//
// Rides existing tables — no migrations:
//   clients.package_balance     prepaid sessions remaining
//   payments                    payment_type 'package' + sessions_covered
//   sessions.price / .paid      what a finished session was worth
//   trainers.default_packages   the coach's own pack menu (JSONB)
//
// The pack loop: sell a pack (payment row + balance bump) → finishing a
// session burns one (and marks it paid, so it never shows as owed) →
// balance hits 2 → the Money screen flags the renew.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Session, Payment, PaymentMethod } from '../../lib/database.types';
import { isCoachClient } from './roster';

export type OwedSession = Session & { clients: Client | null };

/** Finished-but-unpaid sessions with a real price — the "owes you" list. */
export function useOwedSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-owed', user?.id],
    queryFn: async (): Promise<OwedSession[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(*)')
        .eq('trainer_id', user!.id)
        .eq('status', 'completed')
        .eq('paid', false)
        .gt('price', 0)
        .order('starts_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as OwedSession[];
      return rows.filter((s) => !s.clients || isCoachClient(s.clients));
    },
    enabled: !!user,
  });
}

const MONEY_KEYS = [['coach-owed'], ['coach-month-payments'], ['coach-clients'], ['coach-today-sessions']];

function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  for (const k of MONEY_KEYS) void qc.invalidateQueries({ queryKey: k });
}

/** Sell a pack: one payment row + the client's balance goes up. */
export function useSellPack() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client: Client;
      sessions: number;
      amount: number;
      method: PaymentMethod | null;
      label: string; // "10-pack"
    }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: input.client.id,
        amount: input.amount,
        payment_type: input.sessions > 1 ? 'package' : 'session',
        sessions_covered: input.sessions,
        description: input.label,
        method: input.method,
      });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from('clients')
        .update({ package_balance: (input.client.package_balance ?? 0) + input.sessions })
        .eq('id', input.client.id);
      if (e2) throw e2;
    },
    onSuccess: () => invalidateMoney(qc),
  });
}

/** One tap on an owed session: mark it paid and write the payment row. */
export function useMarkSessionPaid() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { session: OwedSession; method: PaymentMethod | null }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('sessions')
        .update({ paid: true })
        .eq('id', input.session.id);
      if (error) throw error;
      const { error: e2 } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: input.session.client_id,
        amount: input.session.price ?? 0,
        payment_type: 'session',
        sessions_covered: 1,
        description: 'Session',
        method: input.method,
      });
      if (e2) throw e2;
    },
    onSuccess: () => invalidateMoney(qc),
  });
}

/** Full payment history for one client — the profile's ledger. */
export function useClientPayments(clientId: string | null | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-client-payments', clientId],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', clientId!)
        .order('paid_at', { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: !!user && !!clientId,
  });
}

/** Edit the client's card — goals, the medical flag, contact. */
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Client> }) => {
      const { error } = await supabase.from('clients').update(input.patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['coach-clients'] }),
  });
}

/** A polite payment nudge, prefilled — the coach never writes the
 *  awkward text. sms: when we have a phone, mailto: otherwise. */
export function nudgeHref(client: Client, amount: string, coachName: string): string | null {
  const msg = `Hi ${client.full_name.split(' ')[0]}! Quick note from ${coachName} — there's a balance of ${amount} on your training. You can send it whenever works today. Thank you!`;
  if (client.phone) return `sms:${client.phone}?&body=${encodeURIComponent(msg)}`;
  if (client.email) return `mailto:${client.email}?subject=${encodeURIComponent('Training balance')}&body=${encodeURIComponent(msg)}`;
  return null;
}
