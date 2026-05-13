// The Climb — tier pipeline drawn as a literal vertical ladder. Pro at
// the TOP (the peak), Amateur in the middle, Recreational at the bottom.
// Fighter portrait rows are nested inside each band so the page reads
// as a climb upward. Each fighter has a "Move up" button.
//
// This is NOT the dojo's "rank section card stack" layout — the ladder
// shape (top-to-bottom Pro→Rec) and the chevron-marked promotion path
// are the design language.

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  C,
  DISPLAY_FONT,
  FIGHTER_TIERS,
  readTier,
  readWeight,
  computeRecord,
  recordString,
  TIER_TAG,
  type FightRow,
  type FighterTier,
} from '../theme';

export function ClimbPage() {
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
        if ((error.message ?? '').toLowerCase().includes('boxing_fights')) return [] as FightRow[];
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

  // Pro at top, Amateur middle, Rec bottom — reverse default order.
  const reversedTiers = useMemo(() => [...FIGHTER_TIERS].reverse(), []);

  const byTier = useMemo(() => {
    const m = new Map<string, Client[]>();
    FIGHTER_TIERS.forEach((t) => m.set(t.id, []));
    (fighters ?? []).forEach((f) => {
      m.get(readTier(f.tags).id)!.push(f);
    });
    return m;
  }, [fighters]);

  const promote = useMutation({
    mutationFn: async (id: string) => {
      const fighter = (fighters ?? []).find((x) => x.id === id);
      if (!fighter) throw new Error('Fighter not found');
      const cur = readTier(fighter.tags);
      const idx = FIGHTER_TIERS.findIndex((t) => t.id === cur.id);
      const next = FIGHTER_TIERS[idx + 1];
      if (!next) throw new Error('Already at the top.');
      const newTags = (fighter.tags ?? []).filter((t) => !t.startsWith(TIER_TAG));
      newTags.push(`${TIER_TAG}${next.id}`);
      const { error } = await supabase.from('clients').update({ tags: newTags }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boxing-fighters'] }),
  });

  return (
    <div>
      {/* Masthead */}
      <div
        className="px-4 sm:px-8 py-8 border-b text-center"
        style={{ background: C.inkSoft, borderColor: C.rule }}
      >
        <p className="text-[10px] uppercase tracking-[0.5em] mb-2" style={{ color: C.red }}>
          The Pipeline
        </p>
        <h1
          className="font-black uppercase"
          style={{
            fontFamily: DISPLAY_FONT,
            color: C.text,
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '0.04em',
            lineHeight: 0.9,
          }}
        >
          The Climb
        </h1>
        <p className="text-xs uppercase tracking-[0.3em] mt-3" style={{ color: C.textDim }}>
          Rec → Amateur → Pro
        </p>
      </div>

      {/* The ladder — Pro at top */}
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* The center spine line — runs the length of the ladder */}
        <div
          className="absolute top-12 bottom-12 w-px"
          style={{ left: '50%', background: C.rule }}
          aria-hidden
        />

        {reversedTiers.map((tier, i) => (
          <ClimbBand
            key={tier.id}
            tier={tier}
            fighters={byTier.get(tier.id)!}
            isTop={i === 0}
            isBottom={i === reversedTiers.length - 1}
            fightsByFighter={fightsByFighter}
            onPromote={(id) => promote.mutate(id)}
            promoting={promote.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function ClimbBand({
  tier,
  fighters,
  isTop,
  isBottom,
  fightsByFighter,
  onPromote,
  promoting,
}: {
  tier: FighterTier;
  fighters: Client[];
  isTop: boolean;
  isBottom: boolean;
  fightsByFighter: Map<string, FightRow[]>;
  onPromote: (id: string) => void;
  promoting: boolean;
}) {
  return (
    <div className="relative mb-10">
      {/* Tier capstone — sits centered above the band */}
      <div className="flex flex-col items-center mb-4">
        {!isTop && (
          <ChevronUp size={20} className="mb-2" style={{ color: tier.color }} />
        )}
        <div
          className="px-4 py-2 text-center"
          style={{
            background: C.inkSoft,
            border: `2px solid ${tier.color}`,
          }}
        >
          <p
            className="font-black uppercase"
            style={{
              fontFamily: DISPLAY_FONT,
              color: tier.color,
              fontSize: '1.5rem',
              letterSpacing: '0.15em',
              lineHeight: 1,
            }}
          >
            {tier.label}
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.2em] mt-1"
            style={{ color: C.textDim }}
          >
            {fighters.length} fighter{fighters.length === 1 ? '' : 's'}
            {isTop ? ' · top of the climb' : ''}
          </p>
        </div>
      </div>

      {/* Fighter rows under the capstone */}
      {fighters.length === 0 ? (
        <p
          className="text-center text-[11px] uppercase tracking-[0.3em] py-3"
          style={{ color: C.textFaint }}
        >
          nobody at this rung
        </p>
      ) : (
        <div className="space-y-2">
          {fighters.map((f) => {
            const record = computeRecord(fightsByFighter.get(f.id) ?? []);
            const weight = readWeight(f.tags);
            return (
              <div
                key={f.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5"
                style={{
                  background: C.inkSoft,
                  border: `1px solid ${C.rule}`,
                  borderLeft: `3px solid ${tier.color}`,
                }}
              >
                <div className="min-w-0">
                  <p
                    className="font-black uppercase truncate"
                    style={{
                      fontFamily: DISPLAY_FONT,
                      color: C.text,
                      letterSpacing: '0.04em',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    {f.full_name}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-[0.25em] mt-1"
                    style={{ color: C.textDim }}
                  >
                    {weight?.label ?? 'no weight class'}
                  </p>
                </div>
                <span
                  className="font-mono"
                  style={{ color: C.beltGold, fontSize: '0.95rem' }}
                  title={`${record.w} W · ${record.l} L · ${record.d} D`}
                >
                  {record.total === 0 ? '—' : recordString(record)}
                </span>
                {isTop ? (
                  <span
                    className="text-[10px] uppercase tracking-widest px-2.5 py-1"
                    style={{
                      background: 'transparent',
                      color: C.textFaint,
                      border: `1px dashed ${C.rule}`,
                    }}
                  >
                    Top tier
                  </span>
                ) : (
                  <button
                    onClick={() => onPromote(f.id)}
                    disabled={promoting}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 disabled:opacity-40"
                    style={{
                      fontFamily: DISPLAY_FONT,
                      background: C.red,
                      color: '#FFF',
                      letterSpacing: '0.15em',
                    }}
                  >
                    <ChevronUp size={11} /> Climb
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Description as a tear-off note at the bottom of the band */}
      {!isBottom && (
        <p
          className="text-[10px] uppercase tracking-[0.3em] text-center mt-4"
          style={{ color: C.textFaint }}
        >
          {tier.description}
        </p>
      )}
    </div>
  );
}
