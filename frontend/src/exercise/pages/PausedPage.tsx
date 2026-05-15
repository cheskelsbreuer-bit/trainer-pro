// Paused — two sections:
//   1. Explicit pause records (with from-date + classes-paused count)
//      pulled from public_profile.exercise.pauses
//   2. Members whose status = 'paused' but with no explicit record

import { useMemo, useState } from 'react';
import {
  useExerciseClients,
  useSetClientStatus,
} from '../lib/exerciseData';
import { useExerciseConfig } from '../lib/exerciseConfig';
import { useEditMode } from '../components/AppShell';
import { E, readGroup, readPausedClasses, readStartDate, readEndDate, shortDate } from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, btnSm, SectionHead } from './DashboardPage';

export function PausedPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: cfg } = useExerciseConfig();
  const setStatus = useSetClientStatus();
  const [editMode] = useEditMode();
  const [q, setQ] = useState('');

  const explicitPauses = useMemo(
    () =>
      (cfg?.pauses ?? []).filter((p) => p.stillPaused),
    [cfg],
  );

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
        ⏸ Members currently on a break. The first section is explicit pause records (with start
        date); the second is members marked paused without a specific record.
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

      {/* ── Section 1: explicit pause records ────────────────────── */}
      {explicitPauses.length > 0 && (
        <>
          <SectionHead>📋 Pause records ({explicitPauses.length})</SectionHead>
          <TableWrap>
            <table style={tableStyles}>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Class</Th>
                  <Th>Paused since</Th>
                  <Th>Classes missed</Th>
                </tr>
              </thead>
              <tbody>
                {explicitPauses
                  .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
                  .map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <strong style={{ color: E.primaryDeep }}>{p.name}</strong>
                      </Td>
                      <Td>{p.group}</Td>
                      <Td>{shortDate(p.fromDate)}</Td>
                      <Td>
                        <strong style={{ color: E.orangeDeep }}>
                          {p.classesPaused}
                        </strong>
                      </Td>
                    </Tr>
                  ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}

      {/* ── Section 2: status=paused clients ─────────────────────── */}
      <SectionHead style={{ marginTop: explicitPauses.length > 0 ? 24 : 0 }}>
        ⏸ Members with paused status ({rows.length})
      </SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Group</Th>
              <Th>Joined</Th>
              <Th>Last class</Th>
              <Th>Paused classes</Th>
              {editMode && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={editMode ? 6 : 5}
                  style={{ padding: 14, textAlign: 'center', color: E.mute }}
                >
                  None.
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
