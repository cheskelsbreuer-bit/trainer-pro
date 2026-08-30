// One kid, the whole picture — who they are, what to watch out for,
// where the money stands, and every charge & payment in one timeline.

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import {
  B,
  readFamilySlug,
  familyLabel,
  readParent,
  readDays,
  DAY_SHORT,
  readStartDate,
  readTotalOwed,
  readTotalPaid,
  readBalance,
  scheduledToday,
  readCustomValues,
  readKidTagIds,
  formatMoney,
  shortDate,
  ageOf,
} from '../theme';
import { useKids, usePayments, useSetKidStatus } from '../lib/data';
import {
  useBabysittingConfig,
  appendLog,
  type AwayRecord,
  type BabysittingConfig,
  type ChargeEntry,
} from '../lib/config';
import {
  Card,
  SectionTitle,
  StatTile,
  EmptyState,
  Btn,
  Chip,
  BalancePill,
  Avatar,
} from '../components/ui';
import { PaymentModal } from '../components/PaymentModal';
import { ChargeModal } from '../components/ChargeModal';
import { KidModal } from '../components/KidModal';
import { InviteParentButton } from '../components/InviteParentButton';
import { familyHasPortal } from '../lib/chat';

const linkStyle: CSSProperties = {
  color: B.accentDeep,
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: '0.82rem',
};

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.66rem',
          fontWeight: 800,
          color: B.mute,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '0.88rem', color: B.ink, fontWeight: 600 }}>{children}</div>
    </div>
  );
}

interface HistoryRow {
  id: string;
  ts: string;
  kind: 'payment' | 'charge';
  amount: number;
  chargeKind?: ChargeEntry['kind'];
  hours?: number;
  sub?: string;
}

const CHARGE_LABEL: Record<ChargeEntry['kind'], string> = {
  week: 'Weekly charge',
  hours: 'Hourly charge',
  custom: 'One-off charge',
  adjustment: 'Adjustment',
};
const CHARGE_CHIP_TONE: Record<ChargeEntry['kind'], 'primary' | 'accent' | 'butter' | 'plum'> = {
  week: 'primary',
  hours: 'accent',
  custom: 'butter',
  adjustment: 'plum',
};

