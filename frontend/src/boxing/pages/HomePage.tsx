// The Card — boxing dashboard. Hero is a full-bleed FIGHT POSTER for
// the next upcoming bout. Below: a horizontally-scrolling stable ticker
// + a newspaper-style stats strip + a recent-results column.
//
// Deliberately NOT structured like the dojo's "stats tiles + section
// cards" pattern. The poster is the hero; the page below the poster
// reads like the back of a fight program.

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client, Payment, Trainer } from '../../lib/database.types';
import { formatMoney } from '../../lib/format';
import {
  C,
  DISPLAY_FONT,
  computeRecord,
  recordString,
  readTier,
  readWeight,
  readStance,
  readHeight,
  readReach,
  readCurrentWeight,
  ageFromDob,
  FIGHTER_TIERS,
  type FightRow,
} from '../theme';
import { FightPoster } from '../components/FightPoster';

type PayWith = Payment & { clients: { full_name: string } | null };

export function HomePage({ trainer }: { trainer: Trainer | undefined }) {
  const { user } = useAuth();

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
        (s, p: Pick<Payment, 'amount'>) => s + Number(p.amount),
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
        .limit(6);
      if (error) throw error;
      return (data ?? []) as PayWith[];
    },
  });

  // Last-seen for each fighter — derives an inactivity callout. Real
  // boxing apps surface this so coaches catch drift before the fighter
  // quits altogether ("attendance trends" in the marketing copy).
  const { data: lastSeen } = useQuery({
    queryKey: ['boxing-last-seen', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('client_id, starts_at')
        .order('starts_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const m = new Map<string, string>();
      (data ?? []).forEach((r: { client_id: string; starts_at: string }) => {
        if (!m.has(r.client_id)) m.set(r.client_id, r.starts_at);
      });
      return m;
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

  const fighterStats = useMemo(
    () =>
      (fighters ?? []).map((f) => ({
        fighter: f,
        record: computeRecord(fightsByFighter.get(f.id) ?? []),
        tier: readTier(f.tags),
        weight: readWeight(f.tags),
        stance: readStance(f.tags),
      })),
    [fighters, fightsByFighter],
  );

  const nextBout = useMemo(() => {
    const now = Date.now();
    const upcoming = (fights ?? [])
      .filter((f) => f.result === null && new Date(f.starts_at).getTime() >= now)
      .sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    return upcoming[0] ?? null;
  }, [fights]);

  const recentResults = useMemo(() => {
    return (fights ?? [])
      .filter((f) => f.result !== null)
      .sort(
        (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      )
      .slice(0, 5);
  }, [fights]);

  const tierCounts = useMemo(() => {
    const m: Record<string, number> = {};
    fighterStats.forEach((x) => {
      m[x.tier.id] = (m[x.tier.id] ?? 0) + 1;
    });
    return FIGHTER_TIERS.map((t) => ({ tier: t, count: m[t.id] ?? 0 }));
  }, [fighterStats]);

  // Inactive = on the active roster but hasn't trained in 7+ days. Cap
  // at 5 callouts so the strip doesn't dominate the page.
  const offTheMat = useMemo(() => {
    if (!fighters || !lastSeen) return [];
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return fighters
      .map((f) => {
        const last = lastSeen.get(f.id);
        if (!last) return { fighter: f, last: null as string | null, daysAgo: Infinity };
        return {
          fighter: f,
          last,
          daysAgo: Math.floor((Date.now() - new Date(last).getTime()) / 86400000),
        };
      })
      .filter((x) => !x.last || new Date(x.last).getTime() < sevenDaysAgo)
      .sort((a, b) => b.daysAgo - a.daysAgo)
      .slice(0, 5);
  }, [fighters, lastSeen]);

  return (
    <div>
      {/* Marquee under the nav — like the running-headline strip in a stadium */}
      <div
        className="px-6 sm:px-10 py-2 border-b text-[11px] uppercase tracking-[0.3em] flex flex-wrap gap-x-6 gap-y-1"
        style={{
          background: C.inkSoft,
          borderColor: C.rule,
          color: C.textDim,
        }}
      >
        <span style={{ color: C.beltGold }}>
          {greeting(trainer)}
        </span>
        <span>{(fighters ?? []).length} fighters in the stable</span>
        <span>
          this month: <strong style={{ color: C.text }}>{formatMoney(monthRevenue ?? 0)}</strong>
        </span>
        {tierCounts.map(({ tier, count }) => (
          <span key={tier.id} style={{ color: tier.color }}>
            {count} {tier.label}
          </span>
        ))}
      </div>

      {/* Inactive fighters — the "drift radar". Surfaces fighters who
          haven't trained in 7+ days BEFORE they quietly disappear. A
          real boxing app's most useful retention signal. */}
      {offTheMat.length > 0 && (
        <div
          className="px-4 sm:px-8 py-3 border-b flex items-center gap-3 overflow-x-auto"
          style={{
            background: C.inkSoft,
            borderColor: C.rule,
          }}
        >
          <span
            className="text-[10px] uppercase tracking-[0.4em] font-bold shrink-0"
            style={{ color: C.danger }}
          >
            Off the mat:
          </span>
          {offTheMat.map(({ fighter, last, daysAgo }) => (
            <span
              key={fighter.id}
              className="shrink-0 flex items-baseline gap-2 px-2.5 py-1 text-xs"
              style={{
                background: C.ink,
                border: `1px solid ${C.danger}55`,
              }}
            >
              <span
                className="font-bold uppercase"
                style={{
                  fontFamily: DISPLAY_FONT,
                  color: C.text,
                  letterSpacing: '0.05em',
                }}
              >
                {fighter.full_name}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest"
                style={{ color: C.danger }}
              >
                {last
                  ? daysAgo === Infinity
                    ? 'never'
                    : `${daysAgo}d ago`
                  : 'never trained'}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Poster hero — the dashboard's centerpiece */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-10 pb-8">
        {nextBout ? (
          <PosterFromFight
            fight={nextBout}
            fighters={fighters ?? []}
            fightsByFighter={fightsByFighter}
          />
        ) : (
          <NoFightCard />
        )}
      </div>

      {/* The stable ticker — horizontal scroll */}
      <section className="border-t pt-6 pb-4" style={{ borderColor: C.rule }}>
        <SectionMasthead title="The Stable" />
        {fighterStats.length === 0 ? (
          <p
            className="px-8 py-12 text-center text-sm"
            style={{ color: C.textFaint }}
          >
            No fighters in the stable yet. Head to <Link className="underline" to="/stable" style={{ color: C.red }}>Stable</Link> to add one.
          </p>
        ) : (
          <div className="overflow-x-auto px-6 sm:px-10 py-3">
            <div className="flex gap-3 pb-2 min-w-min">
              {fighterStats.map(({ fighter, record, tier, weight }) => (
                <div
                  key={fighter.id}
                  className="shrink-0 w-44 p-3"
                  style={{
                    background: C.inkSoft,
                    border: `1px solid ${C.rule}`,
                    borderTop: `3px solid ${tier.color}`,
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: tier.color }}
                  >
                    {tier.label}
                  </p>
                  <p
                    className="font-black uppercase mt-0.5 truncate"
                    style={{
                      fontFamily: DISPLAY_FONT,
                      color: C.text,
                      fontSize: '1.125rem',
                      letterSpacing: '0.04em',
                      lineHeight: 1.05,
                    }}
                    title={fighter.full_name}
                  >
                    {fighter.full_name}
                  </p>
                  <p
                    className="font-mono mt-2"
                    style={{ color: C.beltGold, fontSize: '1.25rem' }}
                  >
                    {record.total === 0 ? '—' : recordString(record)}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-widest mt-0.5"
                    style={{ color: C.textDim }}
                  >
                    {weight?.label ?? 'no weight class'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Two columns: recent results (left, the bigger story) and money pulse (right) */}
      <section
        className="border-t mt-2 grid grid-cols-1 lg:grid-cols-[2fr_1fr]"
        style={{ borderColor: C.rule }}
      >
        <div className="border-b lg:border-b-0 lg:border-r" style={{ borderColor: C.rule }}>
          <SectionMasthead title="Recent Results" />
          {recentResults.length === 0 ? (
            <p
              className="px-8 py-12 text-center text-sm"
              style={{ color: C.textFaint }}
            >
              No fight results on file yet.
            </p>
          ) : (
            <ul>
              {recentResults.map((r) => {
                const fighter = (fighters ?? []).find((x) => x.id === r.fighter_id);
                const color =
                  r.result === 'win' ? C.ok : r.result === 'loss' ? C.danger : C.textDim;
                return (
                  <li
                    key={r.id}
                    className="px-6 sm:px-10 py-3 border-t flex items-center gap-4 text-sm"
                    style={{ borderColor: C.rule }}
                  >
                    <span
                      className="font-mono font-black uppercase shrink-0"
                      style={{
                        color,
                        fontFamily: DISPLAY_FONT,
                        fontSize: '1rem',
                        letterSpacing: '0.1em',
                        width: 50,
                      }}
                    >
                      {(r.result ?? '—').toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold uppercase truncate"
                        style={{
                          fontFamily: DISPLAY_FONT,
                          color: C.text,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {fighter?.full_name ?? 'Unknown'} <span style={{ color: C.textDim }}>vs.</span>{' '}
                        {r.opponent_name ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: C.textDim }}>
                        {new Date(r.starts_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        {r.decision ? `· ${r.decision}` : ''}
                        {r.venue ? ` · ${r.venue}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <SectionMasthead title="The Books" subline="Money this month" />
          <div className="px-6 sm:px-8 pt-4 pb-2">
            <p
              className="font-black"
              style={{
                fontFamily: DISPLAY_FONT,
                color: C.beltGold,
                fontSize: '3rem',
                letterSpacing: '0.02em',
                lineHeight: 0.95,
              }}
            >
              {formatMoney(monthRevenue ?? 0)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: C.textDim }}>
              accumulated this month
            </p>
          </div>
          <ul className="border-t" style={{ borderColor: C.rule }}>
            {(recentPayments ?? []).map((p) => (
              <li
                key={p.id}
                className="px-6 sm:px-8 py-2.5 border-t flex items-center justify-between text-sm"
                style={{ borderColor: C.rule }}
              >
                <span
                  className="truncate font-bold uppercase"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    color: C.text,
                    letterSpacing: '0.03em',
                  }}
                >
                  {p.clients?.full_name ?? '—'}
                </span>
                <span className="font-mono" style={{ color: C.beltGold }}>
                  {formatMoney(Number(p.amount))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function SectionMasthead({ title, subline }: { title: string; subline?: string }) {
  return (
    <div
      className="px-6 sm:px-10 py-3 flex items-baseline justify-between gap-3"
      style={{ background: C.inkSoft }}
    >
      <h2
        className="font-black uppercase"
        style={{
          fontFamily: DISPLAY_FONT,
          color: C.text,
          fontSize: '1.5rem',
          letterSpacing: '0.1em',
          lineHeight: 1,
        }}
      >
        {title}
      </h2>
      {subline && (
        <span
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: C.red }}
        >
          {subline}
        </span>
      )}
    </div>
  );
}

function PosterFromFight({
  fight,
  fighters,
  fightsByFighter,
}: {
  fight: FightRow;
  fighters: Client[];
  fightsByFighter: Map<string, FightRow[]>;
}) {
  const fighter = fighters.find((x) => x.id === fight.fighter_id);
  if (!fighter) return <NoFightCard />;
  const tier = readTier(fighter.tags);
  const weight = readWeight(fighter.tags);
  const stance = readStance(fighter.tags);
  const record = computeRecord(fightsByFighter.get(fighter.id) ?? []);

  return (
    <FightPoster
      banner="Next bout"
      date={fight.starts_at}
      venue={fight.venue}
      variant="hero"
      red={{
        name: fighter.full_name,
        record,
        tier: { label: tier.label, color: tier.color },
        weightLabel: weight?.label ?? null,
        stance,
        heightIn: readHeight(fighter.tags),
        reachIn: readReach(fighter.tags),
        age: ageFromDob(fighter.date_of_birth),
        weightLb: readCurrentWeight(fighter.tags),
      }}
      blue={
        fight.opponent_name
          ? {
              name: fight.opponent_name,
              heightIn: fight.opponent_height_in ?? null,
              reachIn: fight.opponent_reach_in ?? null,
              age: fight.opponent_age ?? null,
              stance:
                (fight.opponent_stance as 'orthodox' | 'southpaw' | null) ?? null,
            }
          : null
      }
    />
  );
}

function NoFightCard() {
  return (
    <article
      className="relative px-8 py-16 text-center"
      style={{
        background: C.ink,
        border: `1px dashed ${C.rule}`,
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.5em] mb-3"
        style={{ color: C.red }}
      >
        No bouts on the calendar
      </p>
      <p
        className="font-black uppercase mb-2"
        style={{
          fontFamily: DISPLAY_FONT,
          color: C.text,
          fontSize: 'clamp(2rem, 4vw, 3.5rem)',
          letterSpacing: '0.04em',
          lineHeight: 0.95,
        }}
      >
        Open the gym, ring the bell.
      </p>
      <p className="text-xs uppercase tracking-[0.3em]" style={{ color: C.textDim }}>
        Book your fighter's next bout from <Link to="/fight-night" className="underline" style={{ color: C.red }}>Fight Night</Link>.
      </p>
    </article>
  );
}

function greeting(t: Trainer | undefined): string {
  const hour = new Date().getHours();
  const tod = hour < 5 ? 'late night' : hour < 12 ? 'good morning' : hour < 17 ? 'good afternoon' : 'good evening';
  const name = t?.full_name?.split(' ')[0] ?? 'coach';
  return `${tod}, ${name}`;
}
