// Payments tab — full history with search, group filter, and date range.

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  useExerciseClients,
  useExercisePayments,
  useDeletePayment,
} from '../lib/exerciseData';
import { useEditMode } from '../components/AppShell';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import {
  E,
  readGroup,
  shortDate,
  uniqueGroups,
  clientInGroup,
  formatMoney,
} from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, btnSm } from './DashboardPage';

const PAGE_SIZE = 50;

export function PaymentsPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();
  const [editMode] = useEditMode();
  const del = useDeletePayment();

  const [q, setQ] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => uniqueGroups(clients), [clients]);
  const byId = useMemo(() => {
    const m = new Map<string, (typeof clients)[number]>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromTs = from ? new Date(from + 'T00:00:00').getTime() : null;
    const toTs = to ? new Date(to + 'T23:59:59').getTime() : null;
    return payments.filter((p) => {
      const c = byId.get(p.client_id);
      if (needle && !(c?.full_name.toLowerCase().includes(needle))) return false;
      if (groupFilter && !(c && clientInGroup(c, groupFilter))) return false;
      const t = new Date(p.paid_at).getTime();
      if (fromTs !== null && t < fromTs) return false;
      if (toTs !== null && t > toTs) return false;
      return true;
    });
  }, [payments, byId, q, groupFilter, from, to]);

  const total = filtered.reduce((s, p) => s + Number(p.amount), 0);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  async function onDelete(id: string) {
    if (!confirm('Delete this payment? This cannot be undone.')) return;
    await del.mutateAsync(id);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 13, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search name…"
          style={inputCls}
        />
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={selCls}>
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" style={selCls} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" style={selCls} />
        {editMode && (
          <button onClick={() => setAdding(true)} style={btnSm(E.green)}>
            + Record Payment
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: E.mute, marginBottom: 10 }}>
        Showing <strong>{filtered.length}</strong> payment{filtered.length === 1 ? '' : 's'} ·
        Total: <strong style={{ color: E.greenDeep }}>${total.toFixed(0)}</strong>
      </p>

      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Date</Th>
              <Th>Amount</Th>
              <Th>Group</Th>
              <Th>Method</Th>
              {editMode && <Th>Del</Th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={editMode ? 6 : 5} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No payments match.
                </td>
              </tr>
            ) : (
              pageRows.map((p) => {
                const c = byId.get(p.client_id);
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
                    <Td style={{ textTransform: 'capitalize', color: E.mute }}>{p.method ?? '—'}</Td>
                    {editMode && (
                      <Td>
                        <button
                          onClick={() => onDelete(p.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: E.redDeep,
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          aria-label="Delete payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Td>
                    )}
                  </Tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={pageBtn(page === 0)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: E.mute, padding: '6px 12px' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={pageBtn(page >= totalPages - 1)}
          >
            Next →
          </button>
        </div>
      )}

      {adding && <RecordPaymentModal onClose={() => setAdding(false)} />}
    </div>
  );
}

const inputCls: React.CSSProperties = {
  flex: 1,
  minWidth: 170,
  padding: '9px 12px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.88rem',
  outline: 'none',
  fontFamily: 'Arial, sans-serif',
};
const selCls: React.CSSProperties = {
  padding: '9px 10px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.86rem',
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif',
};

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    background: disabled ? '#eee' : E.primary,
    color: disabled ? '#999' : '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  };
}