export function KidDetailPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { id } = useParams<{ id: string }>();
  const { data: kids, isLoading } = useKids();
  const { data: payments } = usePayments();
  const cfg = useBabysittingConfig();
  const setStatus = useSetKidStatus();
  const navigate = useNavigate();

  const [showPay, setShowPay] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const kid = useMemo<Client | null>(
    () => (kids ?? []).find((k) => k.id === id) ?? null,
    [kids, id],
  );

  const history = useMemo<HistoryRow[]>(() => {
    if (!kid) return [];
    const rows: HistoryRow[] = [];
    for (const p of payments ?? []) {
      if (p.client_id !== kid.id) continue;
      rows.push({
        id: `pay-${p.id}`,
        ts: p.paid_at,
        kind: 'payment',
        amount: Number(p.amount),
        sub:
          p.description && p.description !== 'Babysitting payment'
            ? p.description
            : undefined,
      });
    }
    const methodByRow = new Map<string, string>();
    for (const p of payments ?? []) {
      if (p.client_id === kid.id && p.method) methodByRow.set(`pay-${p.id}`, p.method);
    }
    for (const c of cfg.data?.charges ?? []) {
      if (c.clientId !== kid.id) continue;
      rows.push({
        id: `chg-${c.id}`,
        ts: c.ts,
        kind: 'charge',
        amount: c.amount,
        chargeKind: c.kind,
        hours: c.hours,
        sub: c.note,
      });
    }
    rows.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    return rows.slice(0, 40).map((r) => ({
      ...r,
      sub: r.sub ?? (r.kind === 'payment' ? methodByRow.get(r.id) : undefined),
    }));
  }, [kid, payments, cfg.data]);

  // The portal login belongs to the FAMILY, so a sibling's account
  // counts — otherwise a second child looks "not invited" forever.
  const family = useMemo<Client[]>(() => {
    if (!kid) return [];
    const slug = readFamilySlug(kid);
    if (!slug) return [kid];
    return (kids ?? []).filter((k) => readFamilySlug(k) === slug);
  }, [kids, kid]);
  const hasPortal = useMemo(() => familyHasPortal(family.length ? family : kid ? [kid] : []), [family, kid]);

  const paymentMethod = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const p of payments ?? []) if (p.method) m.set(`pay-${p.id}`, p.method);
    return m;
  }, [payments]);

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Getting their story…</div>;
  }

  if (!kid) {
    return (
      <Card pad={0}>
        <EmptyState
          emoji="🧸"
          title="We couldn't find that kid"
          body="They may have been moved or removed, or this link is from a while ago."
          action={
            <Link to="/kids" style={{ textDecoration: 'none' }}>
              <Btn>← Back to kids</Btn>
            </Link>
          }
        />
      </Card>
    );
  }

  const famSlug = readFamilySlug(kid);
  const parentName = readParent(kid);
  const days = readDays(kid);
  const started = readStartDate(kid);
  const totalOwed = readTotalOwed(kid);
  const totalPaid = readTotalPaid(kid);
  const balance = readBalance(kid);
  const age = ageOf(kid.date_of_birth);
  const busy = setStatus.isPending || cfg.save.isPending;

  async function markAway() {
    if (!kid || !cfg.data) return;
    if (
      !window.confirm(
        `Mark ${kid.full_name} as away? They'll step off the daily lists until you mark them returned.`,
      )
    )
      return;
    setErrMsg('');
    try {
      await setStatus.mutateAsync({ id: kid.id, status: 'paused' });
      const rec: AwayRecord = {
        id: `aw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        clientId: kid.id,
        kidName: kid.full_name,
        startedAt: new Date().toISOString(),
      };
      let next: BabysittingConfig = { ...cfg.data, away: [rec, ...cfg.data.away] };
      next = appendLog(next, 'away', `${kid.full_name} marked away`);
      cfg.save.mutate(next);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Could not mark them away.');
    }
  }

  async function markReturned() {
    if (!kid || !cfg.data) return;
    setErrMsg('');
    try {
      await setStatus.mutateAsync({ id: kid.id, status: 'active' });
      const now = new Date().toISOString();
      const away = cfg.data.away.map((a) =>
        a.clientId === kid.id && !a.endedAt ? { ...a, endedAt: now } : a,
      );
      let next: BabysittingConfig = { ...cfg.data, away };
      next = appendLog(next, 'away', `${kid.full_name} is back`);
      cfg.save.mutate(next);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Could not mark them returned.');
    }
  }

  async function moveToFormer() {
    if (!kid || !cfg.data) return;
    if (
      !window.confirm(
        `Move ${kid.full_name} to former kids? Their history and balance stay saved — they just leave the active roster.`,
      )
    )
      return;
    setErrMsg('');
    try {
      await setStatus.mutateAsync({ id: kid.id, status: 'archived' });
      cfg.save.mutate(appendLog(cfg.data, 'kid', `${kid.full_name} moved to former`));
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Could not move them to former.');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <Link
          to="/kids"
          style={{ fontSize: '0.78rem', fontWeight: 800, color: B.mute, textDecoration: 'none' }}
        >
          ← Back to kids
        </Link>
      </div>

      {/* Identity */}
      <Card>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar name={kid.full_name} size={64} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: B.fontDisplay,
                  fontWeight: 800,
                  fontSize: '1.4rem',
                  color: B.ink,
                }}
              >
                {kid.full_name}
              </h1>
              {age && (
                <span style={{ color: B.mute, fontWeight: 800, fontSize: '0.9rem' }}>{age} old</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {famSlug && (
                <Link to="/families" style={{ textDecoration: 'none' }}>
                  <Chip tone="primary">👨‍👩‍👧 {familyLabel(famSlug)}</Chip>
                </Link>
              )}
              {kid.status === 'paused' && <Chip tone="plum">⏸️ Away right now</Chip>}
              {(cfg.data?.kidTags ?? [])
                .filter((tg) => readKidTagIds(kid).includes(tg.id))
                .map((tg) => (
                  <span key={tg.id} style={{ background: `${tg.color}22`, color: tg.color, borderRadius: 999, fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px' }}>
                    {tg.label}
                  </span>
                ))}
              {kid.status === 'archived' && <Chip tone="neutral">🗃 Former kid</Chip>}
              {kid.status === 'active' && scheduledToday(kid) && (
                <Chip tone="butter">☀️ Here today</Chip>
              )}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px 18px',
                marginTop: 16,
              }}
            >
              <Info label="Parent">
                <div>{parentName || '—'}</div>
                {(kid.phone || kid.email) && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 3 }}>
                    {kid.phone && (
                      <a href={`tel:${kid.phone}`} style={linkStyle}>
                        📞 {kid.phone}
                      </a>
                    )}
                    {kid.email && (
                      <a href={`mailto:${kid.email}`} style={linkStyle}>
                        ✉️ {kid.email}
                      </a>
                    )}
                  </div>
                )}
              </Info>
              <Info label="Emergency contact">{kid.emergency_contact || '—'}</Info>
              <Info label="Days here">
                {days.length ? (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {days.map((d) => (
                      <Chip key={d} tone="accent">
                        {DAY_SHORT[d]}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: B.mute }}>No days set</span>
                )}
              </Info>
              <Info label="Started">{started ? shortDate(started) : '—'}</Info>
              <Info label="Parent portal">
                {hasPortal ? (
                  <Chip tone="green">✓ Signed up</Chip>
                ) : (
                  <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip tone="neutral">Not set up yet</Chip>
                    {editMode && <InviteParentButton kids={family.length ? family : [kid]} />}
                  </span>
                )}
              </Info>
              {(cfg.data?.customFields ?? []).map((f) => {
                const v = readCustomValues(kid)[f.id];
                return v ? <Info key={f.id} label={f.label}>{v}</Info> : null;
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Allergies + care notes — the notes card always shows, so it's
          obvious where they live and how to add them. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
        }}
      >
        {kid.medical_notes?.trim() && (
          <Card style={{ background: B.redSoft, border: `1.5px dashed ${B.red}` }}>
            <div
              style={{
                fontFamily: B.fontDisplay,
                fontWeight: 800,
                fontSize: '0.95rem',
                color: B.red,
                marginBottom: 6,
              }}
            >
              ⚠️ Allergies
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: B.ink, lineHeight: 1.45 }}>
              {kid.medical_notes}
            </div>
          </Card>
        )}
        <Card>
          <SectionTitle
            right={
              editMode ? (
                <Btn size="sm" kind="ghost" onClick={() => setShowEdit(true)}>
                  ✏️ {kid.notes?.trim() ? 'Edit' : 'Add notes'}
                </Btn>
              ) : undefined
            }
          >
            📝 Care notes
          </SectionTitle>
          {kid.notes?.trim() ? (
            <div
              style={{
                fontSize: '0.9rem',
                color: B.inkSoft,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.55,
              }}
            >
              {kid.notes}
            </div>
          ) : (
            <div style={{ fontSize: '0.86rem', color: B.mute }}>
              Nothing written yet — nap schedule, favorite snack, pickup notes.
              {editMode ? ' Tap "Add notes" to write some.' : ''}
            </div>
          )}
        </Card>
      </div>

      {/* Money */}
      <Card>
        <SectionTitle right={<BalancePill balance={balance} />}>💛 Money</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
          }}
        >
          <StatTile label="Total billed" value={formatMoney(totalOwed)} />
          <StatTile label="Total paid" value={formatMoney(totalPaid)} tone="good" />
          <StatTile
            label="Balance"
            value={formatMoney(balance)}
            tone={balance > 0.005 ? 'warn' : 'good'}
            hint={balance > 0.005 ? 'They owe you' : balance < -0.005 ? 'Credit on file' : 'All squared up'}
          />
        </div>
        {editMode && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <Btn size="sm" onClick={() => setShowPay(true)}>
              💛 Record payment
            </Btn>
            <Btn size="sm" kind="soft" onClick={() => setShowCharge(true)}>
              🧾 Add to bill
            </Btn>
            <Btn
              size="sm"
              kind="ghost"
              onClick={() => navigate(`/chat?family=${famSlug || `solo-${kid.id}`}`)}
              title={parentName ? `Chat with ${parentName}` : 'Chat with the parent'}
            >
              💬 Message parent
            </Btn>
            <Btn size="sm" kind="ghost" onClick={() => setShowEdit(true)}>
              ✏️ Edit
            </Btn>
            {kid.status === 'active' && (
              <Btn size="sm" kind="ghost" onClick={markAway} disabled={busy}>
                ⏸️ Mark away
              </Btn>
            )}
            {kid.status === 'paused' && (
              <Btn size="sm" kind="accent" onClick={markReturned} disabled={busy}>
                ▶️ Mark returned
              </Btn>
            )}
            {kid.status !== 'archived' && (
              <Btn size="sm" kind="danger" onClick={moveToFormer} disabled={busy}>
                🗃 Move to former
              </Btn>
            )}
          </div>
        )}
        {errMsg && (
          <div style={{ marginTop: 10 }}>
            <Chip tone="red">{errMsg}</Chip>
          </div>
        )}
      </Card>

      {/* History */}
      <div>
        <SectionTitle
          right={
            history.length === 40 ? (
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: B.mute }}>
                Showing the last 40
              </span>
            ) : undefined
          }
        >
          Charges & payments
        </SectionTitle>
        {history.length ? (
          <Card pad={0}>
            {history.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 18px',
                  borderTop: i ? `1px solid ${B.rule}` : 'none',
                  background: i % 2 ? B.rowAlt : 'transparent',
                }}
              >
                <span
                  style={{
                    width: 96,
                    flexShrink: 0,
                    color: B.mute,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  {shortDate(row.ts)}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.87rem', color: B.ink }}>
                    {row.kind === 'payment'
                      ? 'Payment'
                      : row.chargeKind === 'hours' && row.hours
                        ? `${row.hours} hours`
                        : CHARGE_LABEL[row.chargeKind ?? 'custom']}
                  </span>
                  {row.kind === 'charge' && row.chargeKind && (
                    <Chip tone={CHARGE_CHIP_TONE[row.chargeKind]}>{row.chargeKind}</Chip>
                  )}
                  {row.kind === 'payment' && paymentMethod.get(row.id) && (
                    <Chip tone="neutral" style={{ textTransform: 'capitalize' }}>
                      {paymentMethod.get(row.id)}
                    </Chip>
                  )}
                  {row.kind === 'charge' && row.sub && (
                    <span style={{ color: B.mute, fontSize: '0.78rem' }}>{row.sub}</span>
                  )}
                  {row.kind === 'payment' && row.sub && row.sub !== paymentMethod.get(row.id) && (
                    <span style={{ color: B.mute, fontSize: '0.78rem' }}>{row.sub}</span>
                  )}
                </div>
                {row.kind === 'payment' ? (
                  <Chip tone="green">+{formatMoney(row.amount)}</Chip>
                ) : row.amount < 0 ? (
                  <Chip tone="accent">credit {formatMoney(-row.amount)}</Chip>
                ) : (
                  <Chip tone="neutral">billed {formatMoney(row.amount)}</Chip>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <Card pad={0}>
            <EmptyState
              emoji="🌱"
              title="No money history yet"
              body={`Nothing has been billed or paid for ${kid.full_name.split(' ')[0]} so far.`}
            />
          </Card>
        )}
      </div>

      {showPay && <PaymentModal kid={kid} onClose={() => setShowPay(false)} />}
      {showCharge && (
        <ChargeModal
          kids={[kid]}
          title={`Bill ${kid.full_name.split(' ')[0]}`}
          onClose={() => setShowCharge(false)}
        />
      )}
      {showEdit && <KidModal kid={kid} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
