// ── Client profile — one place per person ────────────────────────────
//
// The sketch's promise: everything about Rivka on one screen. Her pack,
// what she owes, how her lifts moved since day one (computed from real
// logs — progress made undeniable), the coach's private notes, session
// history, and the money ledger. Actions live where the eye lands:
// message her, start a session, sell the renewal.

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, formatMoney, initialsOf, shortDate } from '../theme';
import { useCoachClients, useTrainerProfile } from '../lib/roster';
import { useClientLogs, summarizeActual, type ActualBlock } from '../lib/workouts';
import { useOwedSessions, useClientPayments, useUpdateClient, nudgeHref } from '../lib/money';
import { useClientEntries, useProgressPhotos, useUploadPhoto } from '../lib/checkins';
import { SectionLabel, SellPackForm, OwedRow } from '../components/moneyKit';
import { useCoachBase } from '../lib/base';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.lg, padding: '15px 17px', ...style }}>
      {children}
    </div>
  );
}

function maxWeight(b: ActualBlock): number | null {
  const ws = (b.set_actuals ?? []).map((s) => s.weight).filter((w): w is number => w != null);
  return ws.length ? Math.max(...ws) : null;
}

// ── Movers: latest vs first logged weight per exercise ────────────────
function useMovers(clientId: string | undefined) {
  const { data: logs } = useClientLogs(clientId);
  return useMemo(() => {
    // logs come newest-first; walk them so we keep the newest and the
    // oldest sighting of each exercise inside the fetched window.
    const latest = new Map<string, { name: string; w: number }>();
    const earliest = new Map<string, { w: number; date: string }>();
    for (const log of logs ?? []) {
      for (const b of log.exercises_actual ?? []) {
        const key = (b.name ?? '').trim().toLowerCase();
        const w = maxWeight(b);
        if (!key || w == null) continue;
        if (!latest.has(key)) latest.set(key, { name: b.name, w });
        earliest.set(key, { w, date: log.logged_at });
      }
    }
    const movers: { name: string; delta: number; from: number; to: number; since: string }[] = [];
    for (const [key, l] of latest) {
      const e = earliest.get(key);
      if (!e) continue;
      const delta = l.w - e.w;
      if (delta > 0) movers.push({ name: l.name, delta, from: e.w, to: l.w, since: e.date });
    }
    return { movers: movers.sort((a, b) => b.delta - a.delta).slice(0, 3), logs: logs ?? [] };
  }, [logs]);
}

