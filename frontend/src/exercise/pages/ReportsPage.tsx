// Reports — derived insights from the existing clients + payments data.
// Revenue by month, by group, top payers, member stats. No new tables;
// all computed client-side from what's already in Supabase.

import { useMemo } from 'react';
import { useExerciseClients, useExercisePayments } from '../lib/exerciseData';
import {
  E,
  readBalance,
  readGroupSlug,
  shortDate,
  uniqueGroups,
} from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, SectionHead } from './DashboardPage';

export function ReportsPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active');
    const paused = clients.filter((c) => c.status === 'paused');
    const archived = clients.filter((c) => c.status === 'archived');
    let owed = 0;
    let credit = 0;
    for (const c of active) {
      const b = readBalance(c);
      if (b > 0) owed += b;
      if (b < 0) credit += -b;
    }
    const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
    const avgPerActive = active.length > 0 ? totalRevenue / active.length : 0;
    return {
      activeCount: active.length,
      pausedCount: paused.length,
      archivedCount: archived.length,
      owed,
      credit,
      totalRevenue,
      avgPerActive,
      paymentCount: payments.length,
    };
  }, [clients, payments]);

  // Revenue by month — last 12
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      const d = new Date(p.paid_at);
      if (Number.isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      m.set(k, (m.get(k) ?? 0) + Number(p.amount));
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
  }, [payments]);

  const maxMonth = Math.max(1, ...byMonth.map(([, v]) => v));

  // Revenue by group
  const byGroup = useMemo(() => {
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const groupRev = new Map<string, number>();
    const allGroups = uniqueGroups(clients);
    for (const g of allGroups) groupRev.set(g, 0);
    for (const p of payments) {
      const c = clientById.get(p.client_id);
      const slug = c ? readGroupSlug(c) : '';
      const parts = slug.split('-').filter(Boolean);
      if (parts.length === 0) {
        groupRev.set('(no group)', (groupRev.get('(no group)') ?? 0) + Number(p.amount));
        continue;
      }
      const perGroup = Number(p.amount) / parts.length;
      for (const part of parts) {
        const cap = part.charAt(0).toUpperCase() + part.slice(1);
        groupRev.set(cap, (groupRev.get(cap) ?? 0) + perGroup);
      }
    }
    return Array.from(groupRev.entries())
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);
  }, [clients, payments]);

  const maxGroup = Math.max(1, ...byGroup.map(([, v]) => v));

  // Top 10 payers
  const topPayers = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(p.client_id, (m.get(p.client_id) ?? 0) + Number(p.amount));
    const byId = new Map(clients.map((c) => [c.id, c]));
    return Array.from(m.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id, total]) => ({ client: byId.get(id), total }));
  }, [clients, payments]);

  // Highest balances owed
  const highestOwed = useMemo(() => {
    return clients
      .filter((c) => c.status === 'active' && readBalance(c) > 0)
      .sort((a, b) => readBalance(b) - readBalance(a))
      .slice(0, 10);
  }, [clients]);

  // Newest members (last 10 by created_at)
  const newest = useMemo(() => {
    return clients
      .filter((c) => c.status === 'active')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [clients]);

  return (
    <div>
      <div
        style={{
          background: '#f5f8fc',
          border: `1px solid ${E.rule}`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: '0.86rem',
          color: E.inkSoft,
          marginBottom: 14,
        }}
      >
        📈 Live insights from your data. Numbers update automatically as payments come in.
      </div>

      {/* Top-level stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <Stat value={`$${stats.totalRevenue.toFixed(0)}`} label="All-time revenue" tone="green" />
        <Stat value={String(stats.paymentCount)} label="Payments recorded" tone="primary" />
        <Stat value={`$${stats.owed.toFixed(0)}`} label="Outstanding" tone="red" />
        <Stat value={`$${stats.credit.toFixed(0)}`} label="Credit on file" tone="green" />
        <Stat value={String(stats.activeCount)} label="Active members" tone="primary" />
        <Stat value={`$${stats.avgPerActive.toFixed(0)}`} label="Avg per member" tone="primary" />
        <Stat value={String(stats.pausedCount)} label="Paused" tone="orange" />
        <Stat value={String(stats.archivedCount)} label="Former" tone="gray" />
      </div>

      {/* Revenue by month */}
      <SectionHead>📅 Revenue by month (last 12)</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Month</Th>
              <Th>{''}</Th>
              <Th>Amount</Th>
            </tr>
          </thead>
          <tbody>
            {byMonth.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No payment data yet.
                </td>
              </tr>
            ) : (
              byMonth.map(([key, val]) => {
                const pct = (val / maxMonth) * 100;
                return (
                  <Tr key={key}>
                    <Td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{prettyMonth(key)}</Td>
                    <Td style={{ width: '100%' }}>
                      <div style={{ background: '#e8eef5', borderRadius: 4, height: 18 }}>
                        <div
                          style={{
                            background: `linear-gradient(90deg, ${E.primary}, ${E.green})`,
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </Td>
                    <Td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                      ${val.toFixed(0)}
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Revenue by group */}
      <SectionHead style={{ marginTop: 24 }}>🗂 Revenue by class day</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Group</Th>
              <Th>{''}</Th>
              <Th>Amount</Th>
            </tr>
          </thead>
          <tbody>
            {byGroup.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No data.
                </td>
              </tr>
            ) : (
              byGroup.map(([name, val]) => {
                const pct = (val / maxGroup) * 100;
                return (
                  <Tr key={name}>
                    <Td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{name}</Td>
                    <Td style={{ width: '100%' }}>
                      <div style={{ background: '#e8eef5', borderRadius: 4, height: 18 }}>
                        <div style={{ background: E.primary, height: '100%', width: `${pct}%`, borderRadius: 4 }} />
                      </div>
                    </Td>
                    <Td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                      ${val.toFixed(0)}
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Top payers */}
      <SectionHead style={{ marginTop: 24 }}>🏆 Top 10 payers (all-time)</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Member</Th>
              <Th>Total paid</Th>
            </tr>
          </thead>
          <tbody>
            {topPayers.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No payments yet.
                </td>
              </tr>
            ) : (
              topPayers.map((row, i) => (
                <Tr key={row.client?.id ?? i}>
                  <Td style={{ textAlign: 'center', color: E.mute, width: 40 }}>{i + 1}</Td>
                  <Td>
                    <strong style={{ color: E.primaryDeep }}>
                      {row.client?.full_name ?? 'Unknown'}
                    </strong>
                  </Td>
                  <Td style={{ textAlign: 'right', fontWeight: 700, color: E.greenDeep }}>
                    ${row.total.toFixed(0)}
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Highest outstanding */}
      <SectionHead style={{ marginTop: 24 }}>⚠ Highest outstanding balances</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Group</Th>
              <Th>Owes</Th>
            </tr>
          </thead>
          <tbody>
            {highestOwed.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  Nobody owes money. 🎉
                </td>
              </tr>
            ) : (
              highestOwed.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <strong style={{ color: E.primaryDeep }}>{c.full_name}</strong>
                  </Td>
                  <Td style={{ color: E.mute }}>
                    {readGroupSlug(c)
                      .split('-')
                      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                      .join(', ') || '—'}
                  </Td>
                  <Td style={{ textAlign: 'right', fontWeight: 700, color: E.redDeep }}>
                    ${readBalance(c).toFixed(0)}
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>

      {/* Newest members */}
      <SectionHead style={{ marginTop: 24 }}>🆕 Newest members</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Member</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {newest.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <strong style={{ color: E.primaryDeep }}>{c.full_name}</strong>
                </Td>
                <Td style={{ color: E.mute }}>{shortDate(c.created_at)}</Td>
              </Tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

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
        background: '#fff',
        borderRadius: 10,
        padding: '13px 18px',
        flex: '1 1 130px',
        minWidth: 130,
        boxShadow: '0 1px 5px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${border}`,
      }}
    >
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: valColor, lineHeight: 1.1 }}>{value}</div>
      <div
        style={{
          fontSize: '0.7rem',
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

function prettyMonth(k: string): string {
  const [y, m] = k.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
