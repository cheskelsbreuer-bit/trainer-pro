// The family portal — what a PARENT sees. Their kids, the family
// balance, payment history, and "my kid is out today." Warm, simple,
// phone-first. Standalone page (no sitter shell, no edit mode).

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import type { Client, Payment } from '../../lib/database.types';
import {
  B,
  readParent,
  readBalance,
  readDays,
  DAY_SHORT,
  formatMoney,
  shortDate,
  ageOf,
} from '../theme';
import { Card, Chip, Btn, Avatar, Field, inputStyle } from '../components/ui';
import { ChatThread } from '../components/ChatThread';
import {
  useChatMessages,
  useSendChat,
  useMarkThreadRead,
  threadAnchor,
  unreadByClient,
} from '../lib/chat';

export interface PortalTrainer {
  full_name: string | null;
  business_name: string | null;
  primary_color: string | null;
  logo_url: string | null;
  template_slugs: string[] | null;
}

export function FamilyPortal({
  kids,
  trainer,
  refetchKids,
}: {
  kids: Client[];
  trainer: PortalTrainer | null;
  refetchKids: () => void;
}) {
  const [absenceKid, setAbsenceKid] = useState<Client | null>(null);
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [absenceNote, setAbsenceNote] = useState('');
  const [absenceState, setAbsenceState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [linked, setLinked] = useState(false);
  // Quick pay — one tap opens Stripe Checkout (card or bank/ACH), or the
  // sitter's own payment link when Stripe isn't connected.
  const [payBusy, setPayBusy] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [payReturn] = useState(() => new URLSearchParams(window.location.search).get('payment'));

  // One-time on load: ask the server to link any sibling rows the invite
  // didn't cover. Idempotent and silent.
  useEffect(() => {
    if (linked) return;
    setLinked(true);
    void api<{ linked: number }>('/portal/link-family', { method: 'POST' })
      .then((r) => {
        if (r.linked > 0) refetchKids();
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => kids.filter((k) => k.status !== 'archived'), [kids]);
  const balance = useMemo(
    () => Math.round(active.reduce((s, k) => s + readBalance(k), 0) * 100) / 100,
    [active],
  );
  const parentName = useMemo(() => {
    const withParent = active.find((k) => readParent(k));
    return withParent ? readParent(withParent) : '';
  }, [active]);

  const announcements = useQuery({
    queryKey: ['portal-announcements', active.map((k) => k.id).join(',')],
    queryFn: async (): Promise<Array<{ id: string; body: string; created_at: string }>> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, created_at')
        .in('client_id', active.map((k) => k.id))
        .eq('sender', 'trainer')
        .contains('attachments', [{ kind: 'announcement' }])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const seen = new Set<string>();
      const out: Array<{ id: string; body: string; created_at: string }> = [];
      for (const m of (data ?? []) as Array<{ id: string; body: string; created_at: string }>) {
        if (seen.has(m.body)) continue;
        seen.add(m.body);
        out.push(m);
        if (out.length >= 3) break;
      }
      return out;
    },
    enabled: active.length > 0,
  });

  // ── Chat with the sitter ────────────────────────────────────────
  // Every message for this family hangs off one anchor kid, so siblings
  // share a single conversation.
  const chat = useChatMessages();
  const sendChat = useSendChat();
  const markRead = useMarkThreadRead();
  const [chatOpen, setChatOpen] = useState(false);

  const chatAnchor = useMemo(() => (active.length ? threadAnchor(active) : null), [active]);
  const chatMessages = useMemo(() => {
    const mine = new Set(active.map((k) => k.id));
    return (chat.data ?? []).filter((m) => mine.has(m.client_id));
  }, [chat.data, active]);
  const chatUnread = useMemo(() => {
    const byClient = unreadByClient(chat.data, 'trainer');
    return active.reduce((s, k) => s + (byClient.get(k.id) ?? 0), 0);
  }, [chat.data, active]);

  // Reading the thread clears the badge.
  useEffect(() => {
    if (!chatOpen || !chatUnread) return;
    markRead.mutate({ clientIds: active.map((k) => k.id), from: 'trainer' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatUnread]);

  const payments = useQuery({
    queryKey: ['portal-family-payments', active.map((k) => k.id).join(',')],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('client_id', active.map((k) => k.id))
        .order('paid_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
    enabled: active.length > 0,
  });

  const totalPaid = useMemo(
    () => Math.round((payments.data ?? []).reduce((s, p) => s + Math.max(0, Number(p.amount)), 0) * 100) / 100,
    [payments.data],
  );

  const sitterName = trainer?.business_name || trainer?.full_name || 'Your babysitter';
  const kidName = (id: string) => active.find((k) => k.id === id)?.full_name.split(' ')[0] ?? '';

  async function submitAbsence() {
    if (!absenceKid) return;
    setAbsenceState('busy');
    try {
      await api('/portal/report-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: absenceKid.id, date: absenceDate, note: absenceNote.trim() }),
      });
      setAbsenceState('done');
      setTimeout(() => {
        setAbsenceKid(null);
        setAbsenceState('idle');
        setAbsenceNote('');
      }, 1600);
    } catch {
      setAbsenceState('error');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: B.bg, fontFamily: B.fontBody, color: B.ink, padding: '0 16px 60px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ padding: '28px 4px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              background: B.primarySoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            🧸
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, fontSize: '1.15rem', lineHeight: 1.15 }}>
              {parentName ? `Hi, ${parentName}!` : 'Welcome!'}
            </div>
            <div style={{ fontSize: '0.78rem', color: B.mute, fontWeight: 700 }}>with {sitterName}</div>
          </div>
          <button
            onClick={() => void supabase.auth.signOut()}
            style={{
              border: `1.5px solid ${B.rule}`,
              background: 'transparent',
              color: B.mute,
              cursor: 'pointer',
              borderRadius: B.pill,
              padding: '6px 12px',
              fontSize: '0.74rem',
              fontWeight: 800,
            }}
          >
            Sign out
          </button>
        </header>

        <div style={{ display: 'grid', gap: 14 }}>
          {/* Announcements from the sitter */}
          {(announcements.data?.length ?? 0) > 0 && (
            <Card style={{ background: B.butterSoft, border: 'none' }}>
              <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, marginBottom: 8 }}>📣 From {sitterName}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {(announcements.data ?? []).map((a) => (
                  <div key={a.id} style={{ fontSize: '0.88rem' }}>
                    {a.body}
                    <span style={{ color: B.mute, fontSize: '0.72rem', marginLeft: 8 }}>{shortDate(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Chat with the sitter */}
          {chatAnchor && (
            <Card>
              <button
                type="button"
                onClick={() => setChatOpen((o) => !o)}
                aria-expanded={chatOpen}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: B.fontDisplay, fontWeight: 800, flex: 1 }}>
                  💬 Message {sitterName}
                </span>
                {chatUnread > 0 && (
                  <span
                    style={{
                      background: B.red,
                      color: '#fff',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 9px',
                    }}
                  >
                    {chatUnread} new
                  </span>
                )}
                <span
                  style={{
                    color: B.mute,
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    transform: chatOpen ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}
                >
                  ▸
                </span>
              </button>
              {!chatOpen && (
                <div style={{ fontSize: '0.82rem', color: B.mute, marginTop: 6 }}>
                  {chatMessages.length
                    ? chatMessages[chatMessages.length - 1].body.slice(0, 90)
                    : 'Questions about pickup, a late day, anything — write here.'}
                </div>
              )}
              {chatOpen && (
                <div style={{ marginTop: 12 }}>
                  <ChatThread
                    messages={chatMessages}
                    me="client"
                    otherName={sitterName}
                    height={340}
                    sending={sendChat.isPending}
                    onSend={(body) =>
                      sendChat.mutate({
                        clientId: chatAnchor.id,
                        trainerId: chatAnchor.trainer_id,
                        sender: 'client',
                        body,
                      })
                    }
                  />
                  {sendChat.isError && (
                    <Chip tone="red" style={{ marginTop: 10 }}>
                      Could not send — check your connection and try again.
                    </Chip>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Balance hero */}
          <Card
            style={{
              background: balance > 0.005 ? B.redSoft : B.greenSoft,
              border: 'none',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: balance > 0.005 ? B.red : B.green }}>
              {balance > 0.005 ? 'Your balance' : balance < -0.005 ? 'Your credit' : 'Your balance'}
            </div>
            <div
              style={{
                fontFamily: B.fontDisplay,
                fontWeight: 800,
                fontSize: '2.4rem',
                color: balance > 0.005 ? B.red : B.green,
                lineHeight: 1.2,
              }}
            >
              {balance < -0.005 ? formatMoney(-balance) : formatMoney(Math.max(0, balance))}
            </div>
            <div style={{ fontSize: '0.82rem', color: B.inkSoft, marginTop: 4 }}>
              {balance > 0.005
                ? `Owed to ${sitterName}`
                : balance < -0.005
                  ? 'Credit on your account — it counts toward the next bill.'
                  : "You're all paid up. Thank you! 💛"}
            </div>
            {balance > 0.005 && (
              <div style={{ marginTop: 14 }}>
                <Btn
                  size="lg"
                  onClick={async () => {
                    setPayBusy(true);
                    setPayErr('');
                    try {
                      const res = await api<{ url: string; external: boolean }>('/portal/pay', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                      });
                      if (res.external) window.open(res.url, '_blank', 'noopener');
                      else window.location.href = res.url;
                    } catch (e) {
                      setPayErr(e instanceof Error ? e.message.replace(/^\d+:\s*/, '') : 'Could not start the payment.');
                    } finally {
                      setPayBusy(false);
                    }
                  }}
                  disabled={payBusy}
                >
                  {payBusy ? 'One moment…' : `💳 Pay ${formatMoney(balance)} now`}
                </Btn>
                <div style={{ fontSize: '0.72rem', color: B.mute, marginTop: 6 }}>
                  Pay by card — takes under a minute.
                </div>
                {payErr && (
                  <div style={{ fontSize: '0.8rem', color: B.red, fontWeight: 700, marginTop: 8 }}>{payErr}</div>
                )}
              </div>
            )}
            {payReturn === 'success' && (
              <div
                style={{
                  marginTop: 12,
                  background: B.greenSoft,
                  color: B.green,
                  borderRadius: B.radiusSm,
                  padding: '9px 13px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                }}
              >
                ✓ Payment sent! It shows up on your balance in a minute.
              </div>
            )}
            {payReturn === 'cancel' && (
              <div style={{ marginTop: 12, fontSize: '0.8rem', color: B.mute }}>
                Payment cancelled — nothing was charged.
              </div>
            )}
            <div style={{ fontSize: '0.74rem', color: B.mute, marginTop: 8 }}>
              Lifetime paid: {formatMoney(totalPaid)}
            </div>
          </Card>

          {/* Kids */}
          <Card>
            <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, marginBottom: 12 }}>Your kids</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {active.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Avatar name={k.full_name} size={38} />
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.94rem' }}>
                      {k.full_name}
                      {ageOf(k.date_of_birth) && (
                        <span style={{ color: B.mute, fontWeight: 700, marginLeft: 7, fontSize: '0.76rem' }}>
                          {ageOf(k.date_of_birth)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                      {readDays(k).map((d) => (
                        <Chip key={d} tone="accent">{DAY_SHORT[d]}</Chip>
                      ))}
                      {k.status === 'paused' && <Chip tone="plum">Away</Chip>}
                    </div>
                  </div>
                  <Btn size="sm" kind="ghost" onClick={() => { setAbsenceKid(k); setAbsenceState('idle'); }}>
                    🙋 Out today?
                  </Btn>
                </div>
              ))}
            </div>
          </Card>

          {/* Absence form */}
          {absenceKid && (
            <Card style={{ border: `2px solid ${B.accent}` }}>
              <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, marginBottom: 10 }}>
                {absenceKid.full_name.split(' ')[0]} will be out
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <Field label="Which day">
                  <input style={inputStyle} type="date" value={absenceDate} onChange={(e) => setAbsenceDate(e.target.value)} />
                </Field>
                <Field label="Note (optional)">
                  <input style={inputStyle} value={absenceNote} onChange={(e) => setAbsenceNote(e.target.value)} placeholder="e.g. doctor appointment" />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Btn kind="accent" onClick={() => void submitAbsence()} disabled={absenceState === 'busy'}>
                  {absenceState === 'busy' ? 'Sending…' : 'Let the sitter know'}
                </Btn>
                <Btn kind="ghost" onClick={() => setAbsenceKid(null)}>Cancel</Btn>
                {absenceState === 'done' && <Chip tone="green">✓ Sent — she'll see it on her dashboard</Chip>}
                {absenceState === 'error' && <Chip tone="red">Couldn't send — try again</Chip>}
              </div>
            </Card>
          )}

          {/* Payment history */}
          <Card>
            <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, marginBottom: 12 }}>Payment history</div>
            {payments.data?.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {payments.data.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem' }}>
                    <span style={{ fontWeight: 700, flex: 1 }}>
                      {kidName(p.client_id)}
                      {p.description && p.description !== 'Babysitting payment' && (
                        <span style={{ color: B.mute, fontWeight: 600 }}> · {p.description}</span>
                      )}
                    </span>
                    <span style={{ color: B.mute, fontSize: '0.76rem' }}>{shortDate(p.paid_at)}</span>
                    <Chip tone={Number(p.amount) >= 0 ? 'green' : 'red'}>{formatMoney(Number(p.amount))}</Chip>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: B.mute, fontSize: '0.85rem' }}>No payments recorded yet.</div>
            )}
          </Card>

          <div style={{ textAlign: 'center', color: B.mute, fontSize: '0.72rem', paddingTop: 8 }}>
            Questions about your balance? Ask {sitterName} directly.
          </div>
        </div>
      </div>
    </div>
  );
}
