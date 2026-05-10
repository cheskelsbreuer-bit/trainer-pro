import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface FeedbackRow {
  id: string;
  category: string;
  message: string;
  created_at: string;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_reply_seen_at: string | null;
}

/**
 * Settings card: every feedback message the trainer has sent + any reply
 * we (the Trainer Pro team) sent back. RLS policy added in
 * supabase/20_feedback_admin_reply.sql lets the trainer SELECT their own
 * feedback rows. Marking as seen is best-effort — if RLS blocks the update
 * we just swallow the error so the card still renders.
 */
export function AdminRepliesCard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feedback', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select(
          'id,category,message,created_at,admin_reply,admin_replied_at,admin_reply_seen_at',
        )
        .eq('trainer_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
    enabled: !!user,
  });

  const markSeen = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('feedback')
        .update({ admin_reply_seen_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-feedback', user?.id] }),
  });

  // Auto-mark unread admin replies as seen when this card mounts.
  useEffect(() => {
    if (!data) return;
    for (const row of data) {
      if (row.admin_reply && !row.admin_reply_seen_at) {
        markSeen.mutate(row.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle size={16} className="text-violet-600" />
        <h3 className="font-semibold text-slate-900">Messages from Trainer Pro</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Replies to feedback you&rsquo;ve sent us — and your message history.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as Error).message}</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">
          You haven&rsquo;t sent any feedback yet. Use the &ldquo;Send feedback&rdquo; button below
          to flag a bug, request a feature, or say hi.
        </p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((f) => (
            <FeedbackThread key={f.id} feedback={f} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FeedbackThread({ feedback: f }: { feedback: FeedbackRow }) {
  return (
    <li className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Original message from trainer */}
      <div className="p-3 bg-slate-50">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-medium">
            {CATEGORY_LABELS[f.category] ?? f.category}
          </span>
          <span>You</span>
          <span className="text-slate-300">·</span>
          <span>
            {new Date(f.created_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{f.message}</p>
      </div>

      {/* Admin reply */}
      {f.admin_reply ? (
        <div className="p-3 bg-blue-50 border-t border-slate-200">
          <div className="flex items-center gap-2 text-[11px] text-blue-700 mb-1">
            <Mail size={11} />
            <span className="font-semibold">Trainer Pro support</span>
            {f.admin_replied_at && (
              <>
                <span className="text-blue-300">·</span>
                <span>
                  {new Date(f.admin_replied_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </>
            )}
            {f.admin_reply_seen_at && (
              <span className="ml-auto flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 size={10} /> seen
              </span>
            )}
          </div>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            {f.admin_reply}
          </p>
        </div>
      ) : (
        <p className="px-3 py-2 text-[11px] text-slate-400 italic border-t border-slate-100 bg-white">
          Awaiting reply…
        </p>
      )}
    </li>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  feature: '✨ Feature',
  general: '💬 General',
  other: '🤷 Other',
};
