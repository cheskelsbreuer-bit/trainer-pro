// Dashboard — at-a-glance numbers + the two tables a coach checks every
// morning: who owes money, and what payments came in recently.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useExerciseClients, useExercisePayments } from '../lib/exerciseData';
import { useEditMode } from '../components/AppShell';
import {
  E,
  readBalance,
  readGroup,
  shortDate,
  formatMoney,
} from '../theme';
import { RecordPaymentModal } from '../components/RecordPaymentModal';

export function DashboardPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();
  const [editMode] = useEditMode();
  const [payingClientId, setPayingClientId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active');
    const paused = clients.filter((c) => c.status === 'paused');
    let owed = 0;
    let credit = 0;
    for (const c of active) {
      const b = readBalance(c);
      if (b > 0) owed += b;
      if (b < 0) credit += -b;
    }
    const sinceMonth = new Date();
    sinceMonth.setDate(1);
    sinceMonth.setHours(0, 0, 0, 0);
    const monthIncome = payments
      .filter((p) => new Date(p.paid_at) >= sinceMonth)
      .reduce((s, p) => s + Number(p.amount), 0);

    return {
      activeCount: active.length,
      pausedCount: paused.length,
      owed,
      credit,
      monthIncome,
    };
  }, [clients, payments]);

  const oweRows = useMemo(() => {
    const byClient = new Map<string, string>();
    // last payment date per client
    for (const p of payments) {
      const prev = byClient.get(p.client_id);
      if (!prev || new Date(p.paid_at) > new Date(prev)) {
        byClient.set(p.client_id, p.paid_at);
      }
    }
    return clients
      .filter((c) => c.status === 'active' && readBalance(c) > 0)
      .map((c) => ({
        client: c,
        balance: readBalance(c),
        lastPaid: byClient.get(c.id) ?? null,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [clients, payments]);

  const clientById = useMemo(() => {
    const m = new Map<string, (typeof clients)[number]>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const recentRows = useMemo(() => {
    return payments
      .slice()
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
      .slice(0, 10);
  }, [payments]);

  return (
    <div>
      {editMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button onClick={() => setPayingClientId('')} style={btnBig(E.green)}>
            💰 Record a Payment
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <Stat value={String(stats.activeCount)} label="Active members" tone="primary" />
        <Stat
          value={`$${stats.owed.toFixed(0)}`}
          label="Total owed"
          tone={stats.owed > 0 ? 'red' : 'gray'}
        />
        <Stat
          value={`$${stats.credit.toFixed(0)}`}
          label="Credit on file"
          tone="green"
        />
        <Stat value={`$${stats.monthIncome.toFixed(0)}`} label="This month" tone="primary" />
        <Stat value={String(stats.pausedCount)} label="Paused" tone="orange" />
      </div>

      {/* Owe table */}
      <SectionHead>⚠ Members Who Owe Money</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Group</Th>
              <Th>Owes</Th>
              <Th>Last Payment</Th>
              {editMode && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {oweRows.length === 0 ? (
              <tr>
                <td colSpan={editMode ? 5 : 4} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  Nobody owes money right now. Nice. 🎉
                </td>
              </tr>
            ) : (
              oweRows.map((r) => (
                <Tr key={r.client.id}>
                  <Td>
                    <Link to={`/lookup?id=${r.client.id}`} style={{ color: E.primaryDeep, fontWeight: 600 }}>
                      {r.client.full_name}
                    </Link>
                  </Td>
                  <Td>{readGroup(r.client)}</Td>
                  <Td>
                    <span style={{ color: E.redDeep, fontWeight: 700 }}>
                      ${r.balance.toFixed(0)}
                    </span>
                  </Td>
                  <Td>{shortDate(r.lastPaid)}</Td>
                  {editMode && (
                    <Td>
                      <button onClick={() => setPayingClientId(r.client.id)} style={btnSm(E.green)}>
                        💰 Record
                      </button>
                    </Td>
                  )}
                </Tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Recent table */}
      <SectionHead style={{ marginTop: 24 }}>💰 Recent Payments</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Date</Th>
              <Th>Amount</Th>
              <Th>Group</Th>
              <Th>Method</Th>
            </tr>
          </thead>
          <tbody>
            {recentRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No payments yet.
                </td>
              </tr>
            ) : (
              recentRows.map((p) => {
                const c = clientById.get(p.client_id);
                return (
                  <Tr key={p.id}>
                    <Td>{c?.full_name ?? '—'}</Td>
                    <Td>{shortDate(p.paid_at)}</Td>
                    <Td>
                      <span style={{ color: E.greenDeep, fontWeight: 700 }}>
                        {formatMoney(Number(p.amount))}
                      </span>
                    </Td>
                    <Td>{c ? readGroup(c) : '—'}</Td>
                    <Td style={{ color: E.mute, textTransform: 'capitalize' }}>
                      {p.method ?? '—'}
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {payingClientId !== null && (
        <RecordPaymentModal
          initialClientId={payingClientId || undefined}
          onClose={() => setPayingClientId(null)}
        />
      )}
    </div>
  );
}

// ── Shared UI primitives used throughout the exercise app ─────────────
function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: 'primary' | 'red' | 'green' | 'orange' | 'gray';
}) {
  const border =
    tone === 'red'
      ? E.red
      : tone === 'green'
        ? E.green
        : tone === 'orange'
          ? E.orange
          : tone === 'gray'
            ? E.gray
            : E.primary;
  const valColor =
    tone === 'red'
      ? E.redDeep
      : tone === 'green'
        ? E.greenDeep
        : tone === 'orange'
          ? E.orangeDeep
          : tone === 'gray'
            ? E.mute
            : E.primaryDeep;
  return (
    <div
      style={{
        background: E.card,
        borderRadius: 10,
        padding: '13px 18px',
        flex: '1 1 130px',
        minWidth: 130,
        boxShadow: '0 1px 5px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${border}`,
      }}
    >
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: valColor, lineHeight: 1.1 }}>
        {value}
      </div>
      <div
        style={{
          fontSize: '0.73rem',
          color: E.mute,
          marginTop: 2,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function SectionHead({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: '0.82rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        color: E.inkSoft,
        margin: '14px 0 7px',
        paddingBottom: 5,
        borderBottom: `1px solid ${E.rule}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        overflowX: 'auto',
        borderRadius: 10,
        boxShadow: '0 1px 5px rgba(0,0,0,0.09)',
        background: E.card,
      }}
    >
      {children}
    </div>
  );
}

export const tableStyles: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  background: E.card,
};

export function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      style={{
        background: E.primaryDeep,
        color: '#fff',
        padding: '10px 12px',
        fontSize: '0.76rem',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <td
      style={{
        padding: '9px 12px',
        borderBottom: `1px solid ${E.ruleSoft}`,
        fontSize: '0.86rem',
        verticalAlign: 'middle',
        ...style,
      }}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  zebra = true,
}: {
  children: React.ReactNode;
  zebra?: boolean;
}) {
  return (
    <tr
      style={{
        background: zebra ? undefined : E.card,
      }}
    >
      {children}
    </tr>
  );
}

export function btnSm(bg: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: '0.78rem',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    background: bg,
    color: '#fff',
  };
}
export function btnBig(bg: string): React.CSSProperties {
  return {
    padding: '10px 18px',
    fontSize: '0.92rem',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
    background: bg,
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}
export function btn(bg: string): React.CSSProperties {
  return {
    padding: '8px 15px',
    fontSize: '0.86rem',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    background: bg,
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  };
}
