// ── Check-ins: the Sunday loop ───────────────────────────────────────
//
// Client fills a 60-second form (weight · energy · a line about the
// week) → rows in progress_entries sharing one measured_at. Coach
// reviews the queue in one sitting and replies → a messages row the
// client sees in their app. "Waiting" = a check-in with no trainer
// message after it. All existing tables, no migrations; RLS already
// lets clients write their own entries and read their own messages.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { ProgressEntry, Message } from '../../lib/database.types';

export interface CheckinBundle {
  client_id: string;
  measured_at: string;
  weight: number | null;
  energy: number | null;
  note: string | null;
}

/** Group raw entry rows into check-ins: same client, same timestamp. */
export function bundleEntries(rows: ProgressEntry[]): CheckinBundle[] {
  const map = new Map<string, CheckinBundle>();
  for (const r of rows) {
    const key = `${r.client_id}|${r.measured_at}`;
    const b = map.get(key) ?? { client_id: r.client_id, measured_at: r.measured_at, weight: null, energy: null, note: null };
    if (r.metric_type === 'weight' && r.metric_value != null) b.weight = Number(r.metric_value);
    if (r.metric_type === 'energy' && r.metric_value != null) b.energy = Number(r.metric_value);
    if (r.metric_type === 'checkin_note' && r.notes) b.note = r.notes;
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
}

/** All check-in-ish entries for this trainer, recent first. */
export function useCheckinEntries(days = 90) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-checkins', user?.id],
    queryFn: async (): Promise<ProgressEntry[]> => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('trainer_id', user!.id)
        .in('metric_type', ['weight', 'energy', 'checkin_note'])
        .gte('measured_at', since)
        .order('measured_at', { ascending: false })
        .limit(400);
      if (error) throw error;
      return (data ?? []) as ProgressEntry[];
    },
    enabled: !!user,
  });
}

/** One client's own entries (client app + profile weight math). */
export function useClientEntries(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-entries', clientId],
    queryFn: async (): Promise<ProgressEntry[]> => {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('client_id', clientId!)
        .in('metric_type', ['weight', 'energy', 'checkin_note'])
        .order('measured_at', { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as ProgressEntry[];
    },
    enabled: !!clientId,
  });
}

/** The client submits the weekly form — one batch, one timestamp. */
export function useSubmitCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      trainer_id: string;
      client_id: string;
      weight: number | null;
      energy: number | null;
      note: string;
    }) => {
      const measured_at = new Date().toISOString();
      const base = { trainer_id: input.trainer_id, client_id: input.client_id, measured_at };
      const rows: Partial<ProgressEntry>[] = [];
      if (input.weight != null) rows.push({ ...base, metric_type: 'weight', metric_value: input.weight, metric_unit: 'lb' });
      if (input.energy != null) rows.push({ ...base, metric_type: 'energy', metric_value: input.energy, metric_unit: '/5' });
      if (input.note.trim()) rows.push({ ...base, metric_type: 'checkin_note', notes: input.note.trim() });
      if (!rows.length) throw new Error('Nothing to send');
      const { error } = await supabase.from('progress_entries').insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['client-entries', v.client_id] });
      void qc.invalidateQueries({ queryKey: ['coach-checkins'] });
    },
  });
}

/** Trainer messages in the window — powers "replied" vs "waiting" on
 *  the coach side, and "from your coach" in the client app. */
export function useTrainerReplies(clientId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['coach-replies', clientId ?? 'all', user?.id],
    queryFn: async (): Promise<Message[]> => {
      let q = supabase
        .from('messages')
        .select('*')
        .eq('sender', 'trainer')
        .order('created_at', { ascending: false })
        .limit(80);
      q = clientId ? q.eq('client_id', clientId) : q.eq('trainer_id', user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    enabled: clientId ? true : !!user,
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { trainer_id: string; client_id: string; body: string }) => {
      const { error } = await supabase.from('messages').insert({
        trainer_id: input.trainer_id,
        client_id: input.client_id,
        sender: 'trainer',
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['coach-replies'] }),
  });
}

// ── Progress photos (coach uploads; storage RLS allows trainer-side) ──
export function useProgressPhotos(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-photos', clientId],
    queryFn: async (): Promise<ProgressEntry[]> => {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('client_id', clientId!)
        .like('metric_type', 'photo%')
        .order('measured_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return ((data ?? []) as ProgressEntry[]).filter((p) => p.photo_url);
    },
    enabled: !!clientId,
  });
}

export function useUploadPhoto() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { client_id: string; file: File }) => {
      if (!user) throw new Error('Not signed in');
      const ext = input.file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${input.client_id}/${Date.now()}_checkin.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('progress-photos')
        .upload(path, input.file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await supabase.from('progress_entries').insert({
        trainer_id: user.id,
        client_id: input.client_id,
        metric_type: 'photo_progress',
        photo_url: signed?.signedUrl ?? null,
        measured_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => void qc.invalidateQueries({ queryKey: ['client-photos', v.client_id] }),
  });
}
