// Paused members — the people who took a break. From-To dates and a
// "mark returned" button (edit mode) that flips them back to active.

import { useMemo, useState } from 'react';
import {
  useExerciseClients,
  useSetClientStatus,
} from '../lib/exerciseData';
import { useEditMode } from '../components/AppShell';
import { E, readGroup, readPausedClasses, readStartDate, readEndDate } from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, btnSm } from './DashboardPage';

export function PausedPage() {
  const { data: clients = [] } = useExerciseClients();
  const setStatus = useSetClientStatus();
  const [editMode] = useEditMode();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients
      .filter((c) => c.status === 'paused')
      .filter((c) => !needle || c.full_name.toLowerCase().includes(needle))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [clients, q]);

  async function markReturned(id: string) {
    if (!confirm('Mark this member as returned (status: active)?')) return;
    await setStatus.mutateAsync({ id, status: 'active' });
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
        ⏸ Members currently on a break. Use "Mark returned" in Edit Mode when they come back.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 13 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search name…"
          style={{
            flex: 1,
            padding: '9px 12px',
            border: '1px solid #ccc',
            borderRadius: 8,
            fontSize: '0.88rem',
            outline: 'none',
            fontFamily: 'Arial, sans-serif',
          }}
        />
      </div>

      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Group</Th>
              <Th>Joined</Th>
              <Th>Last Class</Th>
              <Th>Paused Classes</Th>
              {editMode && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={editMode ? 6 : 5} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No paused members.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <strong style={{ color: E.primaryDeep }}>{c.full_name}</strong>
                  </Td>
                  <Td>{readGroup(c) || '—'}</Td>
                  <Td>{readStartDate(c) ?? '—'}</Td>
                  <Td>{readEndDate(c) ?? '—'}</Td>
                  <Td>{readPausedClasses(c)}</Td>
                  {editMode && (
                    <Td>
                      <button onClick={() => markReturned(c.id)} style={btnSm(E.green)}>
                        ✓ Mark returned
                      </button>
                    </Td>
                  )}
                </Tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
