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
import { useDemo } from '../demo/flag';

export interface ChatAttachment {
  /** Storage path inside the private 'chat-photos' bucket. */
  path: string;
  name?: string;
  mime?: string;
}

export interface ChatMessage {
  id: string;
  client_id: string;
  sender: 'trainer' | 'client';
  body: string;
  attachments: ChatAttachment[] | null;
  read_at: string | null;
  created_at: string;
}

export const CHAT_BUCKET = 'chat-photos';
/** Phones take huge photos; anything past this is refused with a clear
 *  message rather than a silent failure halfway through the upload. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

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
  const demo = useDemo();
  return useQuery({
    queryKey: ['bs-chat', demo ? 'demo' : user?.id],
    queryFn: async (): Promise<ChatMessage[]> => {
      // The demo has no database and no signed-in user, but its chat is a
      // real conversation against the in-memory store.
      if (demo) {
        const { demoChat } = await import('../demo/demoStore');
        return demoChat().map((m) => ({ ...m, attachments: m.attachments ?? null }));
      }
      const { data, error } = await supabase
        .from('messages')
        .select('id, client_id, sender, body, attachments, read_at, created_at')
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
    enabled: enabled && (demo || !!user),
    // A conversation should feel alive without a socket: poll while the
    // tab is open, and refetch the moment it regains focus.
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

export function useSendChat() {
  const { user } = useAuth();
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      clientId: string;
      trainerId: string;
      sender: 'trainer' | 'client';
      body: string;
      attachments?: ChatAttachment[];
    }) => {
      if (demo) {
        const { demoSendChat } = await import('../demo/demoStore');
        demoSendChat({
          client_id: args.clientId,
          sender: args.sender,
          body: args.body,
          attachments: args.attachments ?? null,
        });
        return;
      }
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('messages').insert({
        trainer_id: args.trainerId,
        client_id: args.clientId,
        sender: args.sender,
        body: args.body,
        attachments: args.attachments ?? [],
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bs-chat'] }),
  });
}

/** Mark the other side's messages in a thread as read. Best-effort:
 *  a failure here should never interrupt reading the conversation. */
export function useMarkThreadRead() {
  const demo = useDemo();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { clientIds: string[]; from: 'trainer' | 'client' }) => {
      if (!args.clientIds.length) return;
      if (demo) {
        const { demoMarkChatRead } = await import('../demo/demoStore');
        demoMarkChatRead(args.clientIds, args.from);
        return;
      }
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

/** Put one photo in the private bucket and hand back its stored path.
 *  Folder is {trainer_id}/{client_id}/… — the storage policies key off
 *  that shape, so a parent can only ever write into their own kid's
 *  folder. */
export async function uploadChatPhoto(
  file: File,
  trainerId: string,
  clientId: string,
): Promise<ChatAttachment> {
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("That picture is too big — please send one under 10MB.");
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${trainerId}/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
  if (error) {
    // The photo storage area is created by supabase/40_chat_photos.sql.
    // Until that has been run, say so in plain words instead of leaking
    // a raw storage error at a babysitter.
    const m = error.message || '';
    if (/bucket|not found|404/i.test(m)) {
      throw new Error('Photo sending isn\'t switched on for this account yet — everything else in chat works.');
    }
    throw new Error(m);
  }
  return { path, name: file.name, mime: file.type };
}

/** Signed links for every photo in a thread, in one round trip. The
 *  bucket is private, so links are short-lived by design. */
export function useChatPhotoUrls(messages: ChatMessage[]) {
  const paths = messages
    .flatMap((m) => m.attachments ?? [])
    .map((a) => a.path)
    .filter(Boolean);
  return useQuery({
    queryKey: ['bs-chat-photos', paths.join(',')],
    queryFn: async (): Promise<Record<string, string>> => {
      if (!paths.length) return {};
      const { data, error } = await supabase.storage
        .from(CHAT_BUCKET)
        .createSignedUrls(paths, 60 * 60);
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const row of data ?? []) {
        if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
      }
      return out;
    },
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });
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
