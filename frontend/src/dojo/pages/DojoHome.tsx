// The dojo dashboard. Built to match how real dojo software (Kicksite,
// Martialytics, Zen Planner) presents the morning view to a sensei:
//   - Big four numbers up top — students, those eligible for promotion,
//     classes today, monthly revenue
//   - "Promotion watch" — students closest to their next belt, with a
//     visible progress bar. This is the killer differentiator vs. generic
//     trainer software: belt is the central organizing concept.
//   - Today's class schedule with attendance counters
//   - Recent payments strip (so the sensei sees the money pulse)

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Session, Payment, Trainer } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import {
  DOJO_COLORS,
  BELT_SYSTEMS,
  readBeltFromTags,
  useActiveBeltSystem,
} from '../theme';
import {
  DojoCard,
  DojoPage,
  DojoPageHeader,
  DojoSectionHeader,
  DojoStatTile,
  DojoButton,
} from '../components/DojoUI';
import { BeltChip } from '../components/BeltChip';
import { ShieldCheck, Trophy, Users, Wallet, Plus } from 'lucide-react';

// Default rule for promotion eligibility: a student becomes eligible when
// they've attended N classes since their last promotion AND been at the
// current rank for at least M days. Sensei can override per dojo in settings.
const DEFAULT_CLASSES_FOR_PROMOTION = 30;

type SessionWithClient = Session & { clients: { full_name: string } | null };
type PaymentWithClient = Payment & { clients: { full_name: string } | null };

