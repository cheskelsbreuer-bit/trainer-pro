// Groups tab — one card per class day, click a card to see the roster
// for that day with their balances.

import { useMemo, useState } from 'react';
import { useExerciseClients, useExercisePayments } from '../lib/exerciseData';
import {
  E,
  readBalance,
  readTotalClasses,
  readTotalPaid,
  uniqueGroups,
  clientInGroup,
  shortDate,
  formatBalance,
} from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles } from './DashboardPage';

export function GroupsPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const groups = useMemo(() => uniqueGroups(clients), [clients]);

  const lastPayByClient = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of payments) {
      const prev = m.get(p.client_id);
      if (!prev || new Date(p.paid_at) > new Date(prev)) m.set(p.client_id, p.paid_at);
    }
    return m;
  }, [payments]);

  if (activeGroup) {
    const members = clients.filter(
      (c) => c.status === 'active' && clientInGroup(c, activeGroup),
    );
    const totalOwed = members.reduce((s, c) => s + Math.max(0, readBalance(c)), 0);
    const totalCredit = members.reduce((s, c) => s + Math.max(0, -readBalance(c)), 0);
    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <button
              onClick={() => setActiveGroup(null)}
              style={{
                background: E.gray,
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ← Back to Groups
            </button>
            <strong style={{ marginLeft: 12, fontSize: '1.05rem', color: E.primaryDeep }}>
              {activeGroup} class — {members.length} active members
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <Stat value={String(members.length)} label="Active in this group" tone="primary" />
          <Stat value={`$${totalOwed.toFixed(0)}`} label="Total owed" tone="red" />
          <Stat value={`$${totalCredit.toFixed(0)}`} label="Credit on file" tone="green" />
        </div>

        <TableWrap>
          <table style={tableStyles}>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Balance</Th>
                <Th>Classes</Th>
                <Th>Total Paid</Th>
                <Th>Last Payment</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((c) => {
                const bal = formatBalance(readBalance(c));
                const color =
                  bal.tone === 'owe' ? E.redDeep : bal.tone === 'credit' ? E.greenDeep : E.mute;
                return (
                  <Tr key={c.id}>
                    <Td>
                      <strong style={{ color: E.primaryDeep }}>{c.full_name}</strong>
                    </Td>
                    <Td>
                      <span style={{ color, fontWeight: 700 }}>{bal.label}</span>
                    </Td>
                    <Td>{readTotalClasses(c)}</Td>
                    <Td>${readTotalPaid(c).toFixed(0)}</Td>
                    <Td>{shortDate(lastPayByClient.get(c.id))}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </div>
    );
  }

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
        🗂 Click any group to see all <strong>active</strong> members in that class.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        {groups.length === 0 ? (
          <p style={{ color: E.mute }}>No groups yet — add members to start.</p>
        ) : (
          groups.map((g) => {
            const members = clients.filter(
              (c) => c.status === 'active' && clientInGroup(c, g),
            );
            const revenue = members.reduce((s, c) => {
              const rate = c.rate_per_session ?? 15;
              return s + Number(rate);
            }, 0);
            return (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                style={{
                  background: '#fff',
                  border: `2px solid ${E.primary}`,
                  borderRadius: 12,
                  padding: '18px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
                  fontFamily: 'Arial, sans-serif',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: E.primaryDeep }}>{g}</div>
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: E.inkSoft }}>
                  {members.length} active member{members.length === 1 ? '' : 's'}
                </div>
                <div style={{ marginTop: 4, fontSize: '0.82rem', color: E.mute }}>
                  ${revenue.toFixed(0)}/class revenue
                </div>
              </button>
            );
          })
        )}
      </div>
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
  tone: 'primary' | 'red' | 'green';
}) {
  const c =
    tone === 'red' ? E.red : tone === 'green' ? E.green : E.primary;
  const vc =
    tone === 'red' ? E.redDeep : tone === 'green' ? E.greenDeep : E.primaryDeep;
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        padding: '13px 18px',
        flex: '1 1 130px',
        minWidth: 130,
        boxShadow: '0 1px 5px rgba(0,0,0,0.08)',
        borderLeft: `4px solid ${c}`,
      }}
    >
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: vc }}>{value}</div>
      <div
        style={{
          fontSize: '0.72rem',
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
