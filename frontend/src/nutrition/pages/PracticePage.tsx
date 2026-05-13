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
  readGoal,
  readCurrentWeight,
  readGoalWeight,
  readStartingWeight,
  computeProgressToGoal,
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
    <div className="px-6 sm:px-12 pt-10 max-w-6xl mx-auto">
      {/* Greeting — like a magazine letter-from-the-editor */}
      <section className="text-center mb-10">
        <p
          className="text-[10px] uppercase tracking-[0.5em] mb-2"
          style={{ color: N.coral }}
        >
          From your desk · {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
        </p>
        <h2
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
            fontWeight: 500,
            letterSpacing: '0.005em',
          }}
        >
          {greeting(trainer)}
        </h2>
        <p
          className="mt-3 text-sm italic max-w-xl mx-auto"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
        >
          {pending.length === 0
            ? 'No check-ins on the desk this morning — a quiet start to the week.'
            : `${pending.length} check-in${pending.length === 1 ? '' : 's'} waiting for your eyes. Let's tend to them.`}
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

          {/* Drift list — those who haven't checked in */}
          {drifting.length > 0 && (
            <div className="mt-12">
              <SectionHead title="Drifting" subtitle="No check-in in 10+ days" />
              <ul className="grid sm:grid-cols-2 gap-3">
                {drifting.map(({ client, last }) => (
                  <li
                    key={client.id}
                    className="px-4 py-3 rounded-lg flex items-baseline justify-between gap-3"
                    style={{
                      background: N.card,
                      border: `1px solid ${N.rule}`,
                      borderLeft: `3px solid ${N.coral}`,
                    }}
                  >
                    <span
                      className="truncate"
                      style={{
                        fontFamily: SERIF_FONT,
                        color: N.ink,
                        fontSize: '1.05rem',
                        fontWeight: 500,
                      }}
                    >
                      {client.full_name}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-widest italic shrink-0"
                      style={{ color: N.coralDeep, fontFamily: SERIF_FONT }}
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
    <div className="mb-5">
      <h3
        className="leading-none"
        style={{
          fontFamily: SERIF_FONT,
          color: N.ink,
          fontSize: '1.875rem',
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <p
        className="text-xs italic mt-1.5"
        style={{ color: N.mute, fontFamily: SERIF_FONT }}
      >
        {subtitle}
      </p>
      <div className="h-px mt-3" style={{ background: N.rule }} />
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
      className="rounded-2xl overflow-hidden"
      style={{
        background: N.card,
        border: `1px solid ${N.rule}`,
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr]">
        {/* "Photo" placeholder — a sage tile with a serif initial */}
        <div
          className="flex items-center justify-center min-h-[120px]"
          style={{ background: N.sageSoft }}
        >
          <span
            style={{
              fontFamily: SERIF_FONT,
              color: N.sageDeep,
              fontSize: '3rem',
              fontWeight: 500,
              fontStyle: 'italic',
            }}
          >
            {(clientName[0] || '?').toUpperCase()}
          </span>
        </div>
        <div className="px-5 py-4">
          <p
            className="text-[10px] uppercase tracking-[0.3em] mb-1"
            style={{ color: N.coral }}
          >
            Check-in · {relativeWhen(checkIn.submitted_at)}
          </p>
          <h4
            className="leading-tight mb-2"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            {clientName}
          </h4>
          {checkIn.client_notes && (
            <p
              className="text-sm italic mb-3"
              style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontStyle: 'italic' }}
            >
              "{trimNotes(checkIn.client_notes)}"
            </p>
          )}
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <StatPair label="Weight" value={checkIn.weight_lb != null ? `${checkIn.weight_lb} lb` : '—'} />
            <StatPair label="Compliance" value={checkIn.compliance_pct != null ? `${checkIn.compliance_pct}%` : '—'} />
            <StatPair label="Energy" value={checkIn.energy_1_5 != null ? `${checkIn.energy_1_5}/5` : '—'} />
            <StatPair label="Hunger" value={checkIn.hunger_1_5 != null ? `${checkIn.hunger_1_5}/5` : '—'} />
            <StatPair label="Sleep" value={checkIn.sleep_hours_avg != null ? `${checkIn.sleep_hours_avg.toFixed(1)}h` : '—'} />
          </dl>
          <Link
            to="/check-ins"
            className="inline-block mt-3 text-xs uppercase tracking-[0.3em] italic"
            style={{ color: N.sageDeep, fontFamily: SERIF_FONT, fontStyle: 'italic' }}
          >
            Read & reply →
          </Link>
        </div>
      </div>
    </li>
  );
}

function StatPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <dt
        className="text-[10px] uppercase tracking-[0.2em]"
        style={{ color: N.mute }}
      >
        {label}
      </dt>
      <dd
        className="font-medium"
        style={{ color: N.ink, fontFamily: SERIF_FONT, fontSize: '0.95rem' }}
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
    <div className="mb-5">
      <p
        className="leading-none mb-1"
        style={{
          fontFamily: SERIF_FONT,
          color,
          fontSize: '2.5rem',
          fontWeight: 500,
        }}
      >
        {big}
      </p>
      <p
        className="text-[10px] uppercase tracking-[0.3em]"
        style={{ color: N.mute }}
      >
        {label}
      </p>
    </div>
  );
}

function FeaturedClient({ clients }: { clients: Client[] }) {
  const featured = useMemo(() => {
    let best: { client: Client; pct: number } | null = null;
    for (const c of clients) {
      const start = readStartingWeight(c.tags);
      const cur = readCurrentWeight(c.tags);
      const goal = readGoalWeight(c.tags);
      const pct = computeProgressToGoal(start, cur, goal);
      if (pct != null && (best === null || pct > best.pct)) {
        best = { client: c, pct };
      }
    }
    return best;
  }, [clients]);

  if (!featured) return null;
  const goal = readGoal(featured.client.tags);
  const cur = readCurrentWeight(featured.client.tags);
  const target = readGoalWeight(featured.client.tags);
  return (
    <div
      className="mt-8 p-4 rounded-2xl"
      style={{
        background: N.sageSoft,
        border: `1px solid ${N.sage}`,
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: N.sageDeep }}>
        Closest to their goal
      </p>
      <h4
        className="leading-tight mt-1 mb-2"
        style={{
          fontFamily: SERIF_FONT,
          color: N.sageDeep,
          fontSize: '1.5rem',
          fontWeight: 600,
        }}
      >
        {featured.client.full_name}
      </h4>
      <p
        className="text-xs italic mb-3"
        style={{ color: N.sageDeep, fontFamily: SERIF_FONT }}
      >
        {goal.label}{cur != null && target != null ? ` · ${cur} → ${target} lb` : ''}
      </p>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(63, 89, 52, 0.15)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ background: N.sage, width: `${Math.round(featured.pct * 100)}%` }}
        />
      </div>
      <p
        className="text-[10px] uppercase tracking-[0.3em] mt-1.5 text-right"
        style={{ color: N.sageDeep }}
      >
        {Math.round(featured.pct * 100)}% of the way
      </p>
    </div>
  );
}

function SetupNotice() {
  return (
    <div
      className="mb-8 p-5 rounded-2xl"
      style={{
        background: N.coralSoft,
        border: `1px solid ${N.coral}`,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.3em] mb-1"
        style={{ color: N.coralDeep }}
      >
        One-time setup
      </p>
      <p
        className="text-sm italic"
        style={{ color: N.ink, fontFamily: SERIF_FONT }}
      >
        The check-ins table isn't installed yet. Run migration{' '}
        <code>32_nutrition_check_ins.sql</code> in your Supabase SQL editor,
        then reload.
      </p>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <p
      className="text-center py-10 italic"
      style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
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
