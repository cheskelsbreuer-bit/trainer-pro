// ── Check-ins — the Sunday review ────────────────────────────────────
//
// Clients fill a 60-second form on their phone; it lands here. The
// coach reviews the week in one sitting: weight with its delta, energy,
// the client's own words, then a reply that shows up in their app.
// "Waiting" = submitted, not yet replied to. Newest first.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, initialsOf, shortDate, timeOf } from '../theme';
import { useCoachClients } from '../lib/roster';
import { useCheckinEntries, bundleEntries, useTrainerReplies, useSendReply } from '../lib/checkins';
import { useAuth } from '../../hooks/useAuth';
import { useCoachBase } from '../lib/base';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

function EnergyDots({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i <= n ? F.accent : F.edgeSoft }}></span>
      ))}
    </span>
  );
}

function ReplyBox({ client, onSent }: { client: Client; onSent: () => void }) {
  const { user } = useAuth();
  const send = useSendReply();
  const [body, setBody] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={`Reply to ${client.full_name.split(' ')[0]} — lands in their app`}
        style={{ background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: 12, color: F.ink, padding: '10px 13px', fontSize: 14, fontFamily: TYPE.body, outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
      />
      {send.isError && <div style={{ fontSize: 13, color: F.bad }}>Couldn't send — try again.</div>}
      <button
        disabled={!body.trim() || send.isPending}
        onClick={() => {
          if (!user) return;
          void send.mutateAsync({ trainer_id: user.id, client_id: client.id, body: body.trim() }).then(() => { setBody(''); onSent(); });
        }}
        style={{ alignSelf: 'flex-end', height: 40, padding: '0 18px', borderRadius: RADII.pill, border: 'none', cursor: 'pointer', background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 13.5, fontFamily: TYPE.body, opacity: !body.trim() || send.isPending ? 0.5 : 1 }}
      >
        {send.isPending ? 'Sending…' : 'Send reply'}
      </button>
    </div>
  );
}

export function CheckinsPage() {
  const navigate = useNavigate();
  const base = useCoachBase();
  const { data: clients } = useCoachClients();
  const { data: entries, isLoading } = useCheckinEntries();
  const { data: replies } = useTrainerReplies();
  const [openReply, setOpenReply] = useState<string | null>(null);

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients ?? []) m.set(c.id, c);
    return m;
  }, [clients]);

  // Bundles fenced to the coach roster, with per-client previous weight
  // for the delta and a replied/waiting verdict from the messages log.
  const bundles = useMemo(() => {
    const all = bundleEntries(entries ?? []).filter((b) => clientById.has(b.client_id));
    return all.map((b) => {
      const prev = all.find((x) => x.client_id === b.client_id && x.measured_at < b.measured_at && x.weight != null);
      const replied = (replies ?? []).some((m) => m.client_id === b.client_id && m.created_at > b.measured_at);
      // Only fresh check-ins wait for a reply — an old unanswered
      // weigh-in shouldn't clog the queue forever.
      const fresh = Date.now() - new Date(b.measured_at).getTime() < 10 * 86400000;
      return { ...b, prevWeight: prev?.weight ?? null, replied, waiting: !replied && fresh };
    });
  }, [entries, clientById, replies]);

  const waiting = bundles.filter((b) => b.waiting).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
          {waiting > 0 ? `${waiting} waiting · ~2 min each` : 'All caught up'}
        </div>
        <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 30, textTransform: 'uppercase', lineHeight: 1.1 }}>Check-ins</div>
      </div>

      {isLoading ? (
        <div style={{ color: F.mute, fontSize: 14 }}>Loading…</div>
      ) : bundles.length === 0 ? (
        <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.lg, padding: '34px 22px', textAlign: 'center' }}>
          <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 19, textTransform: 'uppercase' }}>No check-ins yet</div>
          <div style={{ fontSize: 13.5, color: F.mute, marginTop: 8, lineHeight: 1.6 }}>
            Your clients have a 60-second weekly form in their app — weight, energy, and a line about the week.
            When they send it, it lands here and you review the whole week in one sitting.
          </div>
        </div>
      ) : (
        bundles.map((b) => {
          const c = clientById.get(b.client_id)!;
          const key = `${b.client_id}|${b.measured_at}`;
          const delta = b.weight != null && b.prevWeight != null ? Math.round((b.weight - b.prevWeight) * 10) / 10 : null;
          return (
            <div key={key} style={{ background: F.card, border: `1px solid ${b.waiting ? '#6b5222' : F.edge}`, borderRadius: RADII.lg, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => navigate(`${base}/clients/${c.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: F.ink, fontFamily: TYPE.body, textAlign: 'left', minWidth: 0, flex: 1 }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: F.edge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {initialsOf(c.full_name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>{c.full_name}</div>
                    <div style={{ fontSize: 11.5, color: F.mute }}>{shortDate(b.measured_at)} · {timeOf(b.measured_at)}</div>
                  </div>
                </button>
                {b.replied ? (
                  <span style={{ borderRadius: RADII.pill, padding: '6px 12px', fontWeight: 700, fontSize: 11.5, background: F.goodSoft, color: F.goodSoftInk }}>replied</span>
                ) : b.waiting ? (
                  <span style={{ borderRadius: RADII.pill, padding: '6px 12px', fontWeight: 700, fontSize: 11.5, background: F.warnSoft, color: F.warnSoftInk }}>waiting</span>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {b.weight != null && (
                  <div>
                    <span style={{ ...num, fontWeight: 800, fontSize: 18 }}>{b.weight} lb</span>
                    {delta != null && (
                      <span style={{ ...num, fontWeight: 700, fontSize: 13, marginLeft: 7, color: delta <= 0 ? F.good : F.warnSoftInk }}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                )}
                {b.energy != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 11.5, color: F.mute, fontWeight: 600 }}>energy</span>
                    <EnergyDots n={b.energy} />
                  </div>
                )}
              </div>

              {b.note && (
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: F.inkSoft, fontStyle: 'italic', borderLeft: `3px solid ${F.edge}`, paddingLeft: 11 }}>
                  &ldquo;{b.note}&rdquo;
                </div>
              )}

              {openReply === key ? (
                <ReplyBox client={c} onSent={() => setOpenReply(null)} />
              ) : (
                !b.replied && (
                  <button
                    onClick={() => setOpenReply(key)}
                    style={{ alignSelf: 'flex-start', minHeight: HIT - 6, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, borderRadius: RADII.pill, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: TYPE.body }}
                  >
                    Reply
                  </button>
                )
              )}
            </div>
          );
        })
      )}

      <div style={{ fontSize: 12, color: F.mute, lineHeight: 1.5 }}>
        Replies land in the client&rsquo;s app. A check-in stays flagged until you&rsquo;ve answered it.
      </div>
    </div>
  );
}
