// ── Chat between the sitter and each family ──────────────────────────
//
// One thread per FAMILY, not per kid: a mother with three kids should
// have one conversation, not three. Rows live in the shared `messages`
// table, which already lets both sides read and write their own thread
// (RLS: trainer owns the row; a parent owns rows for kids linked to
// their auth user). We store every message against the family's FIRST
// kid — the "thread anchor" — so siblings share one conversation.
//
// The sitter's "note to all parents" also lands in this table, so those
// announcements appear naturally in each family's thread.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client } from '../../lib/database.types';
import { readFamilySlug } from '../theme';

export interface ChatMessage {
  id: string;
  client_id: string;
  sender: 'trainer' | 'client';
  body: string;
  read_at: string | null;
  created_at: string;
}

/** The kid whose row carries a family's whole conversation. Stable
 *  regardless of order: the oldest kid row in the family wins. */
export function threadAnchor(members: Client[]): Client {
  return [...members].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id),
  )[0];
}

/** Group a roster into family threads, each with its anchor kid. */
export function familyThreads(kids: Client[]): Array<{
  slug: string;
  members: Client[];
  anchor: Client;
}> {
  const byFam = new Map<string, Client[]>();
  for (const k of kids) {
    const slug = readFamilySlug(k) || `solo-${k.id}`;
    byFam.set(slug, [...(byFam.get(slug) ?? []), k]);
  }
  return Array.from(byFam.entries()).map(([slug, members]) => ({
    slug,
    members,
    anchor: threadAnchor(members),
  }));
}

/** Every message the signed-in person can see, newest last. The sitter
 *  gets all their threads in one query (cheaper than one per family);
 *  a parent's RLS narrows the same query to their own. */
export function useChatMessages(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['bs-chat', user?.id],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, client_id, sender, body, read_at, created_at')
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    enabled: enabled && !!user,
    // A conversation should feel alive without a socket: poll while the
    // tab is open, and refetch the moment it regains focus.
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

export function useSendChat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      clientId: string;
      trainerId: string;
      sender: 'trainer' | 'client';
      body: string;
    }) => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('messages').insert({
        trainer_id: args.trainerId,
        client_id: args.clientId,
        sender: args.sender,
        body: args.body,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bs-chat'] }),
  });
}

/** Mark the other side's messages in a thread as read. Best-effort:
 *  a failure here should never interrupt reading the conversation. */
export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { clientIds: string[]; from: 'trainer' | 'client' }) => {
      if (!args.clientIds.length) return;
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('client_id', args.clientIds)
        .eq('sender', args.from)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bs-chat'] }),
  });
}

/** Unread messages from the other side, counted per client_id. */
export function unreadByClient(
  messages: ChatMessage[] | undefined,
  from: 'trainer' | 'client',
): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of messages ?? []) {
    if (m.sender !== from || m.read_at) continue;
    out.set(m.client_id, (out.get(m.client_id) ?? 0) + 1);
  }
  return out;
}

/** Has anyone in this family actually created a portal login? Until one
 *  of them has, the sitter's messages sit unread in the database and the
 *  parent has no way to see them — so every surface that can send a
 *  message says so plainly instead of failing silently. */
export function familyHasPortal(members: Client[]): boolean {
  return members.some((m) => !!m.auth_user_id);
}

/** Clock time for a bubble — "2:14 PM" today, "Aug 12" before that. */
export function chatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
