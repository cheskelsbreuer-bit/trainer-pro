// Lookup — type a name, see everything about that member: details,
// every payment, computed balance.

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useExerciseClients, useExercisePayments } from '../lib/exerciseData';
import type { Client, Payment } from '../../lib/database.types';
import {
  E,
  readGroup,
  readBalance,
  readTotalClasses,
  readTotalPaid,
  readTotalOwed,
  readStartDate,
  readPausedClasses,
  formatBalance,
  shortDate,
  formatMoney,
} from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles } from './DashboardPage';

export function LookupPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();
  const [params, setParams] = useSearchParams();
  const initialId = params.get('id') ?? '';
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string>(initialId);

  // If URL has ?id=, preselect.
  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return clients
      .filter((c) => c.full_name.toLowerCase().includes(needle))
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .slice(0, 10);
  }, [clients, q]);

  const selected = clients.find((c) => c.id === selectedId);
  const memberPayments = useMemo(() => {
    if (!selected) return [];
    return payments
      .filter((p) => p.client_id === selected.id)
      .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  }, [payments, selected]);

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
        🔍 Type any name to see every payment and detail.
      </div>

      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a name…"
          autoFocus
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid #ccc',
            borderRadius: 8,
            fontSize: '0.95rem',
            outline: 'none',
            fontFamily: 'Arial, sans-serif',
          }}
        />
        {matches.length > 0 && (
          <ul
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#fff',
              border: `1px solid ${E.rule}`,
              borderRadius: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              listStyle: 'none',
              padding: 0,
              margin: '4px 0 0',
              zIndex: 10,
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {matches.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  setQ('');
                  setParams({ id: c.id });
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${E.ruleSoft}`,
                  fontSize: '0.9rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = E.rowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              >
                <strong>{c.full_name}</strong>
                <span style={{ color: E.mute, marginLeft: 10, fontSize: '0.82rem' }}>
                  {readGroup(c) || 'no group'} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <MemberDetail
          client={selected}
          payments={memberPayments}
        />
      )}
    </div>
  );
}

function MemberDetail({
  client,
  payments,
}: {
  client: Client;
  payments: Payment[];
}) {
  if (!client) return null;
  const bal = formatBalance(readBalance(client));
  const balColor =
    bal.tone === 'owe' ? E.redDeep : bal.tone === 'credit' ? E.greenDeep : E.mute;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.08)',
      }}
    >
      <h2
        style={{
          fontSize: '1.3rem',
          color: E.primaryDeep,
          margin: 0,
          marginBottom: 4,
        }}
      >
        {client.full_name}
      </h2>
      <p style={{ color: E.mute, margin: 0, marginBottom: 16, fontSize: '0.87rem' }}>
        {readGroup(client) || 'no group'} · {client.status}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Info label="Balance" value={bal.label} color={balColor} />
        <Info label="Classes attended" value={String(readTotalClasses(client))} />
        <Info label="Total owed" value={`$${readTotalOwed(client).toFixed(0)}`} />
        <Info label="Total paid" value={`$${readTotalPaid(client).toFixed(0)}`} />
        <Info label="Paused classes" value={String(readPausedClasses(client))} />
        <Info label="Joined" value={readStartDate(client) ?? '—'} />
      </div>

      <h3
        style={{
          fontSize: '0.82rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
          color: E.inkSoft,
          margin: '20px 0 8px',
          paddingBottom: 5,
          borderBottom: `1px solid ${E.rule}`,
        }}
      >
        💰 Payment history — {payments.length} payment{payments.length === 1 ? '' : 's'}
      </h3>

      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <Tr key={p.id}>
                  <Td>{shortDate(p.paid_at)}</Td>
                  <Td>
                    <span style={{ color: E.greenDeep, fontWeight: 700 }}>
                      {formatMoney(Number(p.amount))}
                    </span>
                  </Td>
                  <Td style={{ textTransform: 'capitalize', color: E.mute }}>{p.method ?? '—'}</Td>
                  <Td style={{ color: E.mute, fontSize: '0.83rem' }}>{p.description ?? ''}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function Info({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#f5f8fc', borderRadius: 8, padding: '10px 12px' }}>
      <div
        style={{
          fontSize: '0.7rem',
          color: '#888',
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: color ?? E.primaryDeep,
        }}
      >
        {value}
      </div>
    </div>
  );
}
