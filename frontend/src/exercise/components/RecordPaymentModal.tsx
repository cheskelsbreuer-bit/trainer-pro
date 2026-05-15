// Record-payment modal. Two-step quick form: pick member, enter amount.
// Today's date is pre-filled, method defaults to none. Closes on success.

import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { useExerciseClients, useRecordPayment } from '../lib/exerciseData';
import { useExerciseConfig, appendLog } from '../lib/exerciseConfig';
import { E, readGroup } from '../theme';

const METHODS = ['cash', 'check', 'venmo', 'zelle', 'other'] as const;

export function RecordPaymentModal({
  initialClientId,
  onClose,
}: {
  initialClientId?: string;
  onClose: () => void;
}) {
  const { data: clients = [] } = useExerciseClients();
  const { data: cfg, save: saveCfg } = useExerciseConfig();
  const record = useRecordPayment();
  const [clientId, setClientId] = useState<string>(initialClientId ?? '');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeClients = useMemo(
    () =>
      clients
        .filter((c) => c.status === 'active' || c.status === 'paused')
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const selected = clients.find((c) => c.id === clientId);

  async function submit() {
    setErr(null);
    if (!clientId) return setErr('Pick a member.');
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setErr('Enter a positive amount.');
    if (!date) return setErr('Pick a date.');
    if (!selected) return setErr('Member not found.');
    try {
      await record.mutateAsync({
        client_id: clientId,
        amount: amt,
        paid_at: new Date(date + 'T12:00:00Z').toISOString(),
        method: method || null,
        currentTags: selected.tags ?? [],
      });
      // Append to activity log (best-effort)
      if (cfg) {
        saveCfg.mutate(
          appendLog(
            cfg,
            'payment',
            `Recorded $${amt.toFixed(0)} from ${selected.full_name}`,
            method ? `method: ${method}` : undefined,
          ),
        );
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.52)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 20,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 13,
          padding: 24,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          margin: 'auto',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: E.primaryDeep, margin: 0 }}>
            💰 Record a Payment
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: E.muteFaint }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Member">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inp}>
              <option value="">— pick a member —</option>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} — {readGroup(c) || 'no group'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount ($)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 60"
              style={inp}
              autoFocus={!!clientId}
            />
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
          </Field>
          <Field label="Method (optional)">
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={inp}>
              <option value="">—</option>
              {METHODS.map((m) => (
                <option key={m} value={m} style={{ textTransform: 'capitalize' }}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
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

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={submit}
              disabled={record.isPending}
              style={{
                background: E.green,
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: record.isPending ? 0.6 : 1,
              }}
            >
              {record.isPending ? 'Recording…' : '✓ Record payment'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                color: E.mute,
                border: `1px solid ${E.rule}`,
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid #ccc`,
  borderRadius: 8,
  fontSize: '0.92rem',
  fontFamily: 'Arial, sans-serif',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: E.inkSoft, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
