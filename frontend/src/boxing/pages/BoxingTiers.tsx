// Tiers — Recreational / Amateur / Pro pipeline. Replaces the dojo's
// Belts page. Shows fighters grouped by tier, with each fighter's
// W-L-D record and weight class. The coach can promote a fighter
// up the pipeline (rec → amateur → pro) directly from here.

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, ChevronUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  BOXING_COLORS,
  FIGHTER_TIERS,
  readTierFromTags,
  readWeightFromTags,
  computeRecord,
  TIER_TAG_PREFIX,
  type FightRow,
  type FighterTier,
} from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingStatTile,
} from '../components/BoxingUI';
import { FighterRecordChip } from '../components/FighterRecord';

export function BoxingTiers() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: fighters } = useQuery({
    queryKey: ['boxing-fighters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const { data: fights } = useQuery({
    queryKey: ['boxing-fights', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('boxing_fights').select('*');
      if (error) {
        if ((error.message ?? '').toLowerCase().includes('boxing_fights')) {
          return [] as FightRow[];
        }
        throw error;
      }
      return (data ?? []) as FightRow[];
    },
  });

  const fightsByFighter = useMemo(() => {
    const m = new Map<string, FightRow[]>();
    (fights ?? []).forEach((f) => {
      const a = m.get(f.fighter_id) ?? [];
      a.push(f);
      m.set(f.fighter_id, a);
    });
    return m;
  }, [fights]);

  const grouped = useMemo(() => {
    const byTier = new Map<string, Client[]>();
    FIGHTER_TIERS.forEach((t) => byTier.set(t.id, []));
    (fighters ?? []).forEach((f) => {
      const tier = readTierFromTags(f.tags);
      byTier.get(tier.id)!.push(f);
    });
    return byTier;
  }, [fighters]);

  const promote = useMutation({
    mutationFn: async (fighterId: string) => {
      const fighter = (fighters ?? []).find((x) => x.id === fighterId);
      if (!fighter) throw new Error('Fighter not found');
      const cur = readTierFromTags(fighter.tags);
      const idx = FIGHTER_TIERS.findIndex((t) => t.id === cur.id);
      const next = FIGHTER_TIERS[idx + 1];
      if (!next) throw new Error('Already at the top of the pipeline.');
      const newTags = (fighter.tags ?? []).filter(
        (t) => !t.startsWith(TIER_TAG_PREFIX),
      );
      newTags.push(`${TIER_TAG_PREFIX}${next.id}`);
      const { error } = await supabase
        .from('clients')
        .update({ tags: newTags })
        .eq('id', fighterId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boxing-fighters'] }),
  });

  return (
    <BoxingPage>
      <BoxingPageHeader
        eyebrow="The pipeline"
        title="Tiers"
        subtitle="Recreational → Amateur → Pro. The path your fighters climb."
        corner="split"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {FIGHTER_TIERS.map((t) => (
          <BoxingStatTile
            key={t.id}
            label={t.label}
            value={grouped.get(t.id)!.length}
            emphasis={t.id === 'pro' ? 'red' : t.id === 'amateur' ? 'blue' : 'normal'}
            sublabel={t.description}
          />
        ))}
      </div>

      <div className="space-y-4">
        {FIGHTER_TIERS.map((tier, idx) => {
          const list = grouped.get(tier.id)!;
          const isMaxTier = idx === FIGHTER_TIERS.length - 1;
          return (
            <TierSection
              key={tier.id}
              tier={tier}
              fighters={list}
              fightsByFighter={fightsByFighter}
              isMaxTier={isMaxTier}
              onPromote={(id) => promote.mutate(id)}
              promoting={promote.isPending}
            />
          );
        })}
      </div>
    </BoxingPage>
  );
}

function TierSection({
  tier,
  fighters,
  fightsByFighter,
  isMaxTier,
  onPromote,
  promoting,
}: {
  tier: FighterTier;
  fighters: Client[];
  fightsByFighter: Map<string, FightRow[]>;
  isMaxTier: boolean;
  onPromote: (id: string) => void;
  promoting: boolean;
}) {
  return (
    <BoxingCard accent={tier.id === 'pro' ? 'red' : tier.id === 'amateur' ? 'blue' : 'none'}>
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: BOXING_COLORS.divider }}
      >
        <span
          aria-hidden
          className="w-3 h-3 rounded-full"
          style={{ background: tier.color }}
        />
        <h2
          className="font-black uppercase tracking-wider text-base"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: BOXING_COLORS.textPrimary,
            letterSpacing: '0.08em',
          }}
        >
          {tier.label}
        </h2>
        <span className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
          {fighters.length} fighter{fighters.length === 1 ? '' : 's'}
        </span>
        <span
          className="text-xs ml-auto max-w-md truncate"
          style={{ color: BOXING_COLORS.textMuted }}
        >
          {tier.description}
        </span>
      </div>
      {fighters.length === 0 ? (
        <p
          className="px-4 py-6 text-sm text-center"
          style={{ color: BOXING_COLORS.textMuted }}
        >
          Nobody at this tier yet.
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: BOXING_COLORS.divider }}>
          {fighters.map((f) => {
            const weight = readWeightFromTags(f.tags);
            const record = computeRecord(fightsByFighter.get(f.id) ?? []);
            return (
              <li
                key={f.id}
                className="px-4 py-3 flex items-center gap-4"
              >
                <Layers size={14} style={{ color: tier.color }} />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold truncate"
                    style={{ color: BOXING_COLORS.textPrimary }}
                  >
                    {f.full_name}
                  </p>
                  <p className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
                    {weight?.label ?? 'No weight class set'}
                  </p>
                </div>
                <FighterRecordChip record={record} size="md" />
                {isMaxTier ? (
                  <span
                    className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded"
                    style={{
                      background: 'transparent',
                      color: BOXING_COLORS.textMuted,
                      border: `1px dashed ${BOXING_COLORS.divider}`,
                    }}
                  >
                    Top tier
                  </span>
                ) : (
                  <button
                    onClick={() => onPromote(f.id)}
                    disabled={promoting}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded disabled:opacity-40 hover:opacity-90"
                    style={{ background: BOXING_COLORS.red, color: BOXING_COLORS.onRed }}
                  >
                    <ChevronUp size={12} /> Move up
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </BoxingCard>
  );
}
