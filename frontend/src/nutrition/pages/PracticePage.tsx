// Practice — the nutrition coach's daily inbox. The dashboard is NOT
// a stats tile grid; it's a magazine front cover with three columns:
//   - "On my desk this week" — pending check-ins, the highest priority
//   - "Drifting" — clients off-track (no check-in in 10+ days)
//   - Sidebar: practice-at-a-glance numbers in editorial blockquote style
//
// Inspired by editorial magazine spreads (Bon Appétit, Real Simple)
// rather than SaaS dashboards.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, BookOpen, MessageSquare, Sparkles, ArrowRight, Video, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Session, Trainer } from '../../lib/database.types';
import {
  N,
  SERIF_FONT,
  readActivePractice,
  daysOnPractice,
  isPracticeWindowDone,
  SKILL_BY_ID,
  PRACTICE_WINDOW_DAYS,
  relativeWhen,
  type CheckInRow,
} from '../theme';

export function PracticePage({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();

  const { data: clients } = useQuery({
    queryKey: ['nutrition-clients', user?.id],
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

  // Pending check-ins — if the table isn't installed yet we surface
  // a friendly setup notice instead of crashing.
  const { data: checkIns, error: checkInErr } = useQuery({
    queryKey: ['nutrition-check-ins', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_check_ins')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CheckInRow[];
    },
  });

  const tableMissing =
    checkInErr &&
    (checkInErr as Error).message?.toLowerCase().includes('nutrition_check_ins');

  // Today's coaching sessions — the daily-use thing a real coach checks
  // first thing in the morning. Surfaces prominently on the home page.
  const { data: todaysSessions } = useQuery({
    queryKey: ['nutrition-sessions-today', user?.id],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 86400000);
      const { data, error } = await supabase
        .from('sessions')
        .select('*, clients(full_name)')
        .gte('starts_at', start.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as (Session & { clients: { full_name: string } | null })[];
    },
  });

  const pending = useMemo(
    () => (checkIns ?? []).filter((c) => c.status === 'pending'),
    [checkIns],
  );

  const lastCheckInByClient = useMemo(() => {
    const m = new Map<string, CheckInRow>();
    (checkIns ?? []).forEach((c) => {
      const existing = m.get(c.client_id);
      if (!existing || new Date(c.submitted_at) > new Date(existing.submitted_at)) {
        m.set(c.client_id, c);
      }
    });
    return m;
  }, [checkIns]);

  const drifting = useMemo(() => {
    const tenDaysAgo = Date.now() - 10 * 86400000;
    return (clients ?? [])
      .map((c) => ({
        client: c,
        last: lastCheckInByClient.get(c.id) ?? null,
      }))
      .filter(({ last }) => !last || new Date(last.submitted_at).getTime() < tenDaysAgo)
      .slice(0, 5);
  }, [clients, lastCheckInByClient]);

  const avgCompliance = useMemo(() => {
    const recent = (checkIns ?? []).filter(
      (c) => c.compliance_pct != null,
    );
    if (recent.length === 0) return null;
    return Math.round(
      recent.reduce((s, c) => s + (c.compliance_pct ?? 0), 0) / recent.length,
    );
  }, [checkIns]);

  // Empty-state detection — drives the welcome card and the "next step"
  // banner. A brand-new coach shouldn't see a quiet dashboard with no
  // idea what to do.
  const hasClients = (clients ?? []).length > 0;
  const hasCheckIns = (checkIns ?? []).length > 0;
  const isBrandNew = !hasClients && !hasCheckIns && !tableMissing;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
      {/* Page header — left-aligned, app-style */}
      <section className="mb-6">
        <p
          className="text-xs font-medium mb-1"
          style={{ color: N.mute }}
        >
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          {greeting(trainer)}
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: N.mute }}
        >
          {isBrandNew
            ? "Welcome to your practice. Here's how to start."
            : pending.length === 0
              ? 'No check-ins waiting. A quiet start to the week.'
              : `${pending.length} check-in${pending.length === 1 ? '' : 's'} waiting for your review.`}
        </p>
      </section>

      {/* Welcome / next-step card. Shows different content based on
          where the coach is in onboarding. The single most important
          piece of guidance a new user needs. */}
      {isBrandNew && <WelcomeCard />}
      {!isBrandNew && hasClients && pending.length > 0 && (
        <NextStepBanner
          icon={<MessageSquare size={16} />}
          tone="coral"
          title={`${pending.length} check-in${pending.length === 1 ? '' : 's'} need your review`}
          body="Open the inbox to read what's coming in and reply. Replies are short — a few sentences each."
          actionLabel="Open check-ins"
          actionTo="/check-ins"
        />
      )}
      {!isBrandNew && hasClients && pending.length === 0 && drifting.length > 0 && (
        <NextStepBanner
          icon={<Sparkles size={16} />}
          tone="honey"
          title={`${drifting.length} client${drifting.length === 1 ? '' : 's'} haven't checked in lately`}
          body="No check-in in 10+ days. Reach out before they drift further — even a one-line message helps."
          actionLabel="See who"
          actionTo="/clients"
        />
      )}

      {tableMissing && (
        <SetupNotice />
      )}

      {/* Today's sessions — prominent on the home page because PN
          coaching IS weekly live calls. If there's nothing today,
          this section quietly stays out of the way. */}
      {(todaysSessions ?? []).length > 0 && (
        <TodaysSessionsCard sessions={todaysSessions ?? []} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
        {/* Main column — pending check-ins as feature cards */}
        <section>
          <SectionHead title="On my desk this week" subtitle="Client check-ins waiting for review" />
          {pending.length === 0 ? (
            tableMissing ? null : (
              <EmptyNote text="Nothing pending. Beautiful." />
            )
          ) : (
            <ul className="space-y-4">
              {pending.slice(0, 5).map((c) => {
                const client = (clients ?? []).find((x) => x.id === c.client_id);
                return <CheckInFeatureCard key={c.id} checkIn={c} clientName={client?.full_name ?? 'Unknown'} />;
              })}
            </ul>
          )}

          {/* Drift list — clients who haven't checked in */}
          {drifting.length > 0 && (
            <div className="mt-10">
              <SectionHead title="Drifting" subtitle="No check-in in 10+ days" />
              <ul className="grid sm:grid-cols-2 gap-2">
                {drifting.map(({ client, last }) => (
                  <li
                    key={client.id}
                    className="px-4 py-3 rounded-xl flex items-center justify-between gap-3"
                    style={{
                      background: N.card,
                      border: `1px solid ${N.rule}`,
                    }}
                  >
                    <span
                      className="truncate text-sm font-medium"
                      style={{ color: N.ink }}
                    >
                      {client.full_name}
                    </span>
                    <span
                      className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-full"
                      style={{
                        color: N.honey,
                        background: N.honeySoft,
                      }}
                    >
                      {last ? relativeWhen(last.submitted_at) : 'never'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Side rail — practice at a glance, editorial blockquote style */}
        <aside>
          <SectionHead title="The practice" subtitle="At a glance" />
          <PracticeStat
            big={(clients ?? []).length.toString()}
            label="Active clients"
          />
          <PracticeStat
            big={avgCompliance != null ? `${avgCompliance}%` : '—'}
            label="Recent compliance"
            tone="sage"
          />
          <PracticeStat
            big={pending.length.toString()}
            label="Check-ins pending"
            tone={pending.length > 3 ? 'coral' : 'normal'}
          />

          {/* Featured-client preview — the one closest to their goal */}
          <FeaturedClient clients={clients ?? []} />
        </aside>
      </div>
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2
        className="leading-tight"
        style={{
          fontFamily: SERIF_FONT,
          color: N.ink,
          fontSize: '1.25rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <p className="text-xs mt-1" style={{ color: N.mute }}>
        {subtitle}
      </p>
    </div>
  );
}

function CheckInFeatureCard({
  checkIn,
  clientName,
}: {
  checkIn: CheckInRow;
  clientName: string;
}) {
  return (
    <li
      className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        boxShadow: 'var(--nut-shadow)',
      }}
    >
      <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[88px_1fr]">
        {/* Avatar tile with the client's initial */}
        <div
          className="flex items-center justify-center"
          style={{ background: N.coralSoft }}
        >
          <span
            className="font-semibold"
            style={{
              color: N.coralDeep,
              fontSize: '1.875rem',
              fontFamily: SERIF_FONT,
            }}
          >
            {(clientName[0] || '?').toUpperCase()}
          </span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="leading-tight"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: '1.0625rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {clientName}
            </h4>
            <span
              className="text-xs"
              style={{ color: N.mute }}
            >
              · {relativeWhen(checkIn.submitted_at)}
            </span>
          </div>
          {checkIn.client_notes && (
            <p
              className="text-sm mb-3 leading-relaxed line-clamp-2"
              style={{ color: N.inkSoft }}
            >
              {trimNotes(checkIn.client_notes)}
            </p>
          )}
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-3">
            <StatPair label="Weight" value={checkIn.weight_lb != null ? `${checkIn.weight_lb} lb` : null} />
            <StatPair label="Compliance" value={checkIn.compliance_pct != null ? `${checkIn.compliance_pct}%` : null} />
            <StatPair label="Energy" value={checkIn.energy_1_5 != null ? `${checkIn.energy_1_5}/5` : null} />
            <StatPair label="Hunger" value={checkIn.hunger_1_5 != null ? `${checkIn.hunger_1_5}/5` : null} />
            <StatPair label="Sleep" value={checkIn.sleep_hours_avg != null ? `${checkIn.sleep_hours_avg.toFixed(1)}h` : null} />
          </dl>
          <Link
            to="/check-ins"
            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: N.coral }}
          >
            Read & reply →
          </Link>
        </div>
      </div>
    </li>
  );
}

function StatPair({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="inline-flex items-baseline gap-1">
      <dt
        className="text-[10px] uppercase font-semibold"
        style={{ color: N.mute, letterSpacing: '0.05em' }}
      >
        {label}
      </dt>
      <dd
        className="font-semibold tabular-nums"
        style={{ color: N.ink, fontSize: '0.875rem' }}
      >
        {value}
      </dd>
    </div>
  );
}

function PracticeStat({
  big,
  label,
  tone = 'normal',
}: {
  big: string;
  label: string;
  tone?: 'normal' | 'sage' | 'coral';
}) {
  const color = tone === 'sage' ? N.sageDeep : tone === 'coral' ? N.coralDeep : N.ink;
  return (
    <div
      className="rounded-xl px-4 py-3 mb-2"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
      }}
    >
      <p
        className="leading-none mb-1 font-semibold"
        style={{
          fontFamily: SERIF_FONT,
          color,
          fontSize: '1.75rem',
          letterSpacing: '-0.02em',
        }}
      >
        {big}
      </p>
      <p
        className="text-xs font-medium"
        style={{ color: N.mute }}
      >
        {label}
      </p>
    </div>
  );
}

function FeaturedClient({ clients }: { clients: Client[] }) {
  // PN-style featured panel — the clients whose 2-week practice window
  // has ended. These need the coach's attention NOW because the next
  // habit should be assigned. The whole methodology hinges on this beat.
  const ready = useMemo(() => {
    return clients
      .map((c) => ({
        client: c,
        practice: readActivePractice(c.tags),
        days: daysOnPractice(c.tags),
        ready: isPracticeWindowDone(c.tags),
      }))
      .filter((x) => x.ready);
  }, [clients]);

  if (ready.length === 0) {
    const inProgress = clients
      .map((c) => ({ client: c, practice: readActivePractice(c.tags), days: daysOnPractice(c.tags) }))
      .filter((x) => x.practice && x.days != null);
    if (inProgress.length === 0) return null;
    return (
      <div
        className="mt-4 p-4 rounded-xl"
        style={{ background: N.card, border: `1px solid ${N.rule}` }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: N.sageDeep }}
          >
            Practicing now
          </p>
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: N.mute }}
          >
            {inProgress.length} active
          </span>
        </div>
        <ul className="space-y-2">
          {inProgress.slice(0, 5).map(({ client, practice, days }) => (
            <li
              key={client.id}
              className="flex items-center justify-between text-sm"
              style={{ color: N.ink }}
            >
              <span className="font-medium truncate">{client.full_name}</span>
              <span className="text-xs tabular-nums" style={{ color: N.mute }}>
                {practice?.label} · {days}/{PRACTICE_WINDOW_DAYS}d
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className="mt-4 p-4 rounded-xl"
      style={{
        background: N.honeySoft,
        border: `1px solid ${N.honey}55`,
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: N.honey }}
        >
          Ready for next practice
        </p>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: N.honey }}
        >
          {ready.length}
        </span>
      </div>
      <p
        className="text-sm mb-3 leading-relaxed"
        style={{ color: N.ink }}
      >
        2-week window done. Confirm 9-of-10 confidence, then layer in the
        next practice.
      </p>
      <ul className="space-y-2">
        {ready.slice(0, 5).map(({ client, practice }) => {
          const skill = practice ? SKILL_BY_ID[practice.skillId] : null;
          return (
            <li
              key={client.id}
              className="flex items-center justify-between gap-3 text-sm"
              style={{ color: N.ink }}
            >
              <span className="font-medium truncate">{client.full_name}</span>
              <span
                className="text-xs font-semibold shrink-0"
                style={{ color: skill?.color ?? N.mute }}
              >
                {practice?.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SetupNotice() {
  return (
    <div
      className="mb-6 p-4 rounded-xl flex items-start gap-3"
      style={{
        background: N.honeySoft,
        border: `1px solid ${N.honey}55`,
      }}
    >
      <div className="shrink-0 mt-0.5" style={{ color: N.honey }}>⚠</div>
      <div>
        <p
          className="text-sm font-semibold mb-1"
          style={{ color: N.ink }}
        >
          One-time setup needed
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: N.inkSoft }}
        >
          The check-ins table isn't installed yet. Run migration{' '}
          <code>32_nutrition_check_ins.sql</code> in your Supabase SQL editor,
          then reload.
        </p>
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p
      className="text-center py-10 text-sm"
      style={{ color: N.mute }}
    >
      {text}
    </p>
  );
}

/** Today's coaching sessions card — surfaces video / in-person /
 *  phone sessions on the home page. The first thing a real coach
 *  wants to see in the morning. */
function TodaysSessionsCard({
  sessions,
}: {
  sessions: (Session & { clients: { full_name: string } | null })[];
}) {
  return (
    <section
      className="rounded-xl overflow-hidden mb-6"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
      }}
    >
      <header
        className="px-4 py-3 flex items-baseline justify-between gap-3 border-b"
        style={{ borderColor: N.rule }}
      >
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold" style={{ color: N.ink }}>
            Today's sessions
          </h2>
          <span className="text-xs" style={{ color: N.mute }}>
            {sessions.length} {sessions.length === 1 ? 'call' : 'calls'} on the calendar
          </span>
        </div>
        <Link
          to="/sessions"
          className="text-xs font-semibold hover:underline"
          style={{ color: N.coral }}
        >
          All sessions →
        </Link>
      </header>
      <ul className="divide-y" style={{ borderColor: N.rule }}>
        {sessions.map((s) => {
          const start = new Date(s.starts_at);
          const isVideoLink = s.location && /^https?:\/\//.test(s.location);
          const kindIcon =
            s.session_type === 'in_person' ? (
              <MapPin size={13} />
            ) : s.session_type === 'phone' ? (
              <Phone size={13} />
            ) : (
              <Video size={13} />
            );
          return (
            <li
              key={s.id}
              className="px-4 py-3 flex items-center gap-3"
            >
              <div
                className="shrink-0 rounded-lg w-14 h-12 flex flex-col items-center justify-center"
                style={{ background: N.inset }}
              >
                <span
                  className="font-bold leading-none tabular-nums"
                  style={{
                    color: N.ink,
                    fontSize: '1.0625rem',
                    fontFamily: SERIF_FONT,
                  }}
                >
                  {start.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                  })}
                </span>
                <span
                  className="text-[10px] uppercase font-bold tracking-wide mt-0.5"
                  style={{ color: N.mute }}
                >
                  {start.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })
                    .split(' ')[1]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/clients/${s.client_id}`}
                  className="font-semibold hover:underline"
                  style={{ color: N.ink, fontSize: '0.9375rem' }}
                >
                  {s.clients?.full_name ?? 'Unknown client'}
                </Link>
                <p
                  className="text-xs flex items-center gap-1.5 mt-0.5"
                  style={{ color: N.mute }}
                >
                  {kindIcon}
                  {s.session_type === 'in_person'
                    ? 'In person'
                    : s.session_type === 'phone'
                      ? 'Phone'
                      : 'Video call'}
                  {s.ends_at && (
                    <>
                      {' · '}
                      {Math.round(
                        (new Date(s.ends_at).getTime() - start.getTime()) / 60000,
                      )}{' '}
                      min
                    </>
                  )}
                </p>
              </div>
              {isVideoLink && s.location && (
                <a
                  href={s.location}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-95"
                  style={{ background: N.coral, color: '#FFF' }}
                >
                  <Video size={12} /> Join
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Welcome card shown to a coach who has no clients and no check-ins
 *  yet. Three clear, numbered steps with one obvious primary action. */
function WelcomeCard() {
  return (
    <section
      className="rounded-2xl p-6 sm:p-8 mb-8"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
        boxShadow: 'var(--nut-shadow)',
      }}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: N.coralSoft, color: N.coral }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <h2
            className="leading-tight mb-1"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Three steps to your first coaching week
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: N.mute }}>
            Your practice uses the Precision Nutrition method — assign one
            simple daily habit at a time, review weekly, layer the next.
            Start here.
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        <Step
          number={1}
          title="Add your first client"
          body="Capture their goal and a starting practice. We recommend starting every new client on 'Eat slowly' — PN's highest-ROI habit."
          actionLabel="Add a client"
          actionIcon={<UserPlus size={14} />}
          actionTo="/clients"
        />
        <Step
          number={2}
          title="Browse the Library"
          body="See the PN curriculum: 7 skills broken into daily practices. Pick one practice per client, work it for 2 weeks, then move on."
          actionLabel="See the Library"
          actionIcon={<BookOpen size={14} />}
          actionTo="/plans"
          tone="ghost"
        />
        <Step
          number={3}
          title="Ask the AI coach anything"
          body='If you get stuck, ask the AI coach. It is trained on PN methodology. Try: "What practice should I start a fat-loss client on?"'
          actionLabel="Ask the coach"
          actionIcon={<Sparkles size={14} />}
          actionTo="/ask"
          tone="ghost"
        />
      </ol>
    </section>
  );
}

function Step({
  number,
  title,
  body,
  actionLabel,
  actionIcon,
  actionTo,
  tone = 'primary',
}: {
  number: number;
  title: string;
  body: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
  actionTo: string;
  tone?: 'primary' | 'ghost';
}) {
  return (
    <li className="flex items-start gap-4">
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{
          background: tone === 'primary' ? N.coral : N.inset,
          color: tone === 'primary' ? '#FFF' : N.mute,
        }}
      >
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <h3
          className="font-semibold mb-0.5"
          style={{ color: N.ink, fontSize: '0.9375rem' }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-relaxed mb-2"
          style={{ color: N.inkSoft }}
        >
          {body}
        </p>
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-95"
          style={
            tone === 'primary'
              ? { background: N.coral, color: '#FFF' }
              : {
                  background: 'transparent',
                  color: N.coral,
                  border: `1px solid ${N.coral}55`,
                }
          }
        >
          {actionIcon} {actionLabel}
        </Link>
      </div>
    </li>
  );
}

/** Smart banner shown at the top of the home page once a coach has
 *  clients but there's a specific thing they should do next. */
function NextStepBanner({
  icon,
  tone,
  title,
  body,
  actionLabel,
  actionTo,
}: {
  icon: React.ReactNode;
  tone: 'coral' | 'honey' | 'sage';
  title: string;
  body: string;
  actionLabel: string;
  actionTo: string;
}) {
  const palette =
    tone === 'coral'
      ? { bg: N.coralSoft, fg: N.coralDeep, accent: N.coral }
      : tone === 'honey'
        ? { bg: N.honeySoft, fg: N.honey, accent: N.honey }
        : { bg: N.sageSoft, fg: N.sageDeep, accent: N.sage };
  return (
    <section
      className="rounded-xl px-4 sm:px-5 py-4 mb-6 flex items-start gap-3"
      style={{ background: palette.bg, border: `1px solid ${palette.accent}33` }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: '#FFFFFF', color: palette.accent }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-semibold leading-tight mb-0.5"
          style={{ color: N.ink, fontSize: '0.9375rem' }}
        >
          {title}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: N.inkSoft }}
        >
          {body}
        </p>
      </div>
      <Link
        to={actionTo}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-95 mt-0.5"
        style={{ background: palette.accent, color: '#FFF' }}
      >
        {actionLabel} <ArrowRight size={12} />
      </Link>
    </section>
  );
}

function greeting(t: Trainer | undefined): string {
  const hour = new Date().getHours();
  const tod =
    hour < 5 ? 'Late, but' : hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';
  const name = t?.full_name?.split(' ')[0] ?? 'coach';
  return `${tod} ${name}.`;
}

function trimNotes(s: string): string {
  if (s.length <= 180) return s;
  return s.slice(0, 180).trim() + '…';
}
