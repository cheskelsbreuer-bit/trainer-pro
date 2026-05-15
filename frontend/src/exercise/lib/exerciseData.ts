// Data layer for the Exercise Group app. Wraps Supabase reads/writes for
// the trainer's clients + payments. Mirrors what the original single-file
// app used to do via localStorage, but persisted in the cloud.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Payment } from '../../lib/database.types';
import { tagsAfterPayment } from '../theme';

// ── Clients ────────────────────────────────────────────────────────────
export function useExerciseClients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['exercise-clients', user?.id],
    queryFn: async (): Promise<Client[]> => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user!.id)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
    enabled: !!user,
  });
}

// ── Payments ───────────────────────────────────────────────────────────
export function useExercisePayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['exercise-payments', user?.id],
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

// ── Mutations ──────────────────────────────────────────────────────────

/** Record a payment AND bump the member's totalpaid + balance tags atomically. */
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
      // 1) Insert payment row
      const { error: payErr } = await supabase.from('payments').insert({
        trainer_id: user.id,
        client_id: input.client_id,
        amount: input.amount,
        currency: 'USD',
        payment_type: 'session',
        method: input.method ?? null,
        paid_at: input.paid_at,
        description: input.description ?? 'Class payment',
      });
      if (payErr) throw payErr;
      // 2) Update tags on the client
      const nextTags = tagsAfterPayment(input.currentTags, input.amount);
      const { error: cliErr } = await supabase
        .from('clients')
        .update({ tags: nextTags })
        .eq('id', input.client_id);
      if (cliErr) throw cliErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercise-clients'] });
      qc.invalidateQueries({ queryKey: ['exercise-payments'] });
    },
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercise-payments'] });
      qc.invalidateQueries({ queryKey: ['exercise-clients'] });
    },
  });
}

export function useUpsertClient() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      full_name: string;
      phone?: string | null;
      tags?: string[];
      status?: 'active' | 'paused' | 'archived';
    }) => {
      if (!user) throw new Error('Not signed in');
      if (input.id) {
        const { error } = await supabase
          .from('clients')
          .update({
            full_name: input.full_name,
            phone: input.phone ?? null,
            tags: input.tags ?? [],
            ...(input.status ? { status: input.status } : {}),
          })
          .eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from('clients')
        .insert({
          trainer_id: user.id,
          full_name: input.full_name,
          phone: input.phone ?? null,
          tags: input.tags ?? [],
          status: input.status ?? 'active',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data!.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercise-clients'] });
    },
  });
}

export function useSetClientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'active' | 'paused' | 'archived' }) => {
      const { error } = await supabase
        .from('clients')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercise-clients'] }),
  });
}