export function DojoHome({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [system] = useActiveBeltSystem();

  const { data: students } = useQuery({
    queryKey: ['dojo-students', user?.id],
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

  const { data: todaysClasses } = useQuery({
    queryKey: ['dojo-classes-today', user?.id],
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
      return (data ?? []) as SessionWithClient[];
    },
  });

  const { data: monthRevenue } = useQuery({
    queryKey: ['dojo-revenue-month', user?.id],
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
    queryKey: ['dojo-recent-payments', user?.id],
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

  // Compute promotion watch from existing data. Heuristic for V1:
  // package_balance is the running attendance count toward next promotion
  // (the sensei updates it after each class). When it exceeds the threshold,
  // the student is eligible. This is the simplest mapping that doesn't
  // require a schema migration — Settings page can swap in a real
  // attendance table later.
  const promotionWatch = useMemo(() => {
    const all = students ?? [];
    return all
      .map((s) => {
        const belt = readBeltFromTags(s.tags, system);
        const classesAttended = Math.max(0, Number(s.package_balance ?? 0));
        const progress = Math.min(
          1,
          classesAttended / DEFAULT_CLASSES_FOR_PROMOTION,
        );
        return { student: s, belt, classesAttended, progress };
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 8);
  }, [students, system]);

  const eligibleCount = promotionWatch.filter((p) => p.progress >= 1).length;

  // Belt distribution across the dojo, for the "Dojo at a glance" stripe.
  const beltDistribution = useMemo(() => {
    const sys = BELT_SYSTEMS[system];
    const counts: Record<string, number> = {};
    (students ?? []).forEach((s) => {
      const belt = readBeltFromTags(s.tags, system);
      const id = belt?.id ?? 'unranked';
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return sys.belts.map((b) => ({ belt: b, count: counts[b.id] ?? 0 }));
  }, [students, system]);

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="Today at the dojo"
        title={`Welcome back, Sensei ${getFirstName(trainer)}`}
        subtitle="Belt progress, today's classes, and the money pulse — all at a glance."
        action={
          <DojoButton onClick={() => navigate('/students')}>
            <Plus size={16} /> Add a student
          </DojoButton>
        }
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <DojoStatTile
          label="Active students"
          value={(students ?? []).length}
          sublabel={
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> on the mat this month
            </span>
          }
        />
        <DojoStatTile
          label="Up for promotion"
          value={eligibleCount}
          emphasis="gold"
          sublabel={
            <span className="inline-flex items-center gap-1">
              <ShieldCheck size={12} /> ready for the next belt
            </span>
          }
        />
        <DojoStatTile
          label="Classes today"
          value={(todaysClasses ?? []).length}
          emphasis="brand"
          sublabel={`${countAttended(todaysClasses)} attended so far`}
        />
        <DojoStatTile
          label="Revenue this month"
          value={formatMoney(monthRevenue ?? 0)}
          sublabel={
            <span className="inline-flex items-center gap-1">
              <Wallet size={12} /> tuition + tests
            </span>
          }
        />
      </div>

      {/* Belt distribution strip — every dojo's mental "honor wall". */}
      <DojoCard className="mb-8" accent="gold">
        <DojoSectionHeader
          icon={<ShieldCheck size={14} />}
          title="The dojo by rank"
          hint={`${BELT_SYSTEMS[system].label} system`}
        />
        <div className="px-4 py-4 flex flex-wrap items-center gap-3">
          {beltDistribution.map(({ belt, count }) => (
            <div
              key={belt.id}
              className="flex items-center gap-2 px-3 py-2 rounded"
              style={{
                background: DOJO_COLORS.bgInset,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            >
              <BeltChip belt={belt} size="sm" showLabel={false} />
              <span
                className="text-sm font-semibold"
                style={{ color: DOJO_COLORS.textPrimary }}
              >
                {count}
              </span>
              <span
                className="text-xs"
                style={{ color: DOJO_COLORS.textMuted }}
              >
                {belt.label.replace(' Belt', '').replace(' — ', ' ')}
              </span>
            </div>
          ))}
        </div>
      </DojoCard>

      {/* Promotion watch — the differentiator. */}
      <DojoCard className="mb-8" accent="brand">
        <DojoSectionHeader
          icon={<Trophy size={14} />}
          title="Promotion watch"
          hint={`Top ${promotionWatch.length} students closest to their next belt`}
          action={
            <button
              className="text-xs font-semibold hover:underline"
              style={{ color: DOJO_COLORS.gold }}
              onClick={() => navigate('/belts')}
            >
              See all belts →
            </button>
          }
        />
        {promotionWatch.length === 0 ? (
          <p
            className="px-4 py-8 text-sm text-center"
            style={{ color: DOJO_COLORS.textMuted }}
          >
            No students on the mat yet. Add your first student to start tracking
            promotions.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
            {promotionWatch.map(({ student, belt, classesAttended, progress }) => {
              const isEligible = progress >= 1;
              return (
                <li
                  key={student.id}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-[#1F1F25] cursor-pointer transition-colors"
                  style={{ borderColor: DOJO_COLORS.divider }}
                  onClick={() => navigate(`/students/${student.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span
                        className="font-semibold truncate"
                        style={{ color: DOJO_COLORS.textPrimary }}
                      >
                        {student.full_name}
                      </span>
                      <BeltChip belt={belt} size="sm" showLabel />
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 max-w-md h-1.5 rounded-full overflow-hidden"
                        style={{ background: DOJO_COLORS.bgInset }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round(progress * 100)}%`,
                            background: isEligible
                              ? DOJO_COLORS.gold
                              : DOJO_COLORS.brand,
                          }}
                        />
                      </div>
                      <span
                        className="text-xs whitespace-nowrap"
                        style={{
                          color: isEligible
                            ? DOJO_COLORS.gold
                            : DOJO_COLORS.textSecondary,
                          fontWeight: isEligible ? 600 : 400,
                        }}
                      >
                        {classesAttended} / {DEFAULT_CLASSES_FOR_PROMOTION} classes
                      </span>
                    </div>
                  </div>
                  {isEligible && (
                    <span
                      className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded"
                      style={{
                        background: DOJO_COLORS.gold,
                        color: '#1A1208',
                      }}
                    >
                      Ready
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DojoCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's classes */}
        <DojoCard>
          <DojoSectionHeader
            icon={<Users size={14} />}
            title="Today's classes"
            hint={
              todaysClasses && todaysClasses.length > 0
                ? `${todaysClasses.length} on the schedule`
                : undefined
            }
            action={
              <button
                className="text-xs font-semibold hover:underline"
                style={{ color: DOJO_COLORS.gold }}
                onClick={() => navigate('/classes')}
              >
                Full schedule →
              </button>
            }
          />
          {!todaysClasses || todaysClasses.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: DOJO_COLORS.textMuted }}
            >
              Mat is empty today.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
              {todaysClasses.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-3 flex items-center gap-3 text-sm"
                >
                  <span
                    className="font-mono font-bold"
                    style={{ color: DOJO_COLORS.gold, minWidth: 60 }}
                  >
                    {formatClock(s.starts_at)}
                  </span>
                  <span
                    className="flex-1 truncate"
                    style={{ color: DOJO_COLORS.textPrimary }}
                  >
                    {s.session_type || 'Class'}{' '}
                    <span style={{ color: DOJO_COLORS.textMuted }}>
                      {s.clients?.full_name ? `· ${s.clients.full_name}` : ''}
                    </span>
                  </span>
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{
                      color:
                        s.status === 'completed'
                          ? DOJO_COLORS.ok
                          : s.status === 'no_show' || s.status === 'cancelled'
                            ? DOJO_COLORS.danger
                            : DOJO_COLORS.textSecondary,
                    }}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DojoCard>

        {/* Recent payments */}
        <DojoCard>
          <DojoSectionHeader
            icon={<Wallet size={14} />}
            title="Money pulse"
            hint="Most recent tuition payments"
            action={
              <button
                className="text-xs font-semibold hover:underline"
                style={{ color: DOJO_COLORS.gold }}
                onClick={() => navigate('/billing')}
              >
                All billing →
              </button>
            }
          />
          {!recentPayments || recentPayments.length === 0 ? (
            <p
              className="px-4 py-8 text-sm text-center"
              style={{ color: DOJO_COLORS.textMuted }}
            >
              No payments recorded yet.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: DOJO_COLORS.divider }}>
              {recentPayments.map((p) => (
                <li
                  key={p.id}
                  className="px-4 py-3 flex items-center gap-3 text-sm"
                >
                  <span
                    className="flex-1 truncate"
                    style={{ color: DOJO_COLORS.textPrimary }}
                  >
                    {p.clients?.full_name ?? 'Unknown student'}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: DOJO_COLORS.textMuted }}
                  >
                    {formatDate(p.paid_at)}
                  </span>
                  <span
                    className="font-bold"
                    style={{ color: DOJO_COLORS.gold, minWidth: 80, textAlign: 'right' }}
                  >
                    {formatMoney(Number(p.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DojoCard>
      </div>
    </DojoPage>
  );
}

function getFirstName(t: Trainer | undefined): string {
  if (!t?.full_name) return '';
  return t.full_name.split(' ')[0];
}

function countAttended(sessions: SessionWithClient[] | undefined): number {
  if (!sessions) return 0;
  return sessions.filter((s) => s.status === 'completed').length;
}

function formatClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
