// Members tab — searchable, sortable, filterable roster. The day-to-day
// table mom looks at.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useExerciseClients, useExercisePayments } from '../lib/exerciseData';
import { useEditMode } from '../components/AppShell';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { AddMemberModal } from '../components/AddMemberModal';
import { EditMemberModal } from '../components/EditMemberModal';
import {
  E,
  readBalance,
  readGroup,
  readTotalClasses,
  readTotalPaid,
  uniqueGroups,
  clientInGroup,
  shortDate,
  formatBalance,
} from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, btnSm } from './DashboardPage';

type SortKey = 'name' | 'balance';
type BalFilter = '' | 'owes' | 'credit' | 'even';

export function MembersPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: payments = [] } = useExercisePayments();
  const [editMode] = useEditMode();
  const [q, setQ] = useState('');
  const [balFilter, setBalFilter] = useState<BalFilter>('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [payingClientId, setPayingClientId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => uniqueGroups(clients), [clients]);

  const lastPayByClient = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of payments) {
      const prev = m.get(p.client_id);
      if (!prev || new Date(p.paid_at) > new Date(prev)) m.set(p.client_id, p.paid_at);
    }
    return m;
  }, [payments]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = clients.filter((c) => c.status === 'active');
    if (needle) {
      r = r.filter(
        (c) =>
          c.full_name.toLowerCase().includes(needle) ||
          readGroup(c).toLowerCase().includes(needle),
      );
    }
    if (groupFilter) {
      r = r.filter((c) => clientInGroup(c, groupFilter));
    }
    if (balFilter === 'owes') r = r.filter((c) => readBalance(c) > 0);
    if (balFilter === 'credit') r = r.filter((c) => readBalance(c) < 0);
    if (balFilter === 'even') r = r.filter((c) => readBalance(c) === 0);

    r = r.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.full_name.localeCompare(b.full_name);
      else cmp = readBalance(a) - readBalance(b);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [clients, q, balFilter, groupFilter, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('asc');
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 13,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search name or group…"
          style={{
            flex: 1,
            minWidth: 170,
            padding: '9px 12px',
            border: '1px solid #ccc',
            borderRadius: 8,
            fontSize: '0.88rem',
            outline: 'none',
            fontFamily: 'Arial, sans-serif',
          }}
        />
        <select
          value={balFilter}
          onChange={(e) => setBalFilter(e.target.value as BalFilter)}
          style={selStyle}
        >
          <option value="">All Active Members</option>
          <option value="owes">Owes Money</option>
          <option value="credit">Has Credit</option>
          <option value="even">Even ($0)</option>
        </select>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={selStyle}>
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        {editMode && (
          <button onClick={() => setAdding(true)} style={btnSm(E.green)}>
            + Add Member
          </button>
        )}
      </div>

      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>
                <SortBtn active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')}>
                  Name
                </SortBtn>
              </Th>
              <Th>Group</Th>
              <Th>
                <SortBtn
                  active={sortKey === 'balance'}
                  dir={sortDir}
                  onClick={() => toggleSort('balance')}
                >
                  Balance
                </SortBtn>
              </Th>
              <Th>Classes</Th>
              <Th>Total Paid</Th>
              <Th>Last Payment</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td>
                  <span style={{ color: E.mute }}>No members match.</span>
                </Td>
                <Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td><Td>{''}</Td>
              </tr>
            ) : (
              rows.map((c) => {
                const bal = readBalance(c);
                const balDisp = formatBalance(bal);
                const balColor =
                  balDisp.tone === 'owe' ? E.redDeep : balDisp.tone === 'credit' ? E.greenDeep : E.mute;
                return (
                  <Tr key={c.id}>
                    <Td>
                      <Link
                        to={`/lookup?id=${c.id}`}
                        style={{ color: E.primaryDeep, fontWeight: 600, textDecoration: 'none' }}
                      >
                        {c.full_name}
                      </Link>
                    </Td>
                    <Td>{readGroup(c) || <span style={{ color: E.muteFaint }}>—</span>}</Td>
                    <Td>
                      <span style={{ color: balColor, fontWeight: 700 }}>{balDisp.label}</span>
                    </Td>
                    <Td>{readTotalClasses(c)}</Td>
                    <Td>${readTotalPaid(c).toFixed(0)}</Td>
                    <Td>{shortDate(lastPayByClient.get(c.id))}</Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editMode && (
                          <>
                            <button onClick={() => setPayingClientId(c.id)} style={btnSm(E.green)} title="Record payment">
                              💰
                            </button>
                            <button onClick={() => setEditingClientId(c.id)} style={btnSm(E.primary)} title="Edit">
                              ✎
                            </button>
                          </>
                        )}
                        <Link to={`/lookup?id=${c.id}`} style={{ ...btnSm(E.gray), textDecoration: 'none' }}>
                          View
                        </Link>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      <p style={{ fontSize: '0.78rem', color: E.muteFaint, marginTop: 10 }}>
        {rows.length} member{rows.length === 1 ? '' : 's'} shown
      </p>

      {payingClientId !== null && (
        <RecordPaymentModal
          initialClientId={payingClientId}
          onClose={() => setPayingClientId(null)}
        />
      )}
      {adding && <AddMemberModal onClose={() => setAdding(false)} />}
      {editingClientId && (() => {
        const c = clients.find((x) => x.id === editingClientId);
        if (!c) return null;
        return (
          <EditMemberModal
            client={c}
            onClose={() => setEditingClientId(null)}
          />
        );
      })()}
    </div>
  );
}

const selStyle: React.CSSProperties = {
  padding: '9px 10px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.86rem',
  background: '#fff',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif',
};

function SortBtn({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 'asc' | 'desc';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#fff',
        fontSize: 'inherit',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 700,
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        padding: 0,
      }}
    >
      {children} {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </button>
  );
}
