// ── Live session — coach entry to the logger ─────────────────────────
// /coach-preview/live/:clientId?session=…  Picks the client's plan (or
// lets the coach grab a template on the spot), runs LoggerCore, saves
// the log, and marks the calendar session done.

import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { WorkoutPlan } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, initialsOf } from '../theme';
import { useCoachClients } from '../lib/roster';
import { useCoachBase } from '../lib/base';
import { usePlans, useAssignPlan, useClientLogs, lastByExercise, useSaveLog, useCompleteSession, type CoachBlock } from '../lib/workouts';
import { LoggerCore } from '../components/LoggerCore';

export function LivePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [params] = useSearchParams();
  const sessionId = params.get('session');
  const navigate = useNavigate();
  const base = useCoachBase();
  const { user } = useAuth();

  const { data: clients } = useCoachClients();
  const client = useMemo(() => (clients ?? []).find((c) => c.id === clientId), [clients, clientId]);

  const { data: plans, isLoading: plansLoading } = usePlans();
  const clientPlans = useMemo(() => (plans ?? []).filter((p) => p.client_id === clientId), [plans, clientId]);
  const templates = useMemo(() => (plans ?? []).filter((p) => p.client_id === null), [plans]);

  const { data: logs, isLoading: logsLoading } = useClientLogs(clientId);
  const lastMap = useMemo(() => lastByExercise(logs), [logs]);

  const assign = useAssignPlan();
  const saveLog = useSaveLog();
  const completeSession = useCompleteSession();

  const [picked, setPicked] = useState<WorkoutPlan | null>(null);
  const plan = picked ?? (clientPlans.length === 1 ? clientPlans[0] : null);

  async function finish(actuals: Parameters<typeof saveLog.mutateAsync>[0]['exercises_actual'], note: string) {
    if (!user || !clientId) return;
    await saveLog.mutateAsync({
      trainer_id: user.id,
      client_id: clientId,
      session_id: sessionId,
      plan_id: plan?.id ?? null,
      exercises_actual: actuals,
      notes: note || null,
    });
    if (sessionId) await completeSession.mutateAsync({ sessionId, client }).catch(() => undefined);
    navigate(base || '/', { replace: true });
  }

  // Wait for history before the logger mounts — set weights seed from
  // "last time", and that seed happens once, on first render.
  if (!client || logsLoading) {
    return <div style={{ color: F.mute, padding: 30, textAlign: 'center' }}>Loading client…</div>;
  }

  // Plan picker — when the client has several days, or none yet.
  if (!plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: F.edge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 17 }}>
            {initialsOf(client.full_name)}
          </div>
          <div>
            <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 24, textTransform: 'uppercase' }}>{client.full_name.split(' ')[0]}&rsquo;s session</div>
            <div style={{ fontSize: 12.5, color: F.mute }}>Pick today&rsquo;s workout</div>
          </div>
        </div>

        {plansLoading ? (
          <div style={{ color: F.mute, fontSize: 14 }}>Loading plans…</div>
        ) : (
          <>
            {clientPlans.map((p) => (
              <button
                key={p.id}
                onClick={() => setPicked(p)}
                style={{ textAlign: 'left', background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '15px 16px', cursor: 'pointer', color: F.ink, fontFamily: TYPE.body, minHeight: HIT }}
              >
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: F.mute, marginTop: 2 }}>{(p.exercises ?? []).length} exercises</div>
              </button>
            ))}

            {clientPlans.length === 0 && (
              <>
                <div style={{ fontSize: 13.5, color: F.mute }}>
                  {client.full_name.split(' ')[0]} has no plan yet — grab one of your templates and it becomes theirs:
                </div>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    disabled={assign.isPending}
                    onClick={async () => {
                      await assign.mutateAsync({ template: t, client_id: client.id });
                      setPicked({ ...t, client_id: client.id });
                    }}
                    style={{ textAlign: 'left', background: F.card, border: `1.5px dashed ${F.edge}`, borderRadius: RADII.md, padding: '15px 16px', cursor: 'pointer', color: F.ink, fontFamily: TYPE.body, minHeight: HIT }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15.5 }}>{t.name}</div>
                    <div style={{ fontSize: 12.5, color: F.mute, marginTop: 2 }}>template · {(t.exercises ?? []).length} exercises</div>
                  </button>
                ))}
                {templates.length === 0 && (
                  <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '22px 18px', textAlign: 'center', color: F.mute, fontSize: 13.5 }}>
                    No plans yet at all — build your first one in Programs, it takes two minutes.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <LoggerCore
      title={plan.name}
      subtitle={`${client.full_name} · live`}
      blocks={(plan.exercises ?? []) as CoachBlock[]}
      lastByName={lastMap}
      finishLabel="Finish session"
      onFinish={(a, n) => void finish(a, n)}
      saving={saveLog.isPending || completeSession.isPending}
    />
  );
}
