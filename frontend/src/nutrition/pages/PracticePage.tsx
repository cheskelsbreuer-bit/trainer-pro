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
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Trainer } from '../../lib/database.types';
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

  return (
    <div className="px-4 sm:px-8 py-8 max-w-6xl mx-auto">
      {/* Page header — left-aligned, app-style */}
      <section className="mb-8">
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
          {pending.length === 0
            ? 'No check-ins waiting. A quiet start to the week.'
            : `${pending.length} check-in${pending.length === 1 ? '' : 's'} waiting for your review.`}
        </p>
      </section>

      {tableMissing && (
        <SetupNotice />
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
