import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinkIcon, Copy, Check, ExternalLink, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';

interface PortalInvite {
  id: string;
  trainer_id: string;
  client_id: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at: string | null;
}

export function ClientPortalInviteCard({
  clientId,
  trainerId,
  authUserId,
}: {
  clientId: string;
  trainerId: string;
  authUserId: string | null;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ['portal-invite-latest', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_invites')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PortalInvite | null;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const { error } = await supabase.from('client_portal_invites').insert({
        trainer_id: trainerId,
        client_id: clientId,
        token,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-invite-latest', clientId] }),
  });

  const revoke = useMutation({
    mutationFn: async () => {
      if (!latest) return;
      const { error } = await supabase
        .from('client_portal_invites')
        .update({ status: 'revoked' })
        .eq('id', latest.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-invite-latest', clientId] }),
  });

  const linked = !!authUserId;
  const url = latest && latest.status === 'pending' ? `${window.location.origin}/portal-join/${latest.token}` : null;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-3">
        <LinkIcon size={18} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Client portal access</h3>
          <p className="text-xs text-slate-500">
            Lets your client log in and see their schedule, balance, and payments.
          </p>
        </div>
      </div>

      {linked && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
          <Check size={14} /> Portal active for this client.
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="ml-auto text-xs text-emerald-700 hover:text-emerald-900"
            title="Issue a new invite link (replaces access)"
          >
            Re-issue link
          </button>
        </div>
      )}

      {!linked && !latest && (
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Send size={14} />
          {create.isPending ? 'Generating…' : 'Generate portal invite'}
        </button>
      )}

      {!linked && latest?.status === 'pending' && url && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">Awaiting client signup</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 truncate">
              {url}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
            >
              <ExternalLink size={12} /> Preview
            </a>
          </div>
          <div className="flex items-center justify-between text-xs text-amber-800">
            <span>Expires {formatDate(latest.expires_at)}</span>
            <button onClick={() => revoke.mutate()} className="text-amber-900 hover:text-red-700 flex items-center gap-1">
              <X size={11} /> Revoke
            </button>
          </div>
        </div>
      )}

      {!linked && latest && (latest.status === 'expired' || latest.status === 'revoked') && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-sm text-slate-700">
          <p>{latest.status === 'expired' ? 'Last invite expired.' : 'Last invite was revoked.'}</p>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Generate a new link
          </button>
        </div>
      )}
    </section>
  );
}
