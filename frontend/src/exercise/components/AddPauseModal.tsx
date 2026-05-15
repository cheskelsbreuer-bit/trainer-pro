// Add-pause modal — record that a member is starting a break from one
// of their classes. Adds a row to public_profile.exercise.pauses AND
// flips the member's status to "paused" so they leave the active roster.

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useExerciseClients, useSetClientStatus } from '../lib/exerciseData';
import {
  useExerciseConfig,
  appendLog,
  type PauseRecord,
} from '../lib/exerciseConfig';
import { E, uniqueGroups, readGroupSlug } from '../theme';

export function AddPauseModal({ onClose }: { onClose: () => void }) {
  const { data: clients = [] } = useExerciseClients();
  const { data: cfg, save: saveCfg } = useExerciseConfig();
  const setStatus = useSetClientStatus();

  const [clientId, setClientId] = useState('');
  const [group, setGroup] = useState('');
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);

  const groups = useMemo(() => uniqueGroups(clients), [clients]);

  // When member changes, default group to first of their classes
  useEffect(() => {
    if (!clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    const first = readGroupSlug(c).split('-').filter(Boolean)[0];
    if (first) setGroup(first.charAt(0).toUpperCase() + first.slice(1));
  }, [clientId, clients]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const eligible = useMemo(
    () =>
      clients
        .filter((c) => c.status === 'active')
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients],
  );

  async function submit() {
    setErr(null);
    if (!clientId) return setErr('Pick a member.');
    if (!group) return setErr('Pick the class they\'re pausing from.');
    if (!fromDate) return setErr('Pick the from-date.');
    const c = clients.find((x) => x.id === clientId);
    if (!c) return setErr('Member not found.');
    try {
      // Set client status to paused
      await setStatus.mutateAsync({ id: clientId, status: 'paused' });
      // Append pause record
      if (cfg) {
        const rec: PauseRecord = {
          id: `pa-${Date.now()}`,
          name: c.full_name,
          group,
          fromDate,
          toDate: null,
          classesPaused: 0,
          stillPaused: true,
        };
        saveCfg.mutate(
          appendLog(
            { ...cfg, pauses: [rec, ...cfg.pauses] },
            'pause',
            `Started pause for ${c.full_name} on ${group}`,
            `from ${fromDate}`,
          ),
        );
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: E.primaryDeep, margin: 0 }}>
            ⏸ Record a pause
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Member">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inp}>
              <option value="">— pick a member —</option>
              {eligible.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pausing which class">
            <select value={group} onChange={(e) => setGroup(e.target.value)} style={inp}>
              <option value="">— pick —</option>
              {groups.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="From date">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inp} />
          </Field>
          {err && (
            <div
              style={{
                background: '#fff3cd',
                color: '#856404',
                border: '1px solid #ffc107',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: '0.85rem',
              }}
            >
              {err}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={submit} style={btnPrimary} disabled={setStatus.isPending}>
              {setStatus.isPending ? 'Saving…' : '✓ Record pause'}
            </button>
            <button onClick={onClose} style={btnCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.52)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: 20,
  overflowY: 'auto',
};
const modalBody: React.CSSProperties = {
  background: '#fff',
  borderRadius: 13,
  padding: 22,
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
  margin: 'auto',
  fontFamily: 'Arial, sans-serif',
};
const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.4rem',
  cursor: 'pointer',
  color: '#aaa',
};
const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.92rem',
  fontFamily: 'Arial, sans-serif',
  outline: 'none',
};
const btnPrimary: React.CSSProperties = {
  background: E.primary,
  color: '#fff',
  border: 'none',
  padding: '10px 18px',
  borderRadius: 8,
  fontWeight: 700,
  cursor: 'pointer',
};
const btnCancel: React.CSSProperties = {
  background: 'transparent',
  color: E.mute,
  border: `1px solid ${E.rule}`,
  padding: '10px 18px',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#444',
          textTransform: 'uppercase',
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
