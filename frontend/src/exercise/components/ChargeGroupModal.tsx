// Bulk charge or credit a whole class. Mom uses this every week — she
// "charges" the entire Monday class (records a payment for each member
// at their per-class rate) in one click instead of recording 18 rows.

import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { Client } from '../../lib/database.types';
import { useExerciseClients, useRecordPayment } from '../lib/exerciseData';
import { useExerciseConfig, appendLog } from '../lib/exerciseConfig';
import { E, readRate, clientInGroup, formatMoney } from '../theme';

type Mode = 'charge' | 'credit';

export function ChargeGroupModal({
  group,
  mode,
  onClose,
}: {
  group: string;
  mode: Mode;
  onClose: () => void;
}) {
  const { data: clients = [] } = useExerciseClients();
  const { data: cfg, save: saveCfg } = useExerciseConfig();
  const record = useRecordPayment();

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const members = useMemo(
    () =>
      clients
        .filter((c) => c.status === 'active' && clientInGroup(c, group))
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients, group],
  );

  // Pre-select everyone the first time
  useEffect(() => {
    setSelected(new Set(members.map((m) => m.id)));
  }, [members]);

  function toggleAll() {
    setSelected(selected.size === members.length ? new Set() : new Set(members.map((m) => m.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const selectedMembers = members.filter((m) => selected.has(m.id));
  const total = selectedMembers.reduce((s, m) => s + readRate(m), 0);

  async function submit() {
    setErr(null);
    if (selectedMembers.length === 0) {
      setErr('Pick at least one member.');
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const isoDate = new Date(date + 'T12:00:00Z').toISOString();
      let done = 0;
      for (const m of selectedMembers) {
        const rate = readRate(m);
        const amount = mode === 'charge' ? rate : -rate;
        await record.mutateAsync({
          client_id: m.id,
          amount,
          paid_at: isoDate,
          method: method || null,
          currentTags: m.tags ?? [],
        });
        done += 1;
        setProgress(done);
      }
      if (cfg) {
        saveCfg.mutate(
          appendLog(
            cfg,
            'payment',
            `Bulk ${mode}: ${group} class · ${selectedMembers.length} members · ${formatMoney(total * (mode === 'charge' ? 1 : -1))}`,
            method ? `method: ${method}` : undefined,
          ),
        );
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'charge' ? '💰 Charge this class' : '↩ Credit this class';
  const verb = mode === 'charge' ? 'Charge' : 'Credit';
  const accent = mode === 'charge' ? E.green : E.orange;

  return (
    <div onClick={busy ? undefined : onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: E.primaryDeep, margin: 0 }}>
            {title} — {group}
          </h2>
          <button onClick={onClose} disabled={busy} style={closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.86rem', color: E.inkSoft, marginBottom: 12 }}>
          {verb} each selected member at <strong>their own per-class rate</strong> for one class
          on the date below.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <Field label="Class date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
          </Field>
          <Field label="Method (optional)">
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={inp}>
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            padding: '8px 12px',
            background: '#f5f8fc',
            borderRadius: 8,
            fontSize: '0.85rem',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.size === members.length && members.length > 0}
              onChange={toggleAll}
              disabled={busy}
            />
            <strong>{selected.size}/{members.length}</strong> selected
          </label>
          <span>
            Total {mode === 'charge' ? 'charged' : 'credited'}:{' '}
            <strong style={{ color: accent }}>{formatMoney(total)}</strong>
          </span>
        </div>

        <div
          style={{
            maxHeight: 280,
            overflowY: 'auto',
            border: `1px solid ${E.rule}`,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {members.length === 0 ? (
            <p style={{ padding: 14, textAlign: 'center', color: E.mute }}>
              No active members in {group}.
            </p>
          ) : (
            members.map((m) => (
              <label
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  borderBottom: `1px solid ${E.ruleSoft}`,
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggleOne(m.id)}
                    disabled={busy}
                  />
                  {m.full_name}
                </span>
                <span style={{ color: E.mute }}>${readRate(m).toFixed(0)}</span>
              </label>
            ))
          )}
        </div>

        {busy && (
          <p style={{ fontSize: '0.85rem', color: E.mute, marginBottom: 10 }}>
            Recording {progress}/{selectedMembers.length}…
          </p>
        )}
        {err && (
          <div
            style={{
              background: '#fff3cd',
              color: '#856404',
              border: '1px solid #ffc107',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '0.85rem',
              marginBottom: 10,
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={submit}
            disabled={busy || selectedMembers.length === 0}
            style={{
              background: accent,
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy || selectedMembers.length === 0 ? 0.6 : 1,
            }}
          >
            {busy ? `${verb}ing…` : `✓ ${verb} ${selectedMembers.length} member${selectedMembers.length === 1 ? '' : 's'}`}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              background: 'transparent',
              color: E.mute,
              border: `1px solid ${E.rule}`,
              padding: '10px 18px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
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
  maxWidth: 580,
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
  padding: '8px 11px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: '0.92rem',
  fontFamily: 'Arial, sans-serif',
  outline: 'none',
};
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130 }}>
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: E.inkSoft,
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

// Suppress unused Client import warning (kept for future expansion)
void undefined as unknown as Client;
