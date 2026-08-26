// ── Money — packs, owed, and the ledger ──────────────────────────────
//
// The sketch's promise: the system is the bad guy. Finished sessions
// that weren't covered show up as "owes you" with a one-tap polite
// nudge (prefilled text/email — the coach never writes the awkward
// message). Packs live here too: sell one in three taps, watch it burn
// down as sessions complete, get flagged at 2 left.

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client, Trainer } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, formatMoney, initialsOf, shortDate } from '../theme';
import { useCoachClients, useMonthPayments } from '../lib/roster';
import { useOwedSessions, nudgeHref, type OwedSession } from '../lib/money';
import { SectionLabel, SellPackForm, OwedRow } from '../components/moneyKit';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

// ── Page ──────────────────────────────────────────────────────────────
export function MoneyPage() {
  const { user } = useAuth();
  const { data: trainer } = useQuery({
    queryKey: ['trainer', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('trainers').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as Trainer;
    },
    enabled: !!user,
  });

  const { data: payments, isLoading: paymentsLoading } = useMonthPayments();
  const { data: owed, isLoading: owedLoading } = useOwedSessions();
  const { data: clients } = useCoachClients();
  const [selling, setSelling] = useState<string | null>(null);

  const collected = useMemo(
    () => Math.round(((payments ?? []).reduce((s, p) => s + Number(p.amount), 0)) * 100) / 100,
    [payments],
  );
  const outstanding = useMemo(
    () => Math.round(((owed ?? []).reduce((s, o) => s + Number(o.price ?? 0), 0)) * 100) / 100,
    [owed],
  );

  // Owed sessions grouped per client, biggest debt first.
  const owedByClient = useMemo(() => {
    const m = new Map<string, { client: Client; rows: OwedSession[]; total: number }>();
    for (const s of owed ?? []) {
      if (!s.clients) continue;
      const g = m.get(s.clients.id) ?? { client: s.clients, rows: [], total: 0 };
      g.rows.push(s);
      g.total += Number(s.price ?? 0);
      m.set(s.clients.id, g);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [owed]);

  const active = useMemo(() => (clients ?? []).filter((c) => c.status === 'active'), [clients]);
  // Packs: low-but-live first, then healthy, then no-pack clients.
  const packRows = useMemo(() => {
    const rank = (c: Client) => {
      const b = c.package_balance ?? 0;
      if (b > 0 && b <= 2) return 0;
      if (b > 2) return 1;
      return 2;
    };
    return [...active].sort((a, b) => rank(a) - rank(b) || a.full_name.localeCompare(b.full_name));
  }, [active]);

  const month = new Date().toLocaleDateString('en-US', { month: 'long' });
  const coachName = trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'your coach';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <SectionLabel>{month}</SectionLabel>
        <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 30, textTransform: 'uppercase', lineHeight: 1.1 }}>Money</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.lg, padding: '14px 16px' }}>
          <div style={{ ...num, fontWeight: 800, fontSize: 25, color: F.good }}>{paymentsLoading ? '—' : formatMoney(collected)}</div>
          <div style={{ fontSize: 11.5, color: F.mute, fontWeight: 600 }}>collected this month</div>
        </div>
        <div style={{ background: F.card, border: `1px solid ${outstanding > 0 ? F.badEdge : F.edge}`, borderRadius: RADII.lg, padding: '14px 16px' }}>
          <div style={{ ...num, fontWeight: 800, fontSize: 25, color: outstanding > 0 ? F.bad : F.ink }}>{owedLoading ? '—' : formatMoney(outstanding)}</div>
          <div style={{ fontSize: 11.5, color: F.mute, fontWeight: 600 }}>outstanding</div>
        </div>
      </div>

      {/* Owes you */}
      {owedByClient.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <SectionLabel>Owes you</SectionLabel>
          {owedByClient.map(({ client, rows, total }) => {
            const href = nudgeHref(client, formatMoney(total), coachName);
            return (
              <div key={client.id} style={{ background: F.card, border: `1px solid ${F.badEdge}`, borderRadius: RADII.md, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: F.badSoft, color: F.bad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {initialsOf(client.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>{client.full_name}</div>
                    <div style={{ fontSize: 12, color: F.mute }}>{rows.length} unpaid session{rows.length === 1 ? '' : 's'}</div>
                  </div>
                  <span style={{ ...num, fontWeight: 800, fontSize: 17, color: F.bad }}>{formatMoney(total)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${F.edgeSoft}`, paddingTop: 8 }}>
                  {rows.map((s) => <OwedRow key={s.id} s={s} />)}
                </div>
                {href && (
                  <a
                    href={href}
                    style={{ alignSelf: 'flex-start', textDecoration: 'none', border: `1.5px solid ${F.edge}`, color: F.inkSoft, borderRadius: RADII.pill, padding: '8px 14px', fontWeight: 700, fontSize: 12.5, fontFamily: TYPE.body }}
                  >
                    Send a polite nudge →
                  </a>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: F.mute, lineHeight: 1.5 }}>
            The nudge is prewritten and polite, in your name — you never type the awkward text.
          </div>
        </div>
      )}

      {/* Packs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SectionLabel>Session packs</SectionLabel>
        {active.length === 0 ? (
          <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '22px 18px', textAlign: 'center', color: F.mute, fontSize: 13.5 }}>
            Add clients first — packs live on each client.
          </div>
        ) : (
          packRows.map((c) => {
            const bal = c.package_balance ?? 0;
            const low = bal > 0 && bal <= 2;
            return (
              <div key={c.id} style={{ background: F.card, border: `1px solid ${low ? '#6b5222' : F.edge}`, borderRadius: RADII.md, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: F.edge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {initialsOf(c.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.full_name}</div>
                  {bal > 0 ? (
                    <span style={{ ...num, borderRadius: RADII.pill, padding: '6px 12px', fontWeight: 800, fontSize: 12.5, background: low ? F.warnSoft : F.goodSoft, color: low ? F.warnSoftInk : F.goodSoftInk }}>
                      {bal} left
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: F.mute }}>no pack</span>
                  )}
                  {selling !== c.id && (
                    <button
                      onClick={() => setSelling(c.id)}
                      style={{ border: 'none', cursor: 'pointer', borderRadius: RADII.pill, padding: '8px 13px', background: low ? F.accent : F.edgeSoft, color: low ? F.accentInk : F.inkSoft, fontWeight: 800, fontSize: 12.5, fontFamily: TYPE.body, minHeight: 36 }}
                    >
                      {bal > 0 ? 'Sell pack' : '+ Pack'}
                    </button>
                  )}
                </div>
                {selling === c.id && <SellPackForm client={c} trainer={trainer} onDone={() => setSelling(null)} />}
              </div>
            );
          })
        )}
        <div style={{ fontSize: 12, color: F.mute, lineHeight: 1.5 }}>
          Finishing a session burns one off the pack automatically. At 2 left, the renew flag comes on.
        </div>
      </div>

      {/* Recent */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SectionLabel>Recent</SectionLabel>
        {paymentsLoading ? (
          <div style={{ color: F.mute, fontSize: 14 }}>Loading…</div>
        ) : (payments ?? []).length === 0 ? (
          <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '24px 18px', textAlign: 'center', color: F.mute, fontSize: 13.5 }}>
            No payments recorded this month yet.
          </div>
        ) : (
          <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {(payments ?? []).slice(0, 14).map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <span style={{ fontWeight: 700 }}>{p.clients?.full_name ?? '—'}</span>
                <span style={{ fontSize: 12, color: F.mute }}>
                  {p.description || (p.payment_type === 'package' ? `${p.sessions_covered}-pack` : p.payment_type)} · {shortDate(p.paid_at)}
                </span>
                <span style={{ ...num, marginLeft: 'auto', fontWeight: 800, color: F.good }}>{formatMoney(Number(p.amount))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
