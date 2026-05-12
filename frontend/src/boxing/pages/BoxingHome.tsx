// Boxing gym dashboard. Built to match what real coaches scan first in
// the morning — the FIGHT CARD (who's got an upcoming bout), the top
// fighters by W-L-D record, today's training schedule, and the money
// pulse. Vocabulary is boxing through and through: rounds, mitts, bag,
// fight card, opponent, decision.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Trophy, Dumbbell, Wallet, Plus, Flame } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment, Trainer } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import {
  BOXING_COLORS,
  FIGHTER_TIERS,
  readTierFromTags,
  readWeightFromTags,
  computeRecord,
  formatRecord,
  type FightRow,
} from '../theme';
import {
  BoxingPage,
  BoxingPageHeader,
  BoxingCard,
  BoxingSectionHeader,
  BoxingStatTile,
  BoxingButton,
} from '../components/BoxingUI';
import { FighterRecordChip, TierBadge } from '../components/FighterRecord';

type PaymentWithClient = Payment & { clients: { full_name: string } | null };

export function BoxingHome({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // All fight rows so we can compute records, find upcoming, and find recent results.
  // If the table doesn't exist yet (migration 29 not run), we silently treat
  // every fighter as 0-0-0 and surface a friendly notice elsewhere.
  const { data: fights } = useQuery({
    queryKey: ['boxing-fights', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxing_fights')
        .select('*')
        .order('starts_at', { ascending: false });
      if (error) {
        if ((error.message ?? '').toLowerCase().includes('boxing_fights')) {
          return [] as FightRow[];
        }
        throw error;
      }
      return (data ?? []) as FightRow[];
    },
  });

  const { data: todaysTraining } = useQuery({
    queryKey: ['boxing-training-today', user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: monthRevenue } = useQuery({
    queryKey: ['boxing-revenue-month', user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .gte('paid_at', start.toISOString());
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, p: Pick<Payment, 'amount'>) => sum + Number(p.amount),
        0,
      );
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['boxing-recent-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(full_name)')
        .order('paid_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as PaymentWithClient[];
    },
  });

  // Bucket fights by fighter so we can hand each card their own slice.
  const fightsByFighter = useMemo(() => {
    const m = new Map<string, FightRow[]>();
    (fights ?? []).forEach((f) => {
      const list = m.get(f.fighter_id) ?? [];
      list.push(f);
      m.set(f.fighter_id, list);
    });
    return m;
  }, [fights]);

  const fighterStats = useMemo(() => {
    return (fighters ?? []).map((f) => {
      const record = computeRecord(fightsByFighter.get(f.id) ?? []);
      return {
        fighter: f,
        record,
        tier: readTierFromTags(f.tags),
        weight: readWeightFromTags(f.tags),
      };
    });
  }, [fighters, fightsByFighter]);

  // Top performers — fighters with at least 1 fight, sorted by wins desc.
  const topPerformers = useMemo(
    () =>
      [...fighterStats]
        .filter((x) => x.record.total > 0)
        .sort((a, b) => b.record.wins - a.record.wins)
        .slice(0, 5),
    [fighterStats],
  );

  // Tier breakdown for the "the gym by tier" strip.
  const tierBreakdown = useMemo(() => {
    return FIGHTER_TIERS.map((t) => ({
      tier: t,
      count: fighterStats.filter((x) => x.tier.id === t.id).length,
    }));
  }, [fighterStats]);

  // Upcoming fight card — fights with no result yet, ordered by date.
  const fightCard = useMemo(() => {
    const list = (fights ?? []).filter((f) => f.result === null);
    list.sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    return list.slice(0, 5);
  }, [fights]);

  return (
    <BoxingPage>
      <BoxingPageHeader
        eyebrow="Today at the gym"
        title={`Welcome back, Coach ${getFirstName(trainer)}`}
        subtitle="The fight card, today's rounds, who's hot, and the money pulse — all in one view."
        corner="split"
        action={
          <BoxingButton onClick={() => navigate('/fighters')}>
            <Plus size={16} /> Add a fighter
          </BoxingButton>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <BoxingStatTile
          label="Active fighters"
          value={(fighters ?? []).length}
          sublabel={
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> across all tiers
            </span>
          }
        />
        <BoxingStatTile
          label="Fight card"
          value={fightCard.length}
          emphasis="red"
          sublabel={
            <span className="inline-flex items-center gap-1">
              <Trophy size={12} /> upcoming bouts
            </span>
          }
        />
        <BoxingStatTile
          label="Sessions today"
          value={(todaysTraining ?? []).length}
          emphasis="blue"
          sublabel={
            <span className="inline-flex items-center gap-1">
              <Dumbbell size={12} /> on the schedule
            </span>
          }
        />
        <BoxingStatTile
          label="Revenue this month"
          value={formatMoney(monthRevenue ?? 0)}
          emphasis="gold"
          sublabel={
            <span className="inline-flex items-center gap-1">
              <Wallet size={12} /> dues + camp fees
            </span>
          }
        />
      </div>

      {/* The gym by tier — at a glance, who's where on the pipeline */}
      <BoxingCard className="mb-8" accent="gold">
        <BoxingSectionHeader
          icon={<Flame size={14} />}
          title="The gym by tier"
          hint="Rec → Amateur → Pro pipeline"
        />
        <div className="px-4 py-4 flex flex-wrap items-center gap-3">
          {tierBreakdown.map(({ tier, count }) => (
            <div
              key={tier.id}
              className="flex items-center gap-2 px-3 py-2 rounded"
              style={{
                background: BOXING_COLORS.bgInset,
                border: `1px solid ${BOXING_COLORS.divider}`,
              }}
            >
              <span
                aria-hidden
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: tier.color }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: BOXING_COLORS.textPrimary }}
              >
                {count}
              </span>
              <span className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
                {tier.label}
              </span>
            </div>
          ))}
        </div>
      </BoxingCard>

      {/* Fight card — upcoming bouts, the killer thing every coach watches */}
      <BoxingCard className="mb-8" accent="red">
        <BoxingSectionHeader
          icon={<Trophy size={14} />}
          title="The fight card"
          hint={`Next ${fightCard.length} upcoming bouts`}
          action={
            <Link
              to="/fights"
              className="text-xs font-semibold hover:underline"
              style={{ color: BOXING_COLORS.gold }}
            >
              Full card →
            </Link>
          }
        />
        {fightCard.length === 0 ? (
          <p
            className="px-4 py-8 text-sm text-center"
            style={{ color: BOXING_COLORS.textMuted }}
          >
            No bouts scheduled. Book the next one from the Fights page.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: BOXING_COLORS.divider }}>
            {fightCard.map((f) => {
              const fighter = (fighters ?? []).find((x) => x.id === f.fighter_id);
              if (!fighter) return null;
              const tier = readTierFromTags(fighter.tags);
              const weight = readWeightFromTags(fighter.tags);
              return (
                <li
                  key={f.id}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-[var(--boxing-bg-panel-hover)] transition-colors"
                >
                  <div
                    className="font-mono font-bold text-xs uppercase tracking-wider px-2 py-1 rounded shrink-0"
                    style={{
                      background: BOXING_COLORS.bgInset,
                      color: BOXING_COLORS.gold,
                      border: `1px solid ${BOXING_COLORS.divider}`,
                    }}
                  >
                    {formatFightDate(f.starts_at)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-bold truncate"
                        style={{ color: BOXING_COLORS.textPrimary }}
                      >
                        {fighter.full_name}
                      </span>
                      <TierBadge tier={tier} />
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: BOXING_COLORS.textSecondary }}
                    >
                      vs.{' '}
                      <span
                        className="font-semibold"
                        style={{ color: BOXING_COLORS.textPrimary }}
                      >
                        {f.opponent_name || 'TBD'}
                      </span>
                      {weight && (
                        <span style={{ color: BOXING_COLORS.textMuted }}>
                          {' '}
                          · {weight.label}
                        </span>
                      )}
                      {f.venue && (
                        <span style={{ color: BOXING_COLORS.textMuted }}>
                          {' '}
                          · {f.venue}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </BoxingCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top performers */}
        <BoxingCard accent="gold">
          <BoxingSectionHeader
            icon={<Flame size={14} />}
            title="Top performers"
            hint="By wins on record"
            action={
              <Link
                to="/fighters"
                className="text-xs font-semibold hover:underline"
                style={{ color: BOXING_COLORS.gold }}
              >
                All fighters →
              </Link>
            }
          />
          {topPerformers.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: BOXING_COLORS.textMuted }}
            >
              No fight history yet. Log your fighters' bouts on the Fights page.
            </p>
          ) : (
            <ul
              className="divide-y"
              style={{ borderColor: BOXING_COLORS.divider }}
            >
              {topPerformers.map(({ fighter, record, tier }) => (
                <li
                  key={fighter.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="font-bold truncate"
                        style={{ color: BOXING_COLORS.textPrimary }}
                      >
                        {fighter.full_name}
                      </span>
                      <TierBadge tier={tier} />
                    </div>
                    <p
                      className="text-xs font-mono"
                      style={{ color: BOXING_COLORS.textSecondary }}
                    >
                      {formatRecord(record)}
                    </p>
                  </div>
                  <FighterRecordChip record={record} size="md" />
                </li>
              ))}
            </ul>
          )}
        </BoxingCard>

        {/* Money pulse */}
        <BoxingCard accent="blue">
          <BoxingSectionHeader
            icon={<Wallet size={14} />}
            title="Money pulse"
            hint="Most recent dues + camp fees"
            action={
              <Link
                to="/billing"
                className="text-xs font-semibold hover:underline"
                style={{ color: BOXING_COLORS.gold }}
              >
                All billing →
              </Link>
            }
          />
          {!recentPayments || recentPayments.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: BOXING_COLORS.textMuted }}
            >
              No payments recorded yet.
            </p>
          ) : (
            <ul
              className="divide-y"
              style={{ borderColor: BOXING_COLORS.divider }}
            >
              {recentPayments.map((p) => (
                <li key={p.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                  <span
                    className="flex-1 truncate"
                    style={{ color: BOXING_COLORS.textPrimary }}
                  >
                    {p.clients?.full_name ?? '—'}
                  </span>
                  <span className="text-xs" style={{ color: BOXING_COLORS.textMuted }}>
                    {new Date(p.paid_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span
                    className="font-bold"
                    style={{
                      color: BOXING_COLORS.gold,
                      minWidth: 80,
                      textAlign: 'right',
                    }}
                  >
                    {formatMoney(Number(p.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </BoxingCard>
      </div>
    </BoxingPage>
  );
}

function getFirstName(t: Trainer | undefined): string {
  if (!t?.full_name) return '';
  return t.full_name.split(' ')[0];
}

function formatFightDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