// ── Progress photos — coach snaps them, side-by-side sells the work ───
function PhotosCard({ clientId }: { clientId: string }) {
  const { data: photos } = useProgressPhotos(clientId);
  const upload = useUploadPhoto();
  const list = photos ?? [];
  const latest = list[0];
  const first = list.length > 1 ? list[list.length - 1] : null;

  const frame: React.CSSProperties = {
    flex: 1, minWidth: 0, borderRadius: 13, overflow: 'hidden', background: F.cardDeep,
    border: `1px solid ${F.edge}`, aspectRatio: '3 / 4', position: 'relative',
  };
  const tag: React.CSSProperties = {
    position: 'absolute', left: 8, bottom: 8, background: 'rgba(27,23,19,0.82)', color: F.ink,
    borderRadius: 8, padding: '3px 8px', fontFamily: TYPE.display, fontWeight: 700, fontSize: 10.5,
    letterSpacing: '0.08em', textTransform: 'uppercase',
  };

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <SectionLabel>Progress photos</SectionLabel>
        <label style={{ marginLeft: 'auto', cursor: 'pointer', border: `1.5px solid ${F.edge}`, color: F.inkSoft, borderRadius: RADII.pill, padding: '7px 13px', fontWeight: 700, fontSize: 12.5, fontFamily: TYPE.body }}>
          {upload.isPending ? 'Uploading…' : '+ Add photo'}
          <input
            type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            disabled={upload.isPending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload.mutateAsync({ client_id: clientId, file: f });
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {upload.isError && <div style={{ fontSize: 13, color: F.bad }}>Upload didn't go through — try again.</div>}
      {list.length === 0 ? (
        <div style={{ fontSize: 13, color: F.mute, lineHeight: 1.5 }}>
          Snap one at the next session — in a few weeks the side-by-side does the selling for you.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 9 }}>
          {first && (
            <div style={frame}>
              <img src={first.photo_url!} alt="First progress photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span style={tag}>First · {shortDate(first.measured_at)}</span>
            </div>
          )}
          <div style={frame}>
            <img src={latest.photo_url!} alt="Latest progress photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <span style={tag}>{first ? 'Now' : 'First'} · {shortDate(latest.measured_at)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Editable about card (goals + the medical flag) ────────────────────
function AboutCard({ client }: { client: Client }) {
  const update = useUpdateClient();
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState(client.goals ?? '');
  const [medical, setMedical] = useState(client.medical_notes ?? '');

  if (!editing) {
    const empty = !client.goals && !client.medical_notes;
    return (
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SectionLabel>About</SectionLabel>
          <button onClick={() => { setGoals(client.goals ?? ''); setMedical(client.medical_notes ?? ''); setEditing(true); }} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: F.mute, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: TYPE.body, padding: '4px 6px' }}>
            Edit
          </button>
        </div>
        {empty ? (
          <div style={{ fontSize: 13, color: F.mute }}>Goal, watch-outs (“knee — avoid deep lunges”), whatever you need at a glance.</div>
        ) : (
          <>
            {client.goals && <div style={{ fontSize: 14, lineHeight: 1.5 }}>{client.goals}</div>}
            {client.medical_notes && (
              <div style={{ fontSize: 13, color: F.warnSoftInk, background: F.warnSoft, borderRadius: 10, padding: '7px 11px', lineHeight: 1.45 }}>
                {client.medical_notes}
              </div>
            )}
          </>
        )}
      </Card>
    );
  }

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <SectionLabel>About</SectionLabel>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 11, color: F.mute, fontWeight: 600 }}>goal</span>
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2} placeholder="Fat loss · wedding Sep 14"
          style={{ background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: 11, color: F.ink, padding: '9px 12px', fontSize: 14, fontFamily: TYPE.body, outline: 'none', resize: 'vertical' }} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 11, color: F.mute, fontWeight: 600 }}>watch-outs</span>
        <textarea value={medical} onChange={(e) => setMedical(e.target.value)} rows={2} placeholder="Knee — avoid deep lunges"
          style={{ background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: 11, color: F.ink, padding: '9px 12px', fontSize: 14, fontFamily: TYPE.body, outline: 'none', resize: 'vertical' }} />
      </label>
      {update.isError && <div style={{ fontSize: 13, color: F.bad }}>Couldn't save — try again.</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setEditing(false)} style={{ flex: 1, height: 42, borderRadius: 12, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: TYPE.body }}>Cancel</button>
        <button
          disabled={update.isPending}
          onClick={() => {
            void update.mutateAsync({ id: client.id, patch: { goals: goals.trim() || null, medical_notes: medical.trim() || null } }).then(() => setEditing(false));
          }}
          style={{ flex: 1.4, height: 42, borderRadius: 12, border: 'none', background: F.ink, color: F.bg, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: TYPE.body, opacity: update.isPending ? 0.6 : 1 }}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export function ClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const base = useCoachBase();

  const { data: clients, isLoading } = useCoachClients();
  const client = useMemo(() => (clients ?? []).find((c) => c.id === clientId), [clients, clientId]);
  const { data: trainer } = useTrainerProfile();

  const { movers, logs } = useMovers(clientId);
  const { data: checkinEntries } = useClientEntries(clientId);
  // Weight trend from check-in weigh-ins: latest vs first on record.
  const weightTrend = useMemo(() => {
    const ws = (checkinEntries ?? []).filter((e) => e.metric_type === 'weight' && e.metric_value != null);
    if (ws.length < 2) return null;
    const to = Number(ws[0].metric_value);
    const from = Number(ws[ws.length - 1].metric_value);
    if (from === to) return null;
    return { from, to, delta: Math.round((to - from) * 10) / 10, since: ws[ws.length - 1].measured_at };
  }, [checkinEntries]);
  const { data: owedAll } = useOwedSessions();
  const owed = useMemo(() => (owedAll ?? []).filter((s) => s.client_id === clientId), [owedAll, clientId]);
  const owedTotal = owed.reduce((s, o) => s + Number(o.price ?? 0), 0);
  const { data: payments } = useClientPayments(clientId);

  const [selling, setSelling] = useState(false);

  if (isLoading) return <div style={{ color: F.mute, padding: 30, textAlign: 'center' }}>Loading…</div>;
  if (!client) {
    return (
      <div style={{ color: F.mute, padding: 30, textAlign: 'center' }}>
        Client not found. <button onClick={() => navigate(`${base}/clients`)} style={{ border: 'none', background: 'transparent', color: F.accent, fontWeight: 700, cursor: 'pointer', fontFamily: TYPE.body, fontSize: 14 }}>Back to clients</button>
      </div>
    );
  }

  const bal = client.package_balance ?? 0;
  const low = bal > 0 && bal <= 2;
  const lastPack = (payments ?? []).find((p) => p.payment_type === 'package');
  const packSize = lastPack?.sessions_covered ?? null;
  const coachName = trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'your coach';
  const msgHref = client.phone ? `sms:${client.phone}` : client.email ? `mailto:${client.email}` : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(`${base}/clients`)} aria-label="Back" style={{ width: HIT, height: HIT, borderRadius: 13, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontSize: 19, cursor: 'pointer', flexShrink: 0 }}>
          ←
        </button>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: F.edge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {initialsOf(client.full_name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 25, textTransform: 'uppercase', lineHeight: 1.1 }}>{client.full_name}</div>
          <div style={{ fontSize: 12.5, color: F.mute, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.status === 'paused' ? 'paused · ' : ''}{client.phone || client.email || `since ${shortDate(client.created_at)}`}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 9 }}>
        <button
          onClick={() => navigate(`${base}/live/${client.id}`)}
          style={{ flex: 1.4, height: HIT, borderRadius: 13, border: 'none', cursor: 'pointer', background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 14, fontFamily: TYPE.body }}
        >
          Start a session
        </button>
        {msgHref && (
          <a href={msgHref} style={{ flex: 1, height: HIT, borderRadius: 13, border: `1.5px solid ${F.edge}`, color: F.inkSoft, fontWeight: 700, fontSize: 14, fontFamily: TYPE.body, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Message
          </a>
        )}
      </div>

      {/* Pack */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 10, borderColor: low ? '#6b5222' : F.edge }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <SectionLabel>Session pack</SectionLabel>
            <div style={{ ...num, fontWeight: 800, fontSize: 24, marginTop: 2 }}>
              {bal > 0 ? (
                <>
                  {bal} left{packSize ? <span style={{ color: F.mute, fontWeight: 600, fontSize: 15 }}> of {packSize}</span> : null}
                </>
              ) : (
                <span style={{ fontSize: 16, color: F.mute, fontWeight: 600 }}>No pack — paying per session</span>
              )}
            </div>
            {low && <div style={{ fontSize: 12.5, color: F.warnSoftInk, fontWeight: 700 }}>Running low — sell the renewal at the next session.</div>}
          </div>
          {!selling && (
            <button
              onClick={() => setSelling(true)}
              style={{ marginLeft: 'auto', flexShrink: 0, height: 40, padding: '0 16px', borderRadius: RADII.pill, border: 'none', cursor: 'pointer', background: low ? F.accent : F.edgeSoft, color: low ? F.accentInk : F.inkSoft, fontWeight: 800, fontSize: 13, fontFamily: TYPE.body }}
            >
              Sell pack
            </button>
          )}
        </div>
        {selling && <SellPackForm client={client} trainer={trainer} onDone={() => setSelling(false)} />}
      </Card>

      {/* Owes */}
      {owed.length > 0 && (
        <Card style={{ borderColor: F.badEdge, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SectionLabel>Owes you</SectionLabel>
            <span style={{ ...num, marginLeft: 'auto', fontWeight: 800, fontSize: 17, color: F.bad }}>{formatMoney(owedTotal)}</span>
          </div>
          {owed.map((s) => <OwedRow key={s.id} s={s} />)}
          {(() => {
            const href = nudgeHref(client, formatMoney(owedTotal), coachName);
            return href ? (
              <a href={href} style={{ alignSelf: 'flex-start', textDecoration: 'none', border: `1.5px solid ${F.edge}`, color: F.inkSoft, borderRadius: RADII.pill, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, fontFamily: TYPE.body }}>
                Send a polite nudge →
              </a>
            ) : null;
          })()}
        </Card>
      )}

      {/* Progress — undeniable */}
      {(movers.length > 0 || weightTrend) && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <SectionLabel>Progress</SectionLabel>
          {weightTrend && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1, minWidth: 0 }}>Weight</span>
              <span style={{ ...num, fontSize: 13, color: F.mute }}>{weightTrend.from} → {weightTrend.to} lb</span>
              <span style={{ ...num, fontWeight: 800, fontSize: 15, color: F.good }}>
                {weightTrend.delta > 0 ? '+' : ''}{weightTrend.delta} lb
              </span>
            </div>
          )}
          {movers.map((m) => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5, flex: 1, minWidth: 0 }}>{m.name}</span>
              <span style={{ ...num, fontSize: 13, color: F.mute }}>{m.from} → {m.to} lb</span>
              <span style={{ ...num, fontWeight: 800, fontSize: 15, color: F.good }}>+{Math.round(m.delta * 10) / 10} lb</span>
            </div>
          ))}
          {movers.length > 0 && (
            <div style={{ fontSize: 11.5, color: F.mute }}>
              since {shortDate(movers.map((m) => m.since).sort()[0])} — straight from the logbook
            </div>
          )}
        </Card>
      )}

      <PhotosCard clientId={client.id} />

      <AboutCard client={client} />

      {/* Session history */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SectionLabel>Sessions</SectionLabel>
        {logs.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '26px 18px' }}>
            <div style={{ fontSize: 13.5, color: F.mute }}>Nothing logged yet — the first session lands here.</div>
          </Card>
        ) : (
          logs.slice(0, 8).map((log) => (
            <Card key={log.id} style={{ padding: '12px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 14 }}>{shortDate(log.logged_at)}</span>
                <span style={{ fontSize: 11.5, color: F.mute }}>
                  {(() => {
                    const n = (log.exercises_actual ?? []).filter((b) => (b.set_actuals ?? []).length > 0).length;
                    return `${n} exercise${n === 1 ? '' : 's'}`;
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                {(log.exercises_actual ?? [])
                  .filter((b) => (b.set_actuals ?? []).length > 0)
                  .slice(0, 5)
                  .map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
                      <span style={{ fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>
                      <span style={{ ...num, color: F.inkSoft }}>{summarizeActual(b)}</span>
                    </div>
                  ))}
              </div>
              {log.notes ? <div style={{ fontSize: 12.5, color: F.mute, marginTop: 6, fontStyle: 'italic' }}>&ldquo;{log.notes}&rdquo;</div> : null}
            </Card>
          ))
        )}
      </div>

      {/* Money ledger */}
      {(payments ?? []).length > 0 && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SectionLabel>Payments</SectionLabel>
          {(payments ?? []).slice(0, 10).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              <span style={{ fontWeight: 600 }}>{p.description || (p.payment_type === 'package' ? `${p.sessions_covered}-pack` : p.payment_type)}</span>
              <span style={{ fontSize: 12, color: F.mute }}>{shortDate(p.paid_at)}</span>
              <span style={{ ...num, marginLeft: 'auto', fontWeight: 800, color: F.good }}>{formatMoney(Number(p.amount))}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
