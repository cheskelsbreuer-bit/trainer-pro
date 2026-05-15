// Paused — explicit pause records on top + status='paused' members below.
// In edit mode: "+ Add pause" button at the top, "End pause" per row
// (flips client back to active AND marks the pause record as ended).

import { useMemo, useState } from 'react';
import {
  useExerciseClients,
  useSetClientStatus,
} from '../lib/exerciseData';
import { useExerciseConfig, appendLog } from '../lib/exerciseConfig';
import { AddPauseModal } from '../components/AddPauseModal';
import { useEditMode } from '../components/AppShell';
import {
  E,
  readGroup,
  readPausedClasses,
  readStartDate,
  readEndDate,
  shortDate,
} from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, btnSm, SectionHead } from './DashboardPage';

export function PausedPage() {
  const { data: clients = [] } = useExerciseClients();
  const { data: cfg, save: saveCfg } = useExerciseConfig();
  const setStatus = useSetClientStatus();
  const [editMode] = useEditMode();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const explicitPauses = useMemo(
    () => (cfg?.pauses ?? []).filter((p) => p.stillPaused),
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
    const client = clients.find((c) => c.id === id);
    await setStatus.mutateAsync({ id, status: 'active' });
    if (cfg && client) {
      // Also end any matching explicit pause record(s) for this person
      const nameKey = client.full_name.trim().toLowerCase();
      const nextPauses = cfg.pauses.map((p) =>
        p.name.trim().toLowerCase() === nameKey && p.stillPaused
          ? { ...p, stillPaused: false, toDate: new Date().toISOString().slice(0, 10) }
          : p,
      );
      saveCfg.mutate(
        appendLog(
          { ...cfg, pauses: nextPauses },
          'pause',
          `Ended pause for ${client.full_name}`,
        ),
      );
    }
  }

  async function endExplicitPause(pauseId: string) {
    if (!cfg) return;
    const pause = cfg.pauses.find((p) => p.id === pauseId);
    if (!pause) return;
    if (!confirm(`Mark ${pause.name} as returned?`)) return;
    // Flip matching client (by name) back to active if currently paused
    const match = clients.find(
      (c) => c.full_name.trim().toLowerCase() === pause.name.trim().toLowerCase(),
    );
    if (match && match.status === 'paused') {
      await setStatus.mutateAsync({ id: match.id, status: 'active' });
    }
    const nextPauses = cfg.pauses.map((p) =>
      p.id === pauseId
        ? { ...p, stillPaused: false, toDate: new Date().toISOString().slice(0, 10) }
        : p,
    );
    saveCfg.mutate(
      appendLog(
        { ...cfg, pauses: nextPauses },
        'pause',
        `Ended pause for ${pause.name}`,
      ),
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
        ⏸ Members currently on a break. Explicit pause records (with from-dates) appear up top;
        members marked paused without an explicit record below.
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
        {editMode && (
          <button onClick={() => setAdding(true)} style={btnSm(E.green)}>
            + Add pause
          </button>
        )}
      </div>

      {/* Section 1: explicit pause records */}
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
                  {editMode && <Th>Action</Th>}
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
                        <strong style={{ color: E.orangeDeep }}>{p.classesPaused}</strong>
                      </Td>
                      {editMode && (
                        <Td>
                          <button
                            onClick={() => endExplicitPause(p.id)}
                            style={btnSm(E.green)}
                          >
                            ✓ End pause
                          </button>
                        </Td>
                      )}
                    </Tr>
                  ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}

      {/* Section 2: status='paused' clients */}
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

      {adding && <AddPauseModal onClose={() => setAdding(false)} />}
    </div>
  );
}
