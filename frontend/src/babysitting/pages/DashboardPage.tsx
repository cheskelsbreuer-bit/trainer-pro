// Home — "your day at a glance". Today's kids, the money picture,
// who-owes with one-tap text/email reminders, birthdays, recent payments.

import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client } from '../../lib/database.types';
import {
  B,
  readBalance,
  readFamilySlug,
  readParent,
  readStartDate,
  familyLabel,
  scheduledToday,
  daysLabel,
  formatMoney,
  shortDate,
  ageOf,
  DAY_LABELS,
  ALL_DAYS,
} from '../theme';
import { useKids, usePayments } from '../lib/data';
import { api } from '../../lib/api';
import {
  useBabysittingConfig,
  appendLog,
  attendanceFor,
  markJoinHandled,
  setAttendance,
  setAttendanceMany,
} from '../lib/config';
import { useWords } from '../lib/words';
import { useChatMessages, unreadByClient } from '../lib/chat';
import { useDemo } from '../demo/flag';
import { fillTemplate, familySummary, smsLink, mailtoLink } from '../lib/messages';
import {
  Card,
  SectionTitle,
  StatTile,
  EmptyState,
  Btn,
  Chip,
  Avatar,
  TableWrap,
  Th,
  Td,
  LinkBtn,
} from '../components/ui';
import { PaymentModal } from '../components/PaymentModal';
import { KidModal, type KidPrefill } from '../components/KidModal';

interface AbsenceRow {
  id: string;
  created_at: string;
  details: { kid_name?: string; date?: string; note?: string } | null;
}

