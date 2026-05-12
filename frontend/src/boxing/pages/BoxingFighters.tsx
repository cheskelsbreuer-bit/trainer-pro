// Fighters roster — the gym's mat at a glance. Built like a real
// boxing app: name, tier, weight class, stance, W-L-D record,
// last in the gym. Filter by tier and by weight class.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  BOXING_COLORS,
  FIGHTER_TIERS,
  WEIGHT_CLASSES,
  readTierFromTags,
  readWeightFromTags,
  readStanceFromTags,
  computeRecord,
  TIER_TAG_PREFIX,
  WEIGHT_TAG_PREFIX,
  STANCE_TAG_PREFIX,
  type FightRow,
} from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingSectionHeader,
  BoxingButton,
} from '../components/BoxingUI';
import { FighterRecordChip, TierBadge } from '../components/FighterRecord';

export function BoxingFighters() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [weightFilter, setWeightFilter] = useState('');
  const [adding, setAdding] = useState(false);

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
      const { data, error } = await supabase
        .from('boxing_fights')
        .select('*');
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
      const arr = m.get(f.fighter_id) ?? [];
      arr.push(f);
      m.set(f.fighter_id, arr);
    });
    return m;
  }, [fights]);

  const rows = useMemo(() => {
    return (fighters ?? []).map((f) => ({
      f,
      tier: readTierFromTags(f.tags),
      weight: readWeightFromTags(f.tags),
      stance: readStanceFromTags(f.tags),
      record: computeRecord(fightsByFighter.get(f.id) ?? []),
    }));
  }, [fighters, fightsByFighter]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(({ f, tier, weight }) => {
      if (needle) {
        const hay =
          (f.full_name ?? '').toLowerCase() + ' ' + (f.email ?? '').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (tierFilter && tier.id !== tierFilter) return false;
      if (weightFilter && weight?.id !== weightFilter) return false;
      return true;
    });
  }, [rows, q, tierFilter, weightFilter]);

  return (
    <BoxingPage>
      <BoxingPageHeader
        eyebrow="The roster"
        title="Fighters"
        subtitle={
          fighters ? `${fighters.length} active in the gym` : 'Loading the gym…'
        }
        corner="red"
        action={
          <BoxingButton onClick={() => setAdding(true)}>
            <Plus size={16} /> Add fighter
          </BoxingButton>
        }
      />

      {/* Filters */}
      <BoxingCard className="mb-4">
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: BOXING_COLORS.textMuted }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fighters…"
              className="w-full pl-9 pr-3 py-1.5 rounded text-sm focus:outline-none"
              style={{
                background: BOXING_COLORS.bgInset,
                color: BOXING_COLORS.textPrimary,
                border: `1px solid ${BOXING_COLORS.divider}`,
              }}
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:outline-none"
            style={{
              background: BOXING_COLORS.bgInset,
              color: BOXING_COLORS.textPrimary,
              border: `1px solid ${BOXING_COLORS.divider}`,
            }}
          >
            <option value="">All tiers</option>
            {FIGHTER_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={weightFilter}
            onChange={(e) => setWeightFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:outline-none"
            style={{
              background: BOXING_COLORS.bgInset,
              color: BOXING_COLORS.textPrimary,
              border: `1px solid ${BOXING_COLORS.divider}`,
            }}
          >
            <option value="">All weight classes</option>
            {WEIGHT_CLASSES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      </BoxingCard>

      {/* Roster table */}
      <BoxingCard>
        <BoxingSectionHeader
          icon={<Users size={14} />}
          title="The mat"
          hint={`${filtered.length} shown`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left uppercase tracking-wider"
                style={{ color: BOXING_COLORS.textMuted, fontSize: 11 }}
              >
                <th className="px-4 py-3 font-semibold">Fighter</th>
                <th className="px-4 py-3 font-semibold">Tier</th>
                <th className="px-4 py-3 font-semibold">Weight</th>
                <th className="px-4 py-3 font-semibold">Stance</th>
                <th className="px-4 py-3 font-semibold">Record</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: BOXING_COLORS.textMuted }}
                  >
                    No fighters match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map(({ f, tier, weight, stance, record }) => (
                  <tr
                    key={f.id}
                    className="border-t hover:bg-[var(--boxing-bg-panel-hover)] transition-colors"
                    style={{ borderColor: BOXING_COLORS.divider }}
                  >
                    <td className="px-4 py-3">
                      <p
                        className="font-bold"
                        style={{ color: BOXING_COLORS.textPrimary }}
                      >
                        {f.full_name}
                      </p>
                      {f.email && (
                        <p
                          className="text-xs"
                          style={{ color: BOXING_COLORS.textMuted }}
                        >
                          {f.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TierBadge tier={tier} />
                    </td>
                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: BOXING_COLORS.textSecondary }}
                    >
                      {weight?.label ?? '—'}
                    </td>
                    <td
                      className="px-4 py-3 text-sm capitalize"
                      style={{ color: BOXING_COLORS.textSecondary }}
                    >
                      {stance ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <FighterRecordChip record={record} size="md" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </BoxingCard>

      {adding && <AddFighterDrawer onClose={() => setAdding(false)} qc={qc} />}
    </BoxingPage>
  );
}

function AddFighterDrawer({
  onClose,
  qc,
}: {
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('rec');
  const [weight, setWeight] = useState('');
  const [stance, setStance] = useState<'orthodox' | 'southpaw' | ''>('orthodox');

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!fullName.trim()) throw new Error('Name required');
      const tags: string[] = [`${TIER_TAG_PREFIX}${tier}`];
      if (weight) tags.push(`${WEIGHT_TAG_PREFIX}${weight}`);
      if (stance) tags.push(`${STANCE_TAG_PREFIX}${stance}`);
      const { error } = await supabase.from('clients').insert({
        trainer_id: user.id,
        full_name: fullName.trim(),
        email: email.trim() || null,
        status: 'active',
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boxing-fighters'] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-md border"
        style={{
          background: BOXING_COLORS.bgPanel,
          borderColor: BOXING_COLORS.divider,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <BoxingSectionHeader icon={<Plus size={14} />} title="Add a fighter" />
        <div className="p-4 space-y-3">
          <Field label="Full name">
            <input
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={inputStyle()}
            />
          </Field>
          <Field label="Email (optional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={inputStyle()}
            />
          </Field>
          <Field label="Tier">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={inputStyle()}
            >
              {FIGHTER_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Weight class (optional)">
            <select
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={inputStyle()}
            >
              <option value="">Not set</option>
              {WEIGHT_CLASSES.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                  {w.lbsMax ? ` — up to ${w.lbsMax} lb` : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stance">
            <select
              value={stance}
              onChange={(e) => setStance(e.target.value as 'orthodox' | 'southpaw' | '')}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={inputStyle()}
            >
              <option value="orthodox">Orthodox</option>
              <option value="southpaw">Southpaw</option>
              <option value="">Not set</option>
            </select>
          </Field>
          {create.error && (
            <p className="text-xs" style={{ color: BOXING_COLORS.danger }}>
              {(create.error as Error).message}
            </p>
          )}
        </div>
        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: BOXING_COLORS.divider }}
        >
          <BoxingButton variant="ghost" onClick={onClose}>
            Cancel
          </BoxingButton>
          <BoxingButton
            onClick={() => create.mutate()}
            disabled={create.isPending || !fullName.trim()}
          >
            {create.isPending ? 'Saving…' : 'Add fighter'}
          </BoxingButton>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs uppercase tracking-wider font-semibold mb-1"
        style={{ color: BOXING_COLORS.textSecondary }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    background: BOXING_COLORS.bgInset,
    color: BOXING_COLORS.textPrimary,
    border: `1px solid ${BOXING_COLORS.divider}`,
  };
}
