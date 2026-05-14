// Client detail — the single-client view every real coaching app has.
// Hero: name, photo placeholder, active practice, days in, key stats.
// Body: weight trend sparkline, check-in history, practice history,
// macro plan, recent payments. Quick actions on the right rail.
//
// This is the #1 thing Healthie, Practice Better, and That Clean Life
// all have that we were missing. Without it you can't actually coach —
// you can only browse summaries.

import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  CalendarDays,
  Wallet,
  MessageSquare,
  Sparkles,
  Ruler,
  Video,
  MapPin,
  Phone,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment, Session } from '../../lib/database.types';
import { nutritionRpc } from '../lib/nutritionRpc';
import { formatMoney } from '../../lib/format';
import { MessageThread } from '../components/MessageThread';
import {
  N,
  SERIF_FONT,
  readGoal,
  readActivePractice,
  daysOnPractice,
  isPracticeWindowDone,
  readCalorieTarget,
  readProteinTarget,
  readCarbsTarget,
  readFatsTarget,
  readCurrentWeight,
  readGoalWeight,
  readStartingWeight,
  computeProgressToGoal,
  relativeWhen,
  SKILL_BY_ID,
  PRACTICE_WINDOW_DAYS,
  type CheckInRow,
} from '../theme';

type PayWith = Payment & { clients: { full_name: string } | null };

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: client, isLoading } = useQuery({
    queryKey: ['nutrition-client', id, user?.id],
    queryFn: async () => {
      if (!id) return null;
      const result = await nutritionRpc.clientDetail(id);
      if ('error' in result) return null;
      return result as Client;
    },
    enabled: !!id && !!user,
  });

  const { data: checkIns } = useQuery({
    queryKey: ['nutrition-client-check-ins', id],
    queryFn: async () => {
      if (!id) return [] as CheckInRow[];
      const { data, error } = await supabase
        .from('nutrition_check_ins')
        .select('*')
        .eq('client_id', id)
        .order('submitted_at', { ascending: false });
      if (error) {
        if ((error.message ?? '').toLowerCase().includes('nutrition_check_ins')) {
          return [] as CheckInRow[];
        }
        throw error;
      }
      return (data ?? []) as CheckInRow[];
    },
    enabled: !!id,
  });

  const { data: clientSessions } = useQuery({
    queryKey: ['nutrition-client-sessions', id],
    queryFn: async () => {
      if (!id) return [] as Session[];
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('client_id', id)
        .order('starts_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Session[];
    },
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['nutrition-client-payments', id],
    queryFn: async () => {
      if (!id) return [] as PayWith[];
      const { data, error } = await supabase
        .from('payments')
        .select('*, clients(full_name)')
        .eq('client_id', id)
        .order('paid_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as PayWith[];
    },
    enabled: !!id,
  });

  const goal = client ? readGoal(client.tags) : null;
  const practice = client ? readActivePractice(client.tags) : null;
  const skill = practice ? SKILL_BY_ID[practice.skillId] : null;
  const days = client ? daysOnPractice(client.tags) : null;
  const windowDone = client ? isPracticeWindowDone(client.tags) : false;
  const cur = client ? readCurrentWeight(client.tags) : null;
  const target = client ? readGoalWeight(client.tags) : null;
  const start = client ? readStartingWeight(client.tags) : null;
  const goalPct = computeProgressToGoal(start, cur, target);

  // Weight trend from check-ins — oldest → newest for the sparkline.
  const weightTrend = useMemo(() => {
    const points = (checkIns ?? [])
      .filter((c) => c.weight_lb != null)
      .slice()
      .reverse() // oldest first
      .map((c) => ({ date: c.week_starting, weight: Number(c.weight_lb) }));
    return points;
  }, [checkIns]);

  const avgCompliance = useMemo(() => {
    const withCompliance = (checkIns ?? []).filter((c) => c.compliance_pct != null);
    if (withCompliance.length === 0) return null;
    return Math.round(
      withCompliance.reduce((s, c) => s + (c.compliance_pct ?? 0), 0) /
        withCompliance.length,
    );
  }, [checkIns]);

  const ytdPaid = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return (payments ?? [])
      .filter((p) => new Date(p.paid_at) >= yearStart)
      .reduce((s, p) => s + Number(p.amount), 0);
  }, [payments]);

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-12 max-w-6xl mx-auto text-center">
        <p style={{ color: N.mute }}>Loading…</p>
      </div>
    );
  }
  if (!client) {
    return (
      <div className="px-4 sm:px-8 py-12 max-w-6xl mx-auto text-center">
        <p style={{ color: N.mute }}>Client not found.</p>
        <Link
          to="/clients"
          className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium"
          style={{ color: N.coral }}
        >
          <ArrowLeft size={14} /> Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-1.5 text-sm font-medium mb-4 hover:opacity-80"
        style={{ color: N.mute }}
      >
        <ArrowLeft size={14} /> All clients
      </button>

      {/* Hero — name, photo placeholder, active practice prominent */}
      <section
        className="rounded-xl p-5 sm:p-6 mb-6 flex items-start gap-5"
        style={{
          background: N.card,
          border: `1px solid ${N.rule}`,
          boxShadow: 'var(--nut-shadow)',
        }}
      >
        {/* Avatar */}
        <div
          className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-semibold"
          style={{
            background: N.coralSoft,
            color: N.coralDeep,
            fontSize: '2.25rem',
            fontFamily: SERIF_FONT,
          }}
        >
          {(client.full_name[0] || '?').toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row: name + goal pill */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h1
              className="leading-tight"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: 'clamp(1.625rem, 3vw, 2rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              {client.full_name}
            </h1>
            {goal && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: goal.color,
                  background: `${goal.color}15`,
                  border: `1px solid ${goal.color}40`,
                }}
              >
                {goal.label}
              </span>
            )}
          </div>

          {client.goals && (
            <p
              className="text-sm leading-relaxed mb-3 max-w-xl"
              style={{ color: N.inkSoft }}
            >
              "{client.goals}"
            </p>
          )}

          {/* Active practice block */}
          {practice && skill ? (
            <div
              className="px-4 py-3 rounded-lg inline-block min-w-[280px]"
              style={{
                background: `${skill.color}0F`,
                border: `1px solid ${skill.color}40`,
              }}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: skill.color }}
                >
                  Currently practicing
                </span>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: windowDone ? N.honey : skill.color }}
                >
                  Day {days ?? 0} / {PRACTICE_WINDOW_DAYS}
                </span>
              </div>
              <p
                className="font-semibold mb-2"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.0625rem',
                }}
              >
                {practice.label}
              </p>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: '#0000000F' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    background: windowDone ? N.honey : skill.color,
                    width: `${Math.min(100, ((days ?? 0) / PRACTICE_WINDOW_DAYS) * 100)}%`,
                  }}
                />
              </div>
              {windowDone && (
                <p
                  className="text-xs mt-2 font-medium"
                  style={{ color: N.honey }}
                >
                  Window done — time to assign next practice
                </p>
              )}
            </div>
          ) : (
            <div
              className="px-4 py-3 rounded-lg inline-block"
              style={{
                background: N.inset,
                border: `1px dashed ${N.rule}`,
              }}
            >
              <p className="text-sm" style={{ color: N.mute }}>
                No active practice. Pick one from the Practices Library →
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stat grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Current weight"
          value={cur != null ? `${cur} lb` : '—'}
          sub={start != null && cur != null ? `${cur - start > 0 ? '+' : ''}${cur - start} lb total` : null}
        />
        <StatCard
          icon={<Target size={14} />}
          label="Goal"
          value={target != null ? `${target} lb` : '—'}
          sub={goalPct != null ? `${Math.round(goalPct * 100)}% of the way` : null}
          tone="sage"
        />
        <StatCard
          icon={<CalendarDays size={14} />}
          label="Check-ins"
          value={(checkIns ?? []).length.toString()}
          sub={avgCompliance != null ? `${avgCompliance}% avg compliance` : null}
        />
        <StatCard
          icon={<Wallet size={14} />}
          label="Paid this year"
          value={formatMoney(ytdPaid)}
          sub={`${(payments ?? []).length} payments`}
          tone="honey"
        />
      </section>

      {/* Two-column layout: weight trend + check-ins on left, side rail on right */}
      <section className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          {/* Weight trend sparkline */}
          <Card>
            <CardHead title="Weight trend" hint={`${weightTrend.length} weigh-ins logged`} />
            <div className="p-4">
              {weightTrend.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: N.mute }}>
                  No weight data yet. Once {client.full_name.split(' ')[0]} starts
                  logging check-ins, you'll see the trend here.
                </p>
              ) : (
                <Sparkline points={weightTrend} goalWeight={target} />
              )}
            </div>
          </Card>

          {/* Body measurements — pulled from the latest check-in with data */}
          <MeasurementsCard checkIns={checkIns ?? []} />

          {/* Live coaching sessions — past + upcoming with this client */}
          <ClientSessionsCard sessions={clientSessions ?? []} />

          {/* Coach ↔ client messaging thread */}
          {user?.id && (
            <MessageThread
              clientId={client.id}
              trainerId={user.id}
              clientName={client.full_name}
            />
          )}

          {/* Check-in history */}
          <Card>
            <CardHead
              title="Check-in history"
              hint={`${(checkIns ?? []).length} total`}
              action={
                <Link
                  to="/check-ins"
                  className="text-xs font-medium hover:underline"
                  style={{ color: N.coral }}
                >
                  Open inbox →
                </Link>
              }
            />
            {!checkIns || checkIns.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: N.mute }}>
                No check-ins yet.
              </p>
            ) : (
              <ul>
                {checkIns.slice(0, 6).map((c) => (
                  <li
                    key={c.id}
                    className="px-4 py-3 border-t flex items-start gap-3"
                    style={{ borderColor: N.rule }}
                  >
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{
                        color: c.status === 'pending' ? N.honey : N.sageDeep,
                        background:
                          c.status === 'pending' ? N.honeySoft : N.sageSoft,
                      }}
                    >
                      {c.status === 'pending' ? 'Pending' : 'Reviewed'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: N.ink }}>
                          Week of{' '}
                          {new Date(c.week_starting).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="text-xs" style={{ color: N.mute }}>
                          · {relativeWhen(c.submitted_at)}
                        </span>
                      </div>
                      <div
                        className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs"
                        style={{ color: N.inkSoft }}
                      >
                        {c.weight_lb != null && <span>{c.weight_lb} lb</span>}
                        {c.compliance_pct != null && <span>· {c.compliance_pct}% adh</span>}
                        {c.energy_1_5 != null && <span>· E {c.energy_1_5}/5</span>}
                        {c.hunger_1_5 != null && <span>· H {c.hunger_1_5}/5</span>}
                        {c.sleep_hours_avg != null && (
                          <span>· {c.sleep_hours_avg.toFixed(1)}h sleep</span>
                        )}
                      </div>
                      {c.client_notes && (
                        <p
                          className="text-xs mt-1.5 line-clamp-2 leading-relaxed"
                          style={{ color: N.mute }}
                        >
                          {c.client_notes}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right side rail */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHead title="Quick actions" />
            <div className="p-3 space-y-2">
              <ActionRow
                icon={<Sparkles size={14} />}
                label="Ask the coach about this client"
                to="/ask"
              />
              <ActionRow
                icon={<MessageSquare size={14} />}
                label="Open check-in inbox"
                to="/check-ins"
              />
              <ActionRow
                icon={<Target size={14} />}
                label="Browse Practices Library"
                to="/plans"
              />
            </div>
          </Card>

          {/* Macro plan (if any) */}
          <MacroPlanCard client={client} />

          {/* Recent payments */}
          <Card>
            <CardHead
              title="Recent payments"
              action={
                <Link
                  to="/plate"
                  className="text-xs font-medium hover:underline"
                  style={{ color: N.coral }}
                >
                  All →
                </Link>
              }
            />
            {!payments || payments.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: N.mute }}>
                No payments yet.
              </p>
            ) : (
              <ul>
                {payments.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="px-4 py-2.5 border-t flex items-center justify-between text-sm"
                    style={{ borderColor: N.rule }}
                  >
                    <span style={{ color: N.mute, fontSize: '0.8125rem' }}>
                      {new Date(p.paid_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="font-semibold" style={{ color: N.ink }}>
                      {formatMoney(Number(p.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'normal',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string | null;
  tone?: 'normal' | 'sage' | 'honey';
}) {
  const valueColor =
    tone === 'sage' ? N.sageDeep : tone === 'honey' ? N.honey : N.ink;
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5" style={{ color: N.mute }}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p
        className="leading-none font-semibold"
        style={{
          fontFamily: SERIF_FONT,
          color: valueColor,
          fontSize: '1.5rem',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: N.mute }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
      }}
    >
      {children}
    </div>
  );
}

function CardHead({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="px-4 py-3 flex items-baseline justify-between gap-3 border-b"
      style={{ borderColor: N.rule }}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <h3
          className="text-sm font-semibold"
          style={{ color: N.ink }}
        >
          {title}
        </h3>
        {hint && (
          <span className="text-xs" style={{ color: N.mute }}>
            {hint}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function ActionRow({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--nut-inset)] transition-colors"
      style={{ color: N.ink }}
    >
      <span style={{ color: N.coral }}>{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function MacroPlanCard({ client }: { client: Client }) {
  const kcal = readCalorieTarget(client.tags);
  const protein = readProteinTarget(client.tags);
  const carbs = readCarbsTarget(client.tags);
  const fats = readFatsTarget(client.tags);
  if (kcal == null && protein == null && carbs == null && fats == null) return null;
  return (
    <Card>
      <CardHead title="Macro plan" hint="Daily targets" />
      <div className="p-4 grid grid-cols-2 gap-3">
        {kcal != null && <MacroStat label="Calories" value={`${kcal}`} unit="kcal" color={N.ink} />}
        {protein != null && <MacroStat label="Protein" value={`${protein}`} unit="g" color={N.coral} />}
        {carbs != null && <MacroStat label="Carbs" value={`${carbs}`} unit="g" color={N.sage} />}
        {fats != null && <MacroStat label="Fats" value={`${fats}`} unit="g" color={N.honey} />}
      </div>
    </Card>
  );
}

function MacroStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: N.mute }}>
        {label}
      </p>
      <p>
        <span
          className="font-semibold tabular-nums"
          style={{ color, fontFamily: SERIF_FONT, fontSize: '1.25rem' }}
        >
          {value}
        </span>
        <span className="text-xs ml-1" style={{ color: N.mute }}>
          {unit}
        </span>
      </p>
    </div>
  );
}

/** Latest body measurements card — shows waist/hip/chest with delta
 *  from the first recorded value. Only renders when at least one
 *  measurement is on file. */
function MeasurementsCard({ checkIns }: { checkIns: CheckInRow[] }) {
  // Find the most recent and the first check-in with each measurement.
  const withWaist = checkIns.filter((c) => c.waist_in != null);
  const withHip = checkIns.filter((c) => c.hip_in != null);
  const withChest = checkIns.filter((c) => c.chest_in != null);
  if (withWaist.length === 0 && withHip.length === 0 && withChest.length === 0) {
    return null;
  }
  // checkIns is sorted newest-first, so [0] is latest and last is earliest.
  const latest = (arr: CheckInRow[], k: 'waist_in' | 'hip_in' | 'chest_in') =>
    arr.length > 0 ? Number(arr[0][k]) : null;
  const first = (arr: CheckInRow[], k: 'waist_in' | 'hip_in' | 'chest_in') =>
    arr.length > 0 ? Number(arr[arr.length - 1][k]) : null;

  const rows = [
    {
      label: 'Waist',
      latest: latest(withWaist, 'waist_in'),
      first: first(withWaist, 'waist_in'),
    },
    {
      label: 'Hip',
      latest: latest(withHip, 'hip_in'),
      first: first(withHip, 'hip_in'),
    },
    {
      label: 'Chest',
      latest: latest(withChest, 'chest_in'),
      first: first(withChest, 'chest_in'),
    },
  ].filter((r) => r.latest != null);

  return (
    <Card>
      <CardHead title="Body measurements" hint="Most recent" />
      <div className="p-4 grid grid-cols-3 gap-3">
        {rows.map((r) => {
          const delta = r.first != null && r.latest != null ? r.latest - r.first : null;
          const deltaColor =
            delta == null
              ? N.mute
              : delta < 0
                ? N.sageDeep
                : delta > 0
                  ? N.honey
                  : N.mute;
          return (
            <div
              key={r.label}
              className="rounded-lg p-3"
              style={{ background: N.inset }}
            >
              <p
                className="text-xs font-medium mb-1 flex items-center gap-1"
                style={{ color: N.mute }}
              >
                <Ruler size={11} /> {r.label}
              </p>
              <p
                className="font-semibold leading-none tabular-nums"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {r.latest}"
              </p>
              {delta != null && delta !== 0 && (
                <p
                  className="text-xs font-semibold mt-1 tabular-nums"
                  style={{ color: deltaColor }}
                >
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)}" total
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Sessions card on the client detail page — shows the next upcoming
 *  session prominently + a short list of past sessions. Empty state
 *  with a "Book a session" CTA when there are none. */
function ClientSessionsCard({ sessions }: { sessions: Session[] }) {
  const now = Date.now();
  const upcoming = sessions
    .filter((s) => new Date(s.starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = sessions
    .filter((s) => new Date(s.starts_at).getTime() < now)
    .slice(0, 5);
  const next = upcoming[0];

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHead title="Live sessions" />
        <div className="px-4 py-6 text-center">
          <Calendar
            size={20}
            className="mx-auto mb-2"
            style={{ color: N.mute }}
          />
          <p className="text-sm mb-3" style={{ color: N.mute }}>
            No sessions booked yet.
          </p>
          <Link
            to="/sessions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: N.coral,
              color: '#FFF',
            }}
          >
            Book a session
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHead
        title="Live sessions"
        hint={`${upcoming.length} upcoming · ${past.length} past`}
        action={
          <Link
            to="/sessions"
            className="text-xs font-medium hover:underline"
            style={{ color: N.coral }}
          >
            Book →
          </Link>
        }
      />
      {next && <SessionLine session={next} highlight />}
      {past.map((s) => (
        <SessionLine key={s.id} session={s} />
      ))}
      {upcoming.slice(1).map((s) => (
        <SessionLine key={s.id} session={s} />
      ))}
    </Card>
  );
}

function SessionLine({
  session,
  highlight = false,
}: {
  session: Session;
  highlight?: boolean;
}) {
  const start = new Date(session.starts_at);
  const isPast = start.getTime() < Date.now();
  const isVideoLink = session.location && /^https?:\/\//.test(session.location);
  const kindIcon =
    session.session_type === 'in_person' ? (
      <MapPin size={11} />
    ) : session.session_type === 'phone' ? (
      <Phone size={11} />
    ) : (
      <Video size={11} />
    );
  return (
    <div
      className="px-4 py-3 border-t flex items-center gap-3"
      style={{
        borderColor: N.rule,
        background: highlight ? N.coralSoft : 'transparent',
      }}
    >
      <div
        className="shrink-0 rounded-lg w-10 h-10 flex flex-col items-center justify-center"
        style={{
          background: highlight ? '#FFFFFF' : N.inset,
        }}
      >
        <span
          className="text-[9px] uppercase font-bold tracking-wide"
          style={{ color: highlight ? N.coral : N.mute }}
        >
          {start.toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span
          className="font-bold leading-none tabular-nums"
          style={{
            color: highlight ? N.coralDeep : N.ink,
            fontSize: '0.9375rem',
            fontFamily: SERIF_FONT,
          }}
        >
          {start.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: highlight ? N.coralDeep : N.ink }}
        >
          {highlight && !isPast ? 'Next session · ' : ''}
          {start.toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
        <p
          className="text-xs flex items-center gap-1 mt-0.5"
          style={{ color: highlight ? N.coralDeep : N.mute, opacity: highlight ? 0.85 : 1 }}
        >
          {kindIcon}
          {session.session_type === 'in_person'
            ? 'In person'
            : session.session_type === 'phone'
              ? 'Phone'
              : 'Video'}
          {session.status === 'completed' && ' · completed'}
          {session.status === 'no_show' && ' · no-show'}
        </p>
      </div>
      {isVideoLink && session.location && !isPast && (
        <a
          href={session.location}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: N.coral, color: '#FFF' }}
        >
          <Video size={10} /> Join
        </a>
      )}
    </div>
  );
}

/** Minimal SVG sparkline for the weight trend. Hand-rolled, no
 *  chart library — keeps the bundle lean. Shows weight points
 *  connected by a line + the goal weight as a dashed horizontal. */
function Sparkline({
  points,
  goalWeight,
}: {
  points: { date: string; weight: number }[];
  goalWeight: number | null;
}) {
  const W = 600;
  const H = 140;
  const PAD = 24;
  const weights = points.map((p) => p.weight);
  const allWeights = goalWeight != null ? [...weights, goalWeight] : weights;
  const minW = Math.min(...allWeights);
  const maxW = Math.max(...allWeights);
  const range = Math.max(1, maxW - minW);
  const xStep = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const y = (w: number) => PAD + (1 - (w - minW) / range) * (H - PAD * 2);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * xStep} ${y(p.weight)}`)
    .join(' ');
  const areaPath = `${path} L ${PAD + (points.length - 1) * xStep} ${H - PAD} L ${PAD} ${H - PAD} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.weight - first.weight;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p
            className="font-semibold tabular-nums leading-none"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '2rem',
              letterSpacing: '-0.02em',
            }}
          >
            {last.weight} lb
          </p>
          <p className="text-xs mt-1" style={{ color: N.mute }}>
            Current weight
          </p>
        </div>
        <div className="text-right">
          <p
            className="font-semibold tabular-nums leading-none"
            style={{
              color: delta < 0 ? N.sageDeep : delta > 0 ? N.honey : N.mute,
              fontSize: '1.25rem',
            }}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)} lb
          </p>
          <p className="text-xs mt-1" style={{ color: N.mute }}>
            Since first check-in
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 140 }}
      >
        {/* Goal weight as a dashed horizontal */}
        {goalWeight != null && (
          <>
            <line
              x1={PAD}
              x2={W - PAD}
              y1={y(goalWeight)}
              y2={y(goalWeight)}
              stroke={N.sage}
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.7"
            />
            <text
              x={W - PAD}
              y={y(goalWeight) - 6}
              fill={N.sageDeep}
              fontSize="10"
              fontWeight="600"
              textAnchor="end"
            >
              Goal {goalWeight} lb
            </text>
          </>
        )}
        {/* Area fill */}
        <path d={areaPath} fill={N.coral} opacity="0.08" />
        {/* Line */}
        <path d={path} fill="none" stroke={N.coral} strokeWidth="2" />
        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={PAD + i * xStep}
            cy={y(p.weight)}
            r={i === points.length - 1 ? 4 : 3}
            fill={N.coral}
            stroke={N.card}
            strokeWidth="1.5"
          />
        ))}
      </svg>

      <div className="flex justify-between text-xs mt-2" style={{ color: N.mute }}>
        <span>
          {new Date(first.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span>
          {new Date(last.date).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>
    </div>
  );
}
