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
import { useDemo } from '../demo/flag';
import {
  demoKids,
  demoPayments,
  demoAddPayment,
  demoDeletePayment,
  demoSetKidTags,
  demoSetKidStatus,
  demoUpsertKid,
} from '../demo/demoStore';

/** Marker tag that stamps a clients row as a babysitting kid. */
export const KID_MARKER = 'bs:1';

// ── Kids ──────────────────────────────────────────────────────────────
export function useKids() {
  const { user } = useAuth();
  const demo = useDemo();
  return useQuery({
    queryKey: ['babysitting-kids', demo ? 'demo' : user?.id],
    queryFn: async (): Promise<Client[]> => {
      if (demo) return demoKids();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', user!.id)
        .contains('tags', [KID_MARKER])
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
    enabled: demo || !!user,
  });
}

// ── Payments ──────────────────────────────────────────────────────────
export function usePayments() {
  const { user } = useAuth();
  const demo = useDemo();
  return useQuery({
    queryKey: ['babysitting-payments', demo ? 'demo' : user?.id],
    queryFn: async (): Promise<Payment[]> => {
      if (demo) return demoPayments();
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('trainer_id', user!.id)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: demo || !!user,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['babysitting-kids'] });
  qc.invalidateQueries({ queryKey: ['babysitting-payments'] });
}

// ── Mutations ─────────────────────────────────────────────────────────

/** Read the row's tags back from the database, then apply the change to
 *  THOSE, never to the copy the screen was holding.
 *
 *  Everything about a kid lives in one tags array — what they owe, what
 *  they've paid, their days, their family, and whether their parent said
 *  yes to texts. Writing the whole array from a stale copy silently
 *  reverts anything that changed in between: a second payment recorded
 *  before the list refreshed, or — since parents can now switch texts on
 *  themselves — a mother's consent being quietly put back after she
 *  turned it off.
 *
 *  Falls back to the caller's copy only if the read itself fails, which
 *  is still better than not writing the payment at all. */
async function updateTags(
  clientId: string,
  fallback: string[],
  change: (tags: string[]) => string[],
): Promise<void> {
  let base = fallback;
  const { data, error } = await supabase
    .from('clients')
    .select('tags')
    .eq('id', clientId)
    .single();
  if (!error && data) base = ((data as { tags: string[] | null }).tags ?? []) as string[];
  const { error: writeErr } = await supabase
    .from('clients')
    .update({ tags: change(base) })
    .eq('id', clientId);
  if (writeErr) throw writeErr;
}

/** Record money received: insert a payments row, bump totalpaid. */
export function useRecordPayment() {
  const demo = useDemo();
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
      if (demo) {
        demoAddPayment(input);
        demoSetKidTags(input.client_id, tagsAfterPayment(input.currentTags, input.amount));
        return;
      }
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
      await updateTags(input.client_id, input.currentTags, (tags) =>
        tagsAfterPayment(tags, input.amount),
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Delete a payment AND hand the money back to the balance. */
export function useDeletePayment() {
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      client_id: string;
      amount: number;
      currentTags: string[];
    }) => {
      if (demo) {
        demoDeletePayment(input.id);
        demoSetKidTags(input.client_id, tagsAfterPaymentDeleted(input.currentTags, input.amount));
        return;
      }
      const { error } = await supabase.from('payments').delete().eq('id', input.id);
      if (error) throw error;
      await updateTags(input.client_id, input.currentTags, (tags) =>
        tagsAfterPaymentDeleted(tags, input.amount),
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Bill a kid (flat week, hours × rate, one-off, or adjustment).
 *  Negative amount = credit. Callers also append a ChargeEntry + log to
 *  the config blob so the billing history stays reviewable. */
export function useAddCharge() {
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      amount: number;
      currentTags: string[];
    }) => {
      if (demo) {
        demoSetKidTags(input.client_id, tagsAfterCharge(input.currentTags, input.amount));
        return;
      }
      await updateTags(input.client_id, input.currentTags, (tags) =>
        tagsAfterCharge(tags, input.amount),
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Create or update a kid. Profile fields map to real columns; the
 *  babysitting-specific ones ride the tags (already encoded by caller). */
export function useUpsertKid() {
  const demo = useDemo();
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
      /** Preferred on an EDIT: how to get from the row's tags as they are
       *  in the database right now to what the form wants. The form only
       *  owns the fields it shows — a payment that landed while the form
       *  was open, or a mother switching texts off in her own portal, are
       *  not the form's to undo. `tags` stays as the fallback if the
       *  re-read fails. */
      tagsFrom?: (current: string[]) => string[];
      status?: 'active' | 'paused' | 'archived';
    }) => {
      let tags = input.tags.includes(KID_MARKER)
        ? input.tags
        : [KID_MARKER, ...input.tags];
      if (demo) return demoUpsertKid({ ...input, tags });
      if (!user) throw new Error('Not signed in');
      if (input.id && input.tagsFrom) {
        const { data: cur, error: readErr } = await supabase
          .from('clients')
          .select('tags')
          .eq('id', input.id)
          .single();
        if (!readErr && cur) {
          const fresh = input.tagsFrom(((cur as { tags: string[] | null }).tags ?? []) as string[]);
          tags = fresh.includes(KID_MARKER) ? fresh : [KID_MARKER, ...fresh];
        }
      }
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

/** Repair tool: write a kid's tags directly (totals fixes, merges). */
export function useSetKidTags() {
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; tags: string[] }) => {
      if (demo) {
        demoSetKidTags(input.id, input.tags);
        return;
      }
      const { error } = await supabase.from('clients').update({ tags: input.tags }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

/** Repair tool: delete one payment row WITHOUT touching any kid's tags —
 *  only for ghost payments whose kid no longer exists. */
export function useDeleteGhostPayment() {
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      if (demo) {
        demoDeletePayment(input.id);
        return;
      }
      const { error } = await supabase.from('payments').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetKidStatus() {
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: 'active' | 'paused' | 'archived' }) => {
      if (demo) {
        demoSetKidStatus(input.id, input.status);
        return;
      }
      const { error } = await supabase
        .from('clients')
        .update({ status: input.status })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(qc),
  });
}
