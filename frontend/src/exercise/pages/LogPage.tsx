// Activity log — recent things that happened on this account.
// Stored under trainers.public_profile.exercise.log (capped at 200).

import { useState, useMemo } from 'react';
import { useExerciseConfig, type LogEntry } from '../lib/exerciseConfig';
import { E } from '../theme';
import { TableWrap, Th, Td, Tr, tableStyles, SectionHead } from './DashboardPage';

const CAT_COLORS: Record<LogEntry['category'], string> = {
  payment: '#27ae60',
  member: '#2d6a9f',
  pause: '#e67e22',
  archive: '#7f8c8d',
  note: '#7c3aed',
  settings: '#1a3a5c',
  misc: '#95a5a6',
};
const CAT_ICONS: Record<LogEntry['category'], string> = {
  payment: '💰',
  member: '👥',
  pause: '⏸',
  archive: '🗃',
  note: '📝',
  settings: '⚙',
  misc: '•',
};
const CAT_LABELS: Record<LogEntry['category'], string> = {
  payment: 'Payments',
  member: 'Members',
  pause: 'Pause/return',
  archive: 'Archive',
  note: 'Notes',
  settings: 'Settings',
  misc: 'Other',
};

export function LogPage() {
  const { data: cfg } = useExerciseConfig();
  const [filter, setFilter] = useState<LogEntry['category'] | ''>('');

  const log = cfg?.log ?? [];

  const filtered = useMemo(
    () => (filter ? log.filter((e) => e.category === filter) : log),
    [log, filter],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of log) m[e.category] = (m[e.category] ?? 0) + 1;
    return m;
  }, [log]);

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
        📜 Activity history — the last 200 things that happened on this account.
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <Chip label={`All (${log.length})`} active={!filter} onClick={() => setFilter('')} />
        {(Object.keys(CAT_LABELS) as LogEntry['category'][]).map((cat) => (
          <Chip
            key={cat}
            color={CAT_COLORS[cat]}
            label={`${CAT_ICONS[cat]} ${CAT_LABELS[cat]} (${counts[cat] ?? 0})`}
            active={filter === cat}
            onClick={() => setFilter(cat)}
          />
        ))}
      </div>

      <SectionHead>{filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}</SectionHead>
      <TableWrap>
        <table style={tableStyles}>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Category</Th>
              <Th>What happened</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 14, textAlign: 'center', color: E.mute }}>
                  Nothing logged yet. Actions you take (record a payment, add a member, edit a note) will show here.
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <Tr key={e.id}>
                  <Td style={{ whiteSpace: 'nowrap', color: E.mute }}>{when(e.ts)}</Td>
                  <Td>
                    <span
                      style={{
                        background: CAT_COLORS[e.category] + '22',
                        color: CAT_COLORS[e.category],
                        padding: '2px 9px',
                        borderRadius: 12,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      {CAT_ICONS[e.category]} {CAT_LABELS[e.category]}
                    </span>
                  </Td>
                  <Td>{e.action}</Td>
                  <Td style={{ color: E.mute, fontSize: '0.83rem' }}>{e.details ?? ''}</Td>
                </Tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  const bg = active ? (color ?? E.primary) : '#fff';
  return (
    <button
      onClick={onClick}
      style={{
        background: bg,
        color: active ? '#fff' : E.ink,
        border: `1px solid ${active ? bg : E.rule}`,
        padding: '5px 11px',
        borderRadius: 20,
        fontSize: '0.81rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {label}
    </button>
  );
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