export function DashboardPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { user } = useAuth();
  const { data: kids, isLoading } = useKids();

  const absences = useQuery({
    queryKey: ['babysitting-absences', user?.id],
    queryFn: async (): Promise<AbsenceRow[]> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, created_at, details')
        .eq('trainer_id', user!.id)
        .eq('action', 'absence_reported')
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as AbsenceRow[];
    },
    enabled: !!user,
  });
  const { data: payments } = usePayments();
  const cfg = useBabysittingConfig();
  const words = useWords();
  const [payKid, setPayKid] = useState<Client | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const active = useMemo(() => (kids ?? []).filter((k) => k.status === 'active'), [kids]);
  const away = useMemo(() => (kids ?? []).filter((k) => k.status === 'paused'), [kids]);
  const todayKids = useMemo(() => active.filter((k) => scheduledToday(k)), [active]);
  const todayName = DAY_LABELS[ALL_DAYS[new Date().getDay()]];
  const todayIso = new Date().toISOString().slice(0, 10);
  const demo = useDemo();

  // ── Attendance: who actually showed up today ────────────────────
  const today = attendanceFor(cfg.data, todayIso);
  const markedCount = today.present.length + today.absent.length;
  // Whether the parent actually heard about it. She should not have to
  // wonder, and "no phone, no email" is a real answer she can act on.
  const [told, setTold] = useState<Record<string, string>>({});
  function mark(kidId: string, state: 'present' | 'absent' | 'picked_up' | 'clear') {
    if (!cfg.data) return;
    cfg.save.mutate(setAttendance(cfg.data, todayIso, kidId, state));
    // Tell the parent their child is here, or has gone home. Fire and
    // forget: the register must never wait on a text, and a message that
    // fails to send is not a reason to lose the attendance mark. The
    // server decides whether it's switched on, refuses a second one for
    // the same child today, and picks text or email per family.
    if (!demo && (state === 'present' || state === 'picked_up')) {
      const at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setTold((t) => ({ ...t, [kidId]: 'sending' }));
      void api<{ sent: boolean; channel: string | null; duplicate?: boolean; reason?: string }>(
        '/reminders/arrival-notice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: kidId,
            kind: state === 'picked_up' ? 'picked_up' : 'arrived',
            at,
          }),
        },
      )
        .then((r) => {
          const label = r.sent
            ? r.channel === 'sms'
              ? 'texted'
              : 'emailed'
            : r.duplicate
              ? 'already told'
              : r.reason?.includes('switched off') || r.reason?.includes('are off')
                ? ''
                : 'no way to reach them';
          setTold((t) => ({ ...t, [kidId]: label }));
        })
        .catch(() => setTold((t) => ({ ...t, [kidId]: '' })));
    }
  }
  function markAllHere() {
    if (!cfg.data) return;
    const unmarked = todayKids
      .filter((k) => !today.present.includes(k.id) && !today.absent.includes(k.id))
      .map((k) => k.id);
    if (!unmarked.length) return;
    cfg.save.mutate(
      appendLog(
        setAttendanceMany(cfg.data, todayIso, unmarked, 'present'),
        'kid',
        `Marked ${unmarked.length} here today`,
      ),
    );
  }
  const closureToday = (cfg.data?.closures ?? []).find((c) => c.date === todayIso);

  const totalOwed = useMemo(
    () => Math.round(active.reduce((s, k) => s + Math.max(0, readBalance(k)), 0) * 100) / 100,
    [active],
  );

  const weekCollected = useMemo(() => {
    const cut = new Date();
    cut.setDate(cut.getDate() - 7);
    return Math.round(
      (payments ?? [])
        .filter((p) => p.paid_at && new Date(p.paid_at) >= cut && p.amount > 0)
        .reduce((s, p) => s + Number(p.amount), 0) * 100,
    ) / 100;
  }, [payments]);

  // Who owes — grouped per family so one reminder covers siblings.
  const lastPaymentByFamily = useMemo(() => {
    const kidFam = new Map<string, string>();
    for (const k of active) kidFam.set(k.id, readFamilySlug(k) || `solo-${k.id}`);
    const last = new Map<string, string>();
    for (const p of payments ?? []) {
      const fam = kidFam.get(p.client_id);
      if (fam && p.paid_at && !last.has(fam)) last.set(fam, p.paid_at);
    }
    return last;
  }, [payments, active]);

  // Who to chase, in the order worth chasing. Sorted by how LONG the
  // money has been outstanding rather than how much it is: a family six
  // weeks behind needs a word before one who owes more but paid on
  // Friday. A family who has never paid sorts to the top, because that
  // is the one most likely to have been forgotten about entirely.
  const oweFamilies = useMemo(() => {
    const byFam = new Map<string, Client[]>();
    for (const k of active) {
      const slug = readFamilySlug(k) || `solo-${k.id}`;
      byFam.set(slug, [...(byFam.get(slug) ?? []), k]);
    }
    const daysSincePaid = (slug: string, since: string | undefined): number => {
      const last = lastPaymentByFamily.get(slug);
      // Never paid at all: measure from when the first child started, so a
      // family who joined last week doesn't outrank one who joined in May.
      const from = last ?? since;
      if (!from) return 9999;
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) return 9999;
      return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
    };
    return Array.from(byFam.entries())
      .map(([slug, members]) => {
        const started = members
          .map((m) => readStartDate(m))
          .filter(Boolean)
          .sort()[0];
        return {
          slug,
          members,
          ...familySummary(members),
          waitingDays: daysSincePaid(slug, started ?? undefined),
          everPaid: lastPaymentByFamily.has(slug),
        };
      })
      .filter((f) => f.balance > 0.005)
      .sort((a, b) => b.waitingDays - a.waitingDays || b.balance - a.balance);
  }, [active, lastPaymentByFamily]);

  const birthdays = useMemo(() => {
    const now = new Date();
    const soon: Array<{ kid: Client; when: Date }> = [];
    for (const k of active) {
      if (!k.date_of_birth) continue;
      const d = new Date(k.date_of_birth + 'T12:00:00');
      if (Number.isNaN(d.getTime())) continue;
      const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      const diff = (next.getTime() - now.getTime()) / 86400000;
      if (diff <= 30) soon.push({ kid: k, when: next });
    }
    return soon.sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [active]);

  const recentPayments = useMemo(() => (payments ?? []).slice(0, 6), [payments]);
  const kidName = (id: string) => (kids ?? []).find((k) => k.id === id)?.full_name ?? '—';

  const settings = cfg.data?.settings;

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Loading your day…</div>;
  }

  if (!active.length && !away.length) {
    return (
      <Card pad={0}>
        <EmptyState
          emoji="🧸"
          title={`Welcome! Let's add your first ${words.one}.`}
          body={`Each ${words.one} gets a family, a parent contact, allergies, and their days — then billing and balances take care of themselves.`}
          action={<Btn size="lg" onClick={() => setShowAdd(true)}>+ Add your first {words.one}</Btn>}
        />
        {showAdd && <KidModal kid={null} onClose={() => setShowAdd(false)} />}
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <StatTile
          label={`Here today · ${todayName}`}
          value={markedCount ? today.present.length : todayKids.length}
          tone="accent"
          hint={markedCount ? `${today.absent.length} out` : 'tap each name below'}
        />
        <StatTile label={`${words.Many} in care`} value={active.length} />
        <StatTile label="Away right now" value={away.length} tone={away.length ? 'primary' : 'plain'} />
        <StatTile label="Owed to you" value={formatMoney(totalOwed)} tone={totalOwed > 0 ? 'warn' : 'good'} />
        <StatTile label="Collected this week" value={formatMoney(weekCollected)} tone="good" />
      </div>

      <JoinRequests />

      <UnreadFromParents kids={active} />

      {/* Today strip */}
      <Card>
        <SectionTitle
          right={
            editMode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn size="sm" kind="soft" onClick={() => setShowAdd(true)}>+ Add {words.one}</Btn>
                <Btn size="sm" onClick={() => { setPayKid(null); setShowPay(true); }}>💛 Record payment</Btn>
              </div>
            ) : undefined
          }
        >
          Who's here today
        </SectionTitle>
        {!closureToday && todayKids.length > 0 && editMode && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: B.mute }}>
              {markedCount
                ? `${today.present.length} here · ${today.absent.length} out`
                : 'Tap a name when they arrive'}
            </span>
            <Btn size="sm" kind="soft" onClick={markAllHere}>
              ✓ Everyone's here
            </Btn>
          </div>
        )}
        {closureToday ? (
          <div style={{ background: B.plumSoft, color: B.plum, borderRadius: B.radiusSm, padding: '12px 16px', fontWeight: 800, fontSize: '0.92rem' }}>
            📅 Closed today — {closureToday.name}. Enjoy the day off!
          </div>
        ) : todayKids.length ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {todayKids.map((k) => {
              const isHere = today.present.includes(k.id);
              const isOut = today.absent.includes(k.id);
              const isGone = (today.pickedUp ?? []).includes(k.id);
              return (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Link to={`/kids/${k.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: isHere ? B.greenSoft : isOut ? '#f2ede4' : B.rowAlt,
                    border: `1px solid ${isHere ? B.green : B.rule}`,
                    borderRadius: B.pill,
                    padding: '7px 16px 7px 8px',
                    opacity: isOut ? 0.55 : 1,
                    textDecoration: isOut ? 'line-through' : 'none',
                  }}
                >
                  <Avatar name={k.full_name} size={32} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.86rem', color: B.ink }}>
                      {k.full_name.split(' ')[0]}
                      {ageOf(k.date_of_birth) && (
                        <span style={{ color: B.mute, fontWeight: 700, marginLeft: 6, fontSize: '0.74rem' }}>
                          {ageOf(k.date_of_birth)}
                        </span>
                      )}
                    </div>
                    {k.medical_notes?.trim() && (
                      <div style={{ fontSize: '0.68rem', color: B.red, fontWeight: 800 }}>⚠️ {k.medical_notes}</div>
                    )}
                    {told[k.id] && (
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: told[k.id] === 'no way to reach them' ? B.red : B.mute,
                        }}
                      >
                        {told[k.id] === 'sending'
                          ? '· telling their parent…'
                          : told[k.id] === 'no way to reach them'
                            ? '· no phone or email on file'
                            : `· parent ${told[k.id]}`}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              {editMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    type="button"
                    title={isHere ? 'Here — tap to clear' : 'Mark here'}
                    onClick={() => mark(k.id, isHere ? 'clear' : 'present')}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 8,
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: isHere ? B.green : '#f2ede4',
                      color: isHere ? '#fff' : B.inkSoft,
                    }}
                  >
                    ✓
                  </button>
                  {isHere && (
                    <button
                      type="button"
                      title={isGone ? 'Picked up — tap to undo' : 'Mark picked up'}
                      onClick={() => mark(k.id, isGone ? 'present' : 'picked_up')}
                      style={{
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 8,
                        padding: '2px 7px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: isGone ? B.accent : '#f2ede4',
                        color: isGone ? '#fff' : B.inkSoft,
                      }}
                    >
                      🚗
                    </button>
                  )}
                  <button
                    type="button"
                    title={isOut ? 'Out — tap to clear' : 'Mark out'}
                    onClick={() => mark(k.id, isOut ? 'clear' : 'absent')}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 8,
                      padding: '2px 7px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: isOut ? B.red : '#f2ede4',
                      color: isOut ? '#fff' : B.inkSoft,
                    }}
                  >
                    ✗
                  </button>
                </div>
              )}
              </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: B.mute, fontSize: '0.88rem' }}>No {words.many} scheduled for {todayName}. Quiet day ☕</div>
        )}
      </Card>

      {/* Parent-reported absences (from the family portal) */}
      {(absences.data?.length ?? 0) > 0 && (
        <Card style={{ borderLeft: `4px solid ${B.accent}` }}>
          <SectionTitle>🙋 Parents said "out"</SectionTitle>
          <div style={{ display: 'grid', gap: 6 }}>
            {(absences.data ?? []).map((a) => (
              <div key={a.id} style={{ fontSize: '0.87rem' }}>
                <b>{a.details?.kid_name ?? 'A kid'}</b> — out{' '}
                {a.details?.date ? `on ${shortDate(a.details.date + 'T12:00:00')}` : 'today'}
                {a.details?.note && <span style={{ color: B.inkSoft }}> · "{a.details.note}"</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Who owes */}
      <div>
        <SectionTitle>Families who owe</SectionTitle>
        {oweFamilies.length ? (
          <TableWrap>
            <thead>
              <tr>
                <Th>Family</Th>
                {/* On a phone the kid chips and the last-payment date move
                    under the family name — see the bs-phone-only block. */}
                <Th className="bs-phone-hide">Kids</Th>
                <Th style={{ textAlign: 'right' }}>Owes</Th>
                <Th className="bs-phone-hide">Last payment</Th>
                <Th style={{ textAlign: 'right' }}>Remind / collect</Th>
              </tr>
            </thead>
            <tbody>
              {oweFamilies.map((f) => {
                const famLabel = f.slug.startsWith('solo-')
                  ? f.members[0].full_name
                  : familyLabel(f.slug);
                const smsBody = settings
                  ? fillTemplate(settings.smsTemplate, f, settings)
                  : '';
                const emailBody = settings
                  ? fillTemplate(settings.emailTemplate, f, settings)
                  : '';
                return (
                  <tr key={f.slug}>
                    <Td style={{ fontWeight: 800 }}>
                      <span style={{ display: 'inline-flex', gap: 7, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        {famLabel}
                        <WaitingChip days={f.waitingDays} everPaid={f.everPaid} />
                      </span>
                      <div className="bs-phone-only" style={{ marginTop: 4, fontSize: '0.74rem', color: B.mute, fontWeight: 700, lineHeight: 1.5 }}>
                        {f.members.map((m) => m.full_name.split(' ')[0]).join(', ')}
                        {shortDate(lastPaymentByFamily.get(f.slug)) && (
                          <> · last paid {shortDate(lastPaymentByFamily.get(f.slug))}</>
                        )}
                      </div>
                    </Td>
                    <Td className="bs-phone-hide">
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {f.members.map((m) => (
                          <Chip key={m.id} tone="neutral">{m.full_name.split(' ')[0]}</Chip>
                        ))}
                      </div>
                    </Td>
                    <Td style={{ textAlign: 'right', fontWeight: 800, color: B.red }}>
                      {formatMoney(f.balance)}
                    </Td>
                    <Td className="bs-phone-hide" style={{ color: B.inkSoft }}>{shortDate(lastPaymentByFamily.get(f.slug))}</Td>
                    <Td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {f.phone && settings && (
                          <LinkBtn href={smsLink(f.phone, smsBody)} kind="soft" title={`Text ${f.parentName || 'the parent'} their balance`}>
                            📱<span className="bs-phone-hide"> Text</span>
                          </LinkBtn>
                        )}
                        {f.email && settings && (
                          <LinkBtn
                            href={mailtoLink(f.email, settings.emailSubject, emailBody)}
                            kind="ghost"
                            title={`Email ${f.parentName || 'the parent'} their balance`}
                          >
                            ✉️<span className="bs-phone-hide"> Email</span>
                          </LinkBtn>
                        )}
                        {editMode && (
                          <Btn
                            size="sm"
                            onClick={() => {
                              setPayKid(f.members[0]);
                              setShowPay(true);
                            }}
                          >
                            💛 Pay
                          </Btn>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ) : (
          <Card pad={0}>
            <EmptyState emoji="🎉" title="Nobody owes anything" body="Every family is paid up. Enjoy it!" />
          </Card>
        )}
      </div>

      {/* Bottom row: birthdays + recent payments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <Card>
          <SectionTitle>🎂 Birthdays soon</SectionTitle>
          {birthdays.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {birthdays.map(({ kid, when }) => (
                <div key={kid.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={kid.full_name} size={30} />
                  <div style={{ flex: 1, fontWeight: 700, fontSize: '0.86rem' }}>{kid.full_name}</div>
                  <Chip tone="butter">
                    {when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Chip>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: B.mute, fontSize: '0.85rem' }}>No birthdays in the next 30 days.</div>
          )}
        </Card>
        <Card>
          <SectionTitle
            right={<Link to="/billing" style={{ fontSize: '0.76rem', fontWeight: 800, color: B.primaryDeep, textDecoration: 'none' }}>See all →</Link>}
          >
            Recent payments
          </SectionTitle>
          {recentPayments.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentPayments.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem' }}>
                  <div style={{ flex: 1, fontWeight: 700 }}>{kidName(p.client_id)}</div>
                  <span style={{ color: B.mute, fontSize: '0.76rem' }}>{shortDate(p.paid_at)}</span>
                  <Chip tone={Number(p.amount) >= 0 ? 'green' : 'red'}>{formatMoney(Number(p.amount))}</Chip>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: B.mute, fontSize: '0.85rem' }}>No payments recorded yet.</div>
          )}
        </Card>
      </div>

      {/* Away note */}
      {away.length > 0 && (
        <Card>
          <SectionTitle right={<Link to="/away" style={{ fontSize: '0.76rem', fontWeight: 800, color: B.primaryDeep, textDecoration: 'none' }}>Manage →</Link>}>
            ⏸️ Away right now
          </SectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {away.map((k) => (
              <Chip key={k.id} tone="plum">
                {k.full_name} · {daysLabel(k) || 'no days set'}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      {showPay && <PaymentModal kid={payKid} onClose={() => setShowPay(false)} />}
      {showAdd && <KidModal kid={null} onClose={() => setShowAdd(false)} />}
    </div>
  );
}


/** How long this money has been outstanding, said the way she'd say it.
 *  Quiet under two weeks — a family who paid last Friday is not a
 *  problem — then amber, then red. Colour is doing the sorting work
 *  visually that the list is already doing structurally. */
function WaitingChip({ days, everPaid }: { days: number; everPaid: boolean }) {
  if (days < 14 && everPaid) return null;
  const label = !everPaid
    ? 'never paid'
    : days >= 60
      ? `${Math.floor(days / 30)} months`
      : days >= 14
        ? `${Math.floor(days / 7)} weeks`
        : `${days} days`;
  const tone = !everPaid || days >= 42 ? 'red' : days >= 21 ? 'butter' : 'neutral';
  return (
    <Chip tone={tone} style={{ fontSize: '0.68rem' }}>
      {!everPaid ? label : `waiting ${label}`}
    </Chip>
  );
}


/** A mother writing "she's not coming today" at seven in the morning is
 *  the single most useful thing on this screen, and until now it lived
 *  behind a small badge on another tab. Shows only what is genuinely
 *  unread and only from parents — her own messages are not news to her —
 *  and disappears entirely once she has read them. */
function UnreadFromParents({ kids }: { kids: Client[] }) {
  const chat = useChatMessages();
  const items = useMemo(() => {
    const unread = unreadByClient(chat.data, 'client');
    if (!unread.size) return [];
    const byId = new Map(kids.map((k) => [k.id, k]));
    // Newest message per thread, so the card shows what she'd actually read.
    const latest = new Map<string, { body: string; at: string }>();
    for (const m of chat.data ?? []) {
      if (m.sender !== 'client' || m.read_at) continue;
      const prev = latest.get(m.client_id);
      if (!prev || m.created_at > prev.at) latest.set(m.client_id, { body: m.body, at: m.created_at });
    }
    return Array.from(unread.entries())
      .map(([clientId, count]) => {
        const kid = byId.get(clientId);
        const who = kid ? readParent(kid) || kid.full_name.split(' ')[0] : 'A parent';
        return { clientId, count, who, body: latest.get(clientId)?.body ?? '' };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [chat.data, kids]);

  if (!items.length) return null;
  const total = items.reduce((n, i) => n + i.count, 0);

  return (
    <Card style={{ border: `1.5px solid ${B.accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 9 }}>
        <div style={{ fontFamily: B.fontDisplay, fontWeight: 800 }}>
          💬 {total} new {total === 1 ? 'message' : 'messages'} from parents
        </div>
        <Link to="/chat" style={{ fontSize: '0.8rem', fontWeight: 800, color: B.accentDeep, textDecoration: 'none' }}>
          Open chat →
        </Link>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {items.map((i) => (
          <Link
            key={i.clientId}
            to="/chat"
            style={{ textDecoration: 'none', color: B.ink, fontSize: '0.86rem', lineHeight: 1.5 }}
          >
            <b>{i.who}</b>
            {i.count > 1 && <span style={{ color: B.mute, fontWeight: 700 }}> ({i.count})</span>}
            {i.body && <span style={{ color: B.inkSoft }}> — {i.body.slice(0, 90)}{i.body.length > 90 ? '…' : ''}</span>}
          </Link>
        ))}
      </div>
    </Card>
  );
}


/** Parents who filled in the public sign-up link and are waiting to be
 *  added. They are not children yet — nothing from a public form touches
 *  the roster until she has read it and pressed Add. */
function JoinRequests() {
  const { user } = useAuth();
  const demo = useDemo();
  const cfg = useBabysittingConfig();
  const [adding, setAdding] = useState<KidPrefill | null>(null);

  const rows = useQuery({
    queryKey: ['bs-join-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, created_at, details')
        .eq('trainer_id', user!.id)
        .eq('action', 'join_request')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        created_at: string;
        details: {
          parent_name?: string;
          child_name?: string;
          phone?: string | null;
          email?: string | null;
          sms_consent?: boolean;
          note?: string | null;
        } | null;
      }>;
    },
    enabled: !demo && !!user,
    refetchInterval: 120_000,
  });

  const handled = new Set(cfg.data?.handledJoins ?? []);
  const waiting = (rows.data ?? []).filter((r) => !handled.has(r.id));
  if (!waiting.length) return null;

  function hide(id: string) {
    if (!cfg.data) return;
    cfg.save.mutate(markJoinHandled(cfg.data, id));
  }

  return (
    <>
      <Card style={{ border: `1.5px solid ${B.green}` }}>
        <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, marginBottom: 4 }}>
          🙋 {waiting.length} new sign-up {waiting.length === 1 ? 'request' : 'requests'}
        </div>
        <p style={{ fontSize: '0.8rem', color: B.mute, margin: '0 0 12px' }}>
          Filled in by a parent from your sign-up link. Nothing is added until you say so.
        </p>
        <div style={{ display: 'grid', gap: 12 }}>
          {waiting.map((r) => {
            const d = r.details ?? {};
            const child = d.child_name || 'A child';
            const parent = d.parent_name || 'A parent';
            return (
              <div
                key={r.id}
                style={{
                  border: `1px solid ${B.rule}`,
                  borderRadius: B.radiusSm,
                  padding: '11px 13px',
                  background: B.rowAlt,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{child}</div>
                <div style={{ fontSize: '0.8rem', color: B.inkSoft, marginTop: 2, lineHeight: 1.5 }}>
                  {[parent, d.phone, d.email].filter(Boolean).join(' · ')}
                </div>
                {d.note && (
                  <div style={{ fontSize: '0.8rem', color: B.mute, marginTop: 4, lineHeight: 1.5 }}>
                    “{d.note}”
                  </div>
                )}
                <div style={{ fontSize: '0.76rem', marginTop: 6, fontWeight: 800, color: d.sms_consent ? B.green : B.mute }}>
                  {d.sms_consent ? '✓ Wants text reminders' : 'Did not ask for texts'}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Btn
                    size="sm"
                    onClick={() =>
                      setAdding({
                        name: d.child_name ?? '',
                        parent: d.parent_name ?? '',
                        phone: d.phone ?? '',
                        email: d.email ?? '',
                        notes: d.note ?? '',
                        smsConsent: !!d.sms_consent,
                      })
                    }
                  >
                    + Add {child.split(' ')[0]}
                  </Btn>
                  <Btn size="sm" kind="ghost" onClick={() => hide(r.id)}>
                    Hide
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {adding && (
        <KidModal
          kid={null}
          prefill={adding}
          onClose={() => {
            // Whether she saved or backed out, she has dealt with it —
            // and an unsaved one can always be re-added by hand.
            const match = (rows.data ?? []).find((r) => (r.details?.child_name ?? '') === adding.name);
            if (match && cfg.data) cfg.save.mutate(markJoinHandled(cfg.data, match.id));
            setAdding(null);
          }}
        />
      )}
    </>
  );
}
