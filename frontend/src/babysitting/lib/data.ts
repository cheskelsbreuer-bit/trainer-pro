// Data layer for the Babysitting app. One `clients` row per kid, tagged
// 'bs:1' so babysitting rows never mix with another vertical's roster on
// the same account. Payments live in the shared `payments` table; charges
// adjust the kid's totalowed tag (history is kept in the config blob).
//
// Balance math is centralized in ../theme.ts and always recomputed from
// totalowed - totalpaid, so recording, charging, and DELETING payments
// all keep the invariant (the exercise vertical's drift bugs are fixed
// here by construction).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Payment } from '../../lib/database.types';
import {
  tagsAfterPayment,
  tagsAfterCharge,
  tagsAfterPaymentDeleted,
} from '../theme';

/** Marker tag that stamps a clients row as a babysitting kid. */
export const KID_MARKER = 'bs:1';

// ── Kids ──────────────────────────────────────────────────────────────
export function useKids() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['babysitting-kids', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user!.id)
        .contains('tags', [KID_MARKER])
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
    enabled: !!user,
  });
}

// ── Payments ──────────────────────────────────────────────────────────
export function usePayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['babysitting-payments', user?.id],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('trainer_id', user!.id)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: !!user,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['babysitting-kids'] });
  qc.invalidateQueries({ queryKey: ['babysitting-payments'] });
}

// ── Mutations ─────────────────────────────────────────────────────────

/** Record money received: insert a payments row, bump totalpaid. */
export function useRecordPayment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      amount: number;
      paid_at: string; // ISO
      method?: string | null;
      description?: string | null;
      currentTags: string[];
    }) => {
      if (!user) throw new Error('Not signed in');
      const { error: payErr } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: input.client_id,
        amount: input.amount,
        currency: 'USD',
        payment_type: 'session',
        method: input.method ?? null,
        paid_at: input.paid_at,
        description: input.description ?? 'Babysitting payment',
      });
      if (payErr) throw payErr;
      const { error: cliErr } = await supabase
        .from('clients')
        .update({ tags: tagsAfterPayment(input.currentTags, input.amount) })
        .eq('id', input.client_id);
      if (cliErr) throw cliErr;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Delete a payment AND hand the money back to the balance. */
export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      client_id: string;
      amount: number;
      currentTags: string[];
    }) => {
      const { error } = await supabase.from('payments').delete().eq('id', input.id);
      if (error) throw error;
      const { error: cliErr } = await supabase
        .from('clients')
        .update({ tags: tagsAfterPaymentDeleted(input.currentTags, input.amount) })
        .eq('id', input.client_id);
      if (cliErr) throw cliErr;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Bill a kid (flat week, hours × rate, one-off, or adjustment).
 *  Negative amount = credit. Callers also append a ChargeEntry + log to
 *  the config blob so the billing history stays reviewable. */
export function useAddCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      amount: number;
      currentTags: string[];
    }) => {
      const { error } = await supabase
        .from('clients')
        .update({ tags: tagsAfterCharge(input.currentTags, input.amount) })
        .eq('id', input.client_id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Create or update a kid. Profile fields map to real columns; the
 *  babysitting-specific ones ride the tags (already encoded by caller). */
export function useUpsertKid() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      full_name: string;
      phone?: string | null; // parent's phone
      email?: string | null; // parent's email
      date_of_birth?: string | null; // kid's birthday (YYYY-MM-DD)
      medical_notes?: string | null; // allergies
      notes?: string | null; // care notes
      emergency_contact?: string | null;
      tags: string[];
      status?: 'active' | 'paused' | 'archived';
    }) => {
      if (!user) throw new Error('Not signed in');
      const tags = input.tags.includes(KID_MARKER)
        ? input.tags
        : [KID_MARKER, ...input.tags];
      const row = {
        full_name: input.full_name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        date_of_birth: input.date_of_birth ?? null,
        medical_notes: input.medical_notes ?? null,
        notes: input.notes ?? null,
        emergency_contact: input.emergency_contact ?? null,
        tags,
        ...(input.status ? { status: input.status } : {}),
      };
      if (input.id) {
        const { error } = await supabase.from('clients').update(row).eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from('clients')
        .insert({ trainer_id: user.id, status: 'active', ...row })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetKidStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'active' | 'paused' | 'archived' }) => {
      const { error } = await supabase
        .from('clients')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
