import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Copy, Check, ExternalLink, Send, FileSignature, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';

interface ClientIntake {
  id: string;
  trainer_id: string;
  client_id: string;
  token: string;
  status: 'pending' | 'completed' | 'expired';
  submitted_data: Record<string, string | null> | null;
  signature_data_url: string | null;
  waiver_text: string | null;
  submitted_at: string | null;
  expires_at: string;
  created_at: string;
}

export function IntakeStatusCard({ clientId, trainerId }: { clientId: string; trainerId: string }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ['intake-latest', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_intakes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ClientIntake | null;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      // Generate a token client-side (sufficient — RLS enforces trainer scope)
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const { data, error } = await supabase
        .from('client_intakes')
        .insert({
          trainer_id: trainerId,
          client_id: clientId,
          token,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClientIntake;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intake-latest', clientId] }),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      if (!latest) return;
      const { error } = await supabase
        .from('client_intakes')
        .update({ status: 'expired' })
        .eq('id', latest.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['intake-latest', clientId] }),
  });

  const url = latest && latest.status === 'pending' ? `${window.location.origin}/intake/${latest.token}` : null;

  function copyUrl() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-3">
        <ClipboardCheck size={18} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">Intake form</h3>
          <p className="text-xs text-slate-500">Health questionnaire + signed waiver.</p>
        </div>
      </div>

      {!latest && (
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Send size={14} />
          {create.isPending ? 'Generating…' : 'Generate intake link'}
        </button>
      )}

      {latest?.status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            Awaiting client submission
          </div>
          {url && (
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 truncate">
                {url}
              </code>
              <button
                onClick={copyUrl}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                title="Copy URL"
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
                <ExternalLink size={12} />
                Preview
              </a>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-amber-800">
            <span>Expires {formatDate(latest.expires_at)}</span>
            <button
              onClick={() => cancel.mutate()}
              className="text-amber-900 hover:text-red-700"
            >
              Cancel link
            </button>
          </div>
        </div>
      )}

      {latest?.status === 'completed' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-900">
            <Check size={14} /> Submitted {latest.submitted_at && formatDate(latest.submitted_at)}
          </div>
          {latest.submitted_data && (
            <div className="text-xs text-emerald-800 space-y-0.5">
              {latest.submitted_data.goals && (
                <div><span className="font-medium">Goals:</span> {latest.submitted_data.goals}</div>
              )}
              {latest.submitted_data.emergency_contact && (
                <div><span className="font-medium">ICE:</span> {latest.submitted_data.emergency_contact}</div>
              )}
            </div>
          )}
          {latest.signature_data_url && (
            <button
              onClick={() => setShowSignature(true)}
              className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800"
            >
              <FileSignature size={12} /> View signature
            </button>
          )}
          <div className="pt-1">
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Re-issue intake link
            </button>
          </div>
        </div>
      )}

      {latest?.status === 'expired' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-slate-700">Intake link expired without a submission.</p>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Generate a new link
          </button>
        </div>
      )}

      {showSignature && latest?.signature_data_url && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setShowSignature(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900">Signature</h4>
              <button onClick={() => setShowSignature(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <img
              src={latest.signature_data_url}
              alt="Signature"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg"
            />
            <p className="text-xs text-slate-500 mt-2">
              Submitted {latest.submitted_at && formatDate(latest.submitted_at)}.
            </p>
            {latest.waiver_text && (
              <details className="mt-3 text-xs text-slate-600">
                <summary className="cursor-pointer text-slate-700 font-medium">Waiver text</summary>
                <p className="mt-2 leading-relaxed">{latest.waiver_text}</p>
              </details>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
