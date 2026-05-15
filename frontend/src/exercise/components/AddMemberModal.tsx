// Add-member modal. Name, group(s), rate, optional phone, and a
// starting balance. Saves to clients table with tags = group/rate/etc.

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUpsertClient } from '../lib/exerciseData';
import { E, WEEKDAY_GROUPS } from '../theme';

export function AddMemberModal({ onClose }: { onClose: () => void }) {
  const upsert = useUpsertClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('15');
  const [days, setDays] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function submit() {
    setErr(null);
    if (!name.trim()) return setErr('Name is required.');
    const r = parseFloat(rate);
    if (!Number.isFinite(r) || r < 0) return setErr('Rate must be a number.');
    const tags: string[] = [];
    if (days.length) {
      tags.push('group:' + days.map((d) => d.toLowerCase()).join('-'));
    }
    if (r > 0) tags.push(`rate:${Math.round(r)}`);
    tags.push('startdate:' + new Date().toISOString().slice(0, 10));
    tags.push('totalclasses:0', 'totalowed:0', 'totalpaid:0', 'balance:0');
    try {
      await upsert.mutateAsync({
        full_name: name.trim(),
        phone: phone.trim() || null,
        tags,
        status: 'active',
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: E.primaryDeep, margin: 0 }}>
            + Add Member
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara Goldberg" style={inp} autoFocus />
          </Field>
          <Field label="Class days (pick one or more)">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEKDAY_GROUPS.map((d) => {
                const on = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 20,
                      border: `1px solid ${on ? E.primary : '#ccc'}`,
                      background: on ? E.primary : '#fff',
                      color: on ? '#fff' : E.ink,
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Rate per class ($)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              style={inp}
            />
          </Field>
          <Field label="Phone (optional)">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-0100" style={inp} />
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
            <button
              onClick={submit}
              disabled={upsert.isPending}
              style={{
                background: E.green,
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: upsert.isPending ? 0.6 : 1,
              }}
            >
              {upsert.isPending ? 'Saving…' : '✓ Save member'}
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
  padding: 24,
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: '0.75rem',
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
