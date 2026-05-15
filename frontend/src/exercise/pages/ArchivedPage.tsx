// Former members. Their record stays so balances/history are preserved.
// "Restore" button in Edit Mode flips them back to active.

import { useMemo, useState } from 'react';
import { useExerciseClients, useSetClientStatus } from '../lib/exerciseData';
import { useEditMode } from '../components/AppShell';
import { E, readGroup, readBalance, formatBalance, shortDate } from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, btnSm } from './DashboardPage';

export function ArchivedPage() {
  const { data: clients = [] } = useExerciseClients();
  const setStatus = useSetClientStatus();
  const [editMode] = useEditMode();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients
      .filter((c) => c.status === 'archived')
      .filter((c) => !needle || c.full_name.toLowerCase().includes(needle))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [clients, q]);

  async function restore(id: string) {
    if (!confirm('Restore this member to active?')) return;
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
        🗃 Former members — history is preserved. Restore anytime in Edit Mode.
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search former members…"
        style={{
          width: '100%',
          maxWidth: 360,
          padding: '9px 12px',
          border: '1px solid #ccc',
          borderRadius: 8,
          fontSize: '0.88rem',
          outline: 'none',
          fontFamily: 'Arial, sans-serif',
          marginBottom: 13,
        }}
      />

      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Group</Th>
              <Th>Balance at archive</Th>
              <Th>Updated</Th>
              {editMode && <Th>Restore</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={editMode ? 5 : 4} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  No former members.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const bal = formatBalance(readBalance(c));
                const color =
                  bal.tone === 'owe' ? E.redDeep : bal.tone === 'credit' ? E.greenDeep : E.mute;
                return (
                  <Tr key={c.id}>
                    <Td>
                      <strong style={{ color: E.primaryDeep }}>{c.full_name}</strong>
                    </Td>
                    <Td>{readGroup(c) || '—'}</Td>
                    <Td>
                      <span style={{ color, fontWeight: 700 }}>{bal.label}</span>
                    </Td>
                    <Td>{shortDate(c.updated_at)}</Td>
                    {editMode && (
                      <Td>
                        <button onClick={() => restore(c.id)} style={btnSm(E.green)}>
                          ↻ Restore
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
    </div>
  );
}
