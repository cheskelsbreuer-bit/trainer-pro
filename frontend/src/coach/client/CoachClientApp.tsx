// ── The client's side of the Coach app ───────────────────────────────
//
// What a 1-on-1 client sees when they sign in: their next session,
// the workouts their coach gave them, and their own history. Solo days
// run the SAME LoggerCore the coach uses live — both write to the same
// workout_logs, so "last time" is always true on either side. RLS
// already lets clients read their own plans/sessions and write their
// own logs; nothing here needs new backend.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Session, WorkoutPlan } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, initialsOf, shortDate, timeOf } from '../theme';
import { useClientLogs, lastByExercise, useSaveLog, summarizeActual, type CoachBlock, type ActualBlock } from '../lib/workouts';
import { LoggerCore } from '../components/LoggerCore';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export interface CoachClientTrainer {
  full_name: string | null;
  business_name: string | null;
}

function useMyPlans(clientId: string) {
  return useQuery({
    queryKey: ['my-plans', clientId],
    queryFn: async (): Promise<WorkoutPlan[]> => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
  });
}

function useMyNextSession(clientId: string) {
  return useQuery({
    queryKey: ['my-next-session', clientId],
    queryFn: async (): Promise<Session | null> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'scheduled')
        .gte('starts_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] as Session | undefined) ?? null;
    },
  });
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.lg, padding: '16px 18px', ...style }}>
      {children}
    </div>
  );
}

function sessionDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function CoachClientApp({ client, trainer }: { client: Client; trainer: CoachClientTrainer | null }) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<'home' | 'history'>('home');
  const [workingOut, setWorkingOut] = useState<WorkoutPlan | null>(null);

  const { data: plans, isLoading: plansLoading } = useMyPlans(client.id);
  const { data: nextSession } = useMyNextSession(client.id);
  const { data: logs, isLoading: logsLoading } = useClientLogs(client.id);
  const lastMap = useMemo(() => lastByExercise(logs), [logs]);
  const saveLog = useSaveLog();

  const firstName = client.full_name.split(' ')[0];
  const coachName = trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'Your coach';

  async function finishSolo(actuals: ActualBlock[], note: string) {
    if (!workingOut) return;
    await saveLog.mutateAsync({
      trainer_id: client.trainer_id,
      client_id: client.id,
      plan_id: workingOut.id,
      exercises_actual: actuals,
      notes: note || null,
    });
    setWorkingOut(null);
    setTab('history');
  }

  const shellStyle: React.CSSProperties = {
    minHeight: '100vh', background: F.bg, color: F.ink, fontFamily: TYPE.body,
  };
  const mainStyle: React.CSSProperties = {
    maxWidth: 560, margin: '0 auto', padding: '18px 16px 104px',
  };

  // Full-screen logger takeover for a solo workout. Waits for history —
  // the logger seeds set weights from "last time" once, on first render.
  if (workingOut) {
    if (logsLoading) {
      return (
        <div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: F.mute }}>
          Warming up…
        </div>
      );
    }
    return (
      <div style={shellStyle}>
        <div style={mainStyle}>
          <button
            onClick={() => setWorkingOut(null)}
            style={{ marginBottom: 12, height: 38, padding: '0 14px', borderRadius: RADII.pill, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: TYPE.body }}
          >
            ← Not now
          </button>
          <LoggerCore
            title={workingOut.name}
            subtitle="Your workout"
            blocks={(workingOut.exercises ?? []) as CoachBlock[]}
            lastByName={lastMap}
            finishLabel="Done — send to coach"
            onFinish={(a, n) => void finishSolo(a, n)}
            saving={saveLog.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={mainStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: F.accent, color: F.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {initialsOf(coachName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>{coachName}</div>
            <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', lineHeight: 1.1 }}>
              {tab === 'home' ? `Hey ${firstName}` : 'Your history'}
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            style={{ marginLeft: 'auto', height: 34, padding: '0 12px', borderRadius: RADII.pill, border: `1px solid ${F.edge}`, background: 'transparent', color: F.mute, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: TYPE.body }}
          >
            Sign out
          </button>
        </div>

        {tab === 'home' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Next session */}
            {nextSession && (
              <Card style={{ display: 'flex', alignItems: 'center', gap: 12, borderColor: F.accentSoft, background: F.cardDeep }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.accentSoftInk }}>Next session</div>
                  <div style={{ fontWeight: 800, fontSize: 17, marginTop: 2 }}>
                    {sessionDayLabel(nextSession.starts_at)} · <span style={num}>{timeOf(nextSession.starts_at)}</span>
                  </div>
                  {nextSession.notes ? <div style={{ fontSize: 12.5, color: F.mute, marginTop: 2 }}>{nextSession.notes}</div> : null}
                </div>
              </Card>
            )}

            {/* Workouts */}
            <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
              Your workouts
            </div>
            {plansLoading ? (
              <Card><div style={{ color: F.mute, fontSize: 14 }}>Loading…</div></Card>
            ) : (plans ?? []).length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>No workouts yet</div>
                <div style={{ fontSize: 13.5, color: F.mute, marginTop: 6, lineHeight: 1.5 }}>
                  {coachName} hasn&rsquo;t sent you a plan yet — it&rsquo;ll show up here the moment they do.
                </div>
              </Card>
            ) : (
              (plans ?? []).map((p) => (
                <div key={p.id} style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5 }}>{p.name}</div>
                    <div style={{ fontSize: 12.5, color: F.mute, marginTop: 2 }}>{(p.exercises ?? []).length} exercises</div>
                  </div>
                  <button
                    onClick={() => setWorkingOut(p)}
                    style={{ flexShrink: 0, height: HIT, padding: '0 18px', borderRadius: RADII.pill, border: 'none', cursor: 'pointer', background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 14, fontFamily: TYPE.body }}
                  >
                    Start
                  </button>
                </div>
              ))
            )}

            <div style={{ fontSize: 12.5, color: F.mute, lineHeight: 1.55 }}>
              Training on your own today? Tap Start — your coach sees every set you log.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logsLoading ? (
              <Card><div style={{ color: F.mute, fontSize: 14 }}>Loading…</div></Card>
            ) : (logs ?? []).length === 0 ? (
              <Card style={{ textAlign: 'center', padding: '32px 20px' }}>
                <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 18, textTransform: 'uppercase' }}>Nothing logged yet</div>
                <div style={{ fontSize: 13.5, color: F.mute, marginTop: 6 }}>Your first workout will land here.</div>
              </Card>
            ) : (
              (logs ?? []).map((log) => (
                <Card key={log.id} style={{ padding: '13px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 14.5 }}>{shortDate(log.logged_at)}</span>
                    <span style={{ fontSize: 12, color: F.mute }}>
                      {(() => {
                        const n = (log.exercises_actual ?? []).filter((b) => (b.set_actuals ?? []).length > 0).length;
                        return `${n} exercise${n === 1 ? '' : 's'}`;
                      })()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                    {(log.exercises_actual ?? [])
                      .filter((b) => (b.set_actuals ?? []).length > 0)
                      .slice(0, 6)
                      .map((b, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                          <span style={{ ...num, color: F.inkSoft }}>{summarizeActual(b)}</span>
                        </div>
                      ))}
                  </div>
                  {log.notes ? (
                    <div style={{ fontSize: 12.5, color: F.mute, marginTop: 8, fontStyle: 'italic' }}>&ldquo;{log.notes}&rdquo;</div>
                  ) : null}
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom tabs */}
      <nav
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex',
          background: 'rgba(27, 23, 19, 0.96)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${F.edge}`,
          padding: '8px 10px calc(14px + env(safe-area-inset-bottom))',
        }}
      >
        {([
          { key: 'home', label: 'Today' },
          { key: 'history', label: 'History' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, minHeight: 48, border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t.key ? F.accent : F.mute, fontWeight: tab === t.key ? 800 : 600,
              fontSize: 13.5, fontFamily: TYPE.body, borderRadius: 14,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
