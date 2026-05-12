// Dojo settings — discipline + belt system + dojo identity. Settings here
// drive the rest of the dojo app's behavior (which belt sequence is
// rendered, what the sensei is called).

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, ShieldCheck, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { DOJO_COLORS, BELT_SYSTEMS, type BeltSystemId } from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoButton,
} from '../components/DojoUI';
import { BeltChip } from '../components/BeltChip';

export function DojoSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  const [dojoName, setDojoName] = useState(trainer?.business_name ?? '');
  const [system, setSystem] = useState<BeltSystemId>('karate');

  // Sync when trainer first loads.
  useMemo(() => {
    if (trainer?.business_name && !dojoName) setDojoName(trainer.business_name);
  }, [trainer, dojoName]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('trainers')
        .update({ business_name: dojoName.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer'] }),
  });

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="The dojo"
        title="Settings"
        subtitle="Identity, discipline, belt system. These shape the rest of the dojo app."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DojoCard accent="brand">
          <DojoSectionHeader
            icon={<SettingsIcon size={14} />}
            title="Dojo identity"
          />
          <div className="p-4 space-y-3">
            <div>
              <label
                className="block text-xs uppercase tracking-wider font-semibold mb-1"
                style={{ color: DOJO_COLORS.textSecondary }}
              >
                Dojo name
              </label>
              <input
                value={dojoName}
                onChange={(e) => setDojoName(e.target.value)}
                placeholder="e.g., Iron Wave Karate"
                className="w-full px-3 py-2 rounded text-sm focus:outline-none"
                style={{
                  background: DOJO_COLORS.bgInset,
                  color: DOJO_COLORS.textPrimary,
                  border: `1px solid ${DOJO_COLORS.divider}`,
                }}
              />
              <p
                className="text-xs mt-2"
                style={{ color: DOJO_COLORS.textMuted }}
              >
                Shown in the sidebar, public profile, and student emails.
              </p>
            </div>
            <DojoButton onClick={() => save.mutate()} disabled={save.isPending}>
              <Save size={14} /> {save.isPending ? 'Saving…' : 'Save'}
            </DojoButton>
            {save.error && (
              <p className="text-xs" style={{ color: DOJO_COLORS.danger }}>
                {(save.error as Error).message}
              </p>
            )}
            {save.isSuccess && !save.isPending && (
              <p className="text-xs" style={{ color: DOJO_COLORS.ok }}>
                Saved.
              </p>
            )}
          </div>
        </DojoCard>

        <DojoCard accent="gold">
          <DojoSectionHeader
            icon={<ShieldCheck size={14} />}
            title="Belt system"
            hint="Drives the Belts page + promotion order"
          />
          <div className="p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(BELT_SYSTEMS) as BeltSystemId[]).map((id) => {
                const active = system === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSystem(id)}
                    className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                    style={{
                      background: active
                        ? DOJO_COLORS.brand
                        : DOJO_COLORS.bgInset,
                      color: active ? '#FFF' : DOJO_COLORS.textSecondary,
                      border: `1px solid ${active ? DOJO_COLORS.brand : DOJO_COLORS.divider}`,
                    }}
                  >
                    {BELT_SYSTEMS[id].label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs" style={{ color: DOJO_COLORS.textMuted }}>
              Preview of the ranks below. Selection persists in V2 once the
              trainer schema gets a discipline column — for now, all dojos
              default to Karate at render time.
            </p>
            <div className="space-y-1.5 mt-2">
              {BELT_SYSTEMS[system].belts.map((b) => (
                <BeltChip key={b.id} belt={b} size="md" />
              ))}
            </div>
          </div>
        </DojoCard>
      </div>
    </DojoPage>
  );
}
