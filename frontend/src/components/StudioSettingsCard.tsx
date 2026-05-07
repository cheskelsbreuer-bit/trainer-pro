import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Copy, Check, ExternalLink, UserPlus, Crown, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Trainer, Studio, StudioInvite } from '../lib/database.types';

interface TeamMember {
  id: string;
  full_name: string;
  email: string | null;
  studio_role: 'owner' | 'staff' | null;
}

export function StudioSettingsCard({ trainer }: { trainer: Trainer }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newStudioName, setNewStudioName] = useState('');

  const inStudio = !!trainer.studio_id;

  // Fetch studio + members + invites if we're in one
  const { data: studio } = useQuery({
    queryKey: ['studio', trainer.studio_id],
    queryFn: async () => {
      if (!trainer.studio_id) return null;
      const { data, error } = await supabase.from('studios').select('*').eq('id', trainer.studio_id).single();
      if (error) throw error;
      return data as Studio;
    },
    enabled: inStudio,
  });

  const { data: members } = useQuery({
    queryKey: ['studio-members', trainer.studio_id],
    queryFn: async () => {
      if (!trainer.studio_id) return [];
      const { data, error } = await supabase
        .from('trainers')
        .select('id, full_name, email, studio_role')
        .eq('studio_id', trainer.studio_id);
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
    enabled: inStudio,
  });

  const { data: invites } = useQuery({
    queryKey: ['studio-invites', trainer.studio_id],
    queryFn: async () => {
      if (!trainer.studio_id) return [];
      const { data, error } = await supabase
        .from('studio_invites')
        .select('*')
        .eq('studio_id', trainer.studio_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudioInvite[];
    },
    enabled: inStudio && trainer.studio_role === 'owner',
  });

  const createStudio = useMutation({
    mutationFn: async (name: string) => {
      // Create studio
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      const { data: s, error: e1 } = await supabase
        .from('studios')
        .insert({
          name,
          slug,
          owner_id: trainer.id,
          primary_color: trainer.primary_color,
        })
        .select()
        .single();
      if (e1) throw e1;

      // Link the trainer to the studio as owner
      const { error: e2 } = await supabase
        .from('trainers')
        .update({ studio_id: s.id, studio_role: 'owner' })
        .eq('id', trainer.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', trainer.id] });
      qc.invalidateQueries({ queryKey: ['studio', trainer.studio_id] });
      setShowCreate(false);
      setNewStudioName('');
    },
  });

  const disableStudio = useMutation({
    mutationFn: async () => {
      // Owner only: leaves studio_id null on themselves and the studio row stays
      // (so they can re-enable). Staff trainers in the studio also keep their data
      // but lose visibility. To fully delete, owner can press 'Delete studio' below.
      const { error } = await supabase
        .from('trainers')
        .update({ studio_id: null, studio_role: null })
        .eq('id', trainer.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer', trainer.id] }),
  });

  const deleteStudio = useMutation({
    mutationFn: async () => {
      if (!studio) return;
      const { error } = await supabase.from('studios').delete().eq('id', studio.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', trainer.id] });
      qc.invalidateQueries({ queryKey: ['studio'] });
    },
  });

  const generateInvite = useMutation({
    mutationFn: async () => {
      if (!studio) return;
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const token = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const { error } = await supabase.from('studio_invites').insert({
        studio_id: studio.id,
        token,
        role: 'staff',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-invites', trainer.studio_id] }),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('studio_invites')
        .update({ status: 'revoked' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-invites', trainer.studio_id] }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('trainers')
        .update({ studio_id: null, studio_role: null })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio-members', trainer.studio_id] }),
  });

  // ----- render -----
  if (!inStudio) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-start gap-2 mb-3">
          <Building2 size={18} className="text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Studio mode</h3>
            <p className="text-xs text-slate-500">
              Run a studio with multiple trainers. Each trainer keeps their own clients; you see the whole picture.
            </p>
          </div>
        </div>

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Plus size={14} /> Enable studio mode
          </button>
        ) : (
          <div className="space-y-3 bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-600">
              You'll become the studio owner. You can invite trainers afterwards. Your existing clients
              and sessions stay yours.
            </p>
            <input
              type="text"
              value={newStudioName}
              onChange={(e) => setNewStudioName(e.target.value)}
              placeholder="Studio name (e.g. Peak Fitness)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {createStudio.error && (
              <p className="text-xs text-red-700">{(createStudio.error as Error).message}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => createStudio.mutate(newStudioName.trim())}
                disabled={createStudio.isPending || !newStudioName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
              >
                {createStudio.isPending ? 'Creating…' : 'Create studio'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // We're in a studio
  const isOwner = trainer.studio_role === 'owner';

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Building2 size={18} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{studio?.name || 'Studio'}</h3>
            {isOwner ? (
              <span className="text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Crown size={10} /> Owner
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Staff</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOwner
              ? `You can see all data across the studio's trainers.`
              : `You see your own clients only. The owner sees everything in the studio.`}
          </p>
        </div>
      </div>

      {/* Studio public URL */}
      {isOwner && studio?.slug && (
        <div className="bg-slate-50 rounded-lg p-3 text-xs flex items-center gap-2">
          <span className="text-slate-500">Studio booking page:</span>
          <code className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 truncate flex-1">
            {window.location.origin}/book/{studio.slug}
          </code>
          <a
            href={`/book/${studio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
          >
            <ExternalLink size={12} /> Open
          </a>
        </div>
      )}

      {/* Team list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-700">Team ({members?.length ?? 0})</h4>
          {isOwner && (
            <button
              onClick={() => generateInvite.mutate()}
              disabled={generateInvite.isPending}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg font-medium"
            >
              <UserPlus size={12} /> Invite trainer
            </button>
          )}
        </div>
        <ul className="space-y-1">
          {members?.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{m.full_name}</span>
                {m.studio_role === 'owner' && (
                  <span className="text-[10px] uppercase tracking-wide text-blue-700 bg-blue-100 px-1 py-0.5 rounded">
                    Owner
                  </span>
                )}
                <span className="text-xs text-slate-500">{m.email}</span>
              </div>
              {isOwner && m.id !== trainer.id && m.studio_role !== 'owner' && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${m.full_name} from the studio?`)) removeMember.mutate(m.id);
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Pending invites */}
      {isOwner && invites && invites.filter((i) => i.status === 'pending').length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Pending invites</h4>
          <ul className="space-y-1">
            {invites
              .filter((i) => i.status === 'pending')
              .map((i) => (
                <PendingInviteRow key={i.id} invite={i} onRevoke={() => revokeInvite.mutate(i.id)} />
              ))}
          </ul>
        </div>
      )}

      {/* Danger zone (owner) */}
      {isOwner && (
        <details className="border-t border-slate-100 pt-3">
          <summary className="text-xs text-slate-500 cursor-pointer">Danger zone</summary>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                if (confirm('Leave studio mode? You will lose visibility into other trainers but keep your own data.')) {
                  disableStudio.mutate();
                }
              }}
              className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Leave studio
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${studio?.name}" entirely? Other trainers in the studio will become solo. This cannot be undone.`)) {
                  deleteStudio.mutate();
                }
              }}
              className="flex items-center gap-1 text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={12} /> Delete studio
            </button>
          </div>
        </details>
      )}
    </section>
  );
}

function PendingInviteRow({ invite, onRevoke }: { invite: StudioInvite; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/join-studio/${invite.token}`;
  return (
    <li className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs">
      <code className="flex-1 truncate text-slate-700">{url}</code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="ml-2 flex items-center gap-1 text-blue-600 hover:text-blue-700"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button
        onClick={onRevoke}
        className="ml-2 text-red-500 hover:text-red-700"
        title="Revoke"
      >
        <X size={12} />
      </button>
    </li>
  );
}
