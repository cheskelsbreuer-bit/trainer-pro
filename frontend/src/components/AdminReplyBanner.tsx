import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface UnreadReply {
  id: string;
  admin_reply: string;
  admin_replied_at: string;
}

/**
 * Dashboard banner: shows up only if the trainer has admin replies they
 * haven't seen yet. Clicking it takes them to Settings where the full
 * thread renders and the auto-mark-as-seen effect clears the flag.
 *
 * Silently renders nothing if RLS blocks the read (older DB w/o migration 20).
 */
export function AdminReplyBanner() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['unread-admin-replies', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('id,admin_reply,admin_replied_at')
        .eq('trainer_id', user!.id)
        .not('admin_reply', 'is', null)
        .is('admin_reply_seen_at', null)
        .order('admin_replied_at', { ascending: false });
      if (error) return [] as UnreadReply[]; // RLS / column missing → just hide
      return (data ?? []) as UnreadReply[];
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
  });

  const unread = data ?? [];
  if (unread.length === 0) return null;

  const first = unread[0];
  const preview =
    first.admin_reply.length > 140
      ? first.admin_reply.slice(0, 140).trim() + '…'
      : first.admin_reply;

  return (
    <Link
      to="/settings"
      className="block bg-gradient-to-r from-violet-50 via-blue-50 to-indigo-50 border border-violet-200 rounded-xl p-4 mb-6 hover:shadow-md transition group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white text-violet-600 flex items-center justify-center shadow-sm">
          <Mail size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-slate-900">
              {unread.length === 1
                ? 'New message from Trainer Pro support'
                : `${unread.length} new messages from Trainer Pro support`}
            </p>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-600 text-white font-bold">
              New
            </span>
          </div>
          <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{preview}</p>
        </div>
        <ArrowRight
          size={16}
          className="text-violet-500 mt-2 group-hover:translate-x-0.5 transition-transform flex-shrink-0"
        />
      </div>
    </Link>
  );
}
