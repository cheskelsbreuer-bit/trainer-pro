// Edit-member modal — change name, phone, group(s), rate, and the
// running balance number directly. Also lets you archive from inside.

import { useState, useEffect, useMemo } from 'react';
import { X, Trash2, Archive } from 'lucide-react';
import type { Client } from '../../lib/database.types';
import { useUpsertClient, useSetClientStatus } from '../lib/exerciseData';
import { useExerciseConfig, appendLog } from '../lib/exerciseConfig';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { E, WEEKDAY_GROUPS, readGroupSlug, readRate, readBalance } from '../theme';

export function EditMemberModal({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const upsert = useUpsertClient();
  const setStatus = useSetClientStatus();
  const { data: cfg, save: saveCfg } = useExerciseConfig();

  const [name, setName] = useState(client.full_name);
  const [phone, setPhone] = useState(client.phone ?? '');
  const [dob, setDob] = useState(client.date_of_birth ?? '');
  const [rate, setRate] = useState(String(readRate(client)));
  const [balance, setBalance] = useState(String(readBalance(client)));
  const [days, setDays] = useState<string[]>(() =>
    readGroupSlug(client)
      .split('-')
      .filter(Boolean)
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1)),
  );
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();

  // Pull current custom-field values + applied tags from client.tags
  // (we store them as `cf:<id>:<value>` and `mtag:<id>` respectively).
  const customValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const t of client.tags ?? []) {
      if (t.startsWith('cf:')) {
        const rest = t.slice(3);
        const colon = rest.indexOf(':');
        if (colon > 0) out[rest.slice(0, colon)] = rest.slice(colon + 1);
      }
    }
    return out;
  }, [client.tags]);
  const [cfVals, setCfVals] = useState<Record<string, string>>(customValues);
  useEffect(() => setCfVals(customValues), [customValues]);

  const appliedTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of client.tags ?? []) {
      if (t.startsWith('mtag:')) set.add(t.slice(5));
    }
    return set;
  }, [client.tags]);
  const [selTags, setSelTags] = useState<Set<string>>(appliedTags);
  useEffect(() => setSelTags(appliedTags), [appliedTags]);

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

  function buildTags(): string[] {
    const r = parseFloat(rate);
    const bal = parseFloat(balance);
    const out: string[] = [];
    // Keep ALL tags that aren't ones we manage, then re-add managed ones.
    const managedPrefixes = ['group:', 'rate:', 'balance:', 'cf:', 'mtag:'];
    for (const t of client.tags ?? []) {
      const handled = managedPrefixes.some((p) => t.startsWith(p));
      if (!handled) out.push(t);
    }
    if (days.length) out.push('group:' + days.map((d) => d.toLowerCase()).join('-'));
    if (Number.isFinite(r) && r > 0) out.push(`rate:${Math.round(r)}`);
    if (Number.isFinite(bal)) out.push(`balance:${Math.round(bal)}`);
    // Custom field values
    for (const [id, value] of Object.entries(cfVals)) {
      if (value && value.trim()) out.push(`cf:${id}:${value.trim()}`);
    }
    // Tag selections
    for (const id of selTags) out.push(`mtag:${id}`);
    return out;
  }

  async function save() {
    setErr(null);
    if (!name.trim()) {
      setErr('Name is required.');
      return;
    }
    try {
      // 1. Save the regular fields via the existing upsert hook
      await upsert.mutateAsync({
        id: client.id,
        full_name: name.trim(),
        phone: phone.trim() || null,
        tags: buildTags(),
      });
      // 2. Save the date_of_birth column separately
      //    (useUpsertClient doesn't currently surface it)
      if (dob !== (client.date_of_birth ?? '')) {
        await supabase
          .from('clients')
          .update({ date_of_birth: dob || null })
          .eq('id', client.id);
        qc.invalidateQueries({ queryKey: ['exercise-clients'] });
      }
      if (cfg) {
        saveCfg.mutate(
          appendLog(cfg, 'member', `Edited ${name.trim()}`),
        );
      }
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function archive() {
    if (!confirm(`Archive ${name}? They'll move to Former members but their history stays.`)) return;
    try {
      await setStatus.mutateAsync({ id: client.id, status: 'archived' });
      if (cfg) saveCfg.mutate(appendLog(cfg, 'archive', `Archived ${name}`));
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modalBody}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: E.primaryDeep, margin: 0 }}>
            ✎ Edit member
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} style={inp} autoFocus />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="optional" style={inp} />
          </Field>
          <Field label="Date of birth (optional)">
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inp} />
            <span style={{ fontSize: '0.74rem', color: E.muteFaint }}>
              Shows up on the dashboard during her birthday month.
            </span>
          </Field>
          <Field label="Class days">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEKDAY_GROUPS.map((d) => {
                const on = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    style={{
                      padding: '6px 13px',
                      borderRadius: 20,
                      border: `1px solid ${on ? E.primary : '#ccc'}`,
                      background: on ? E.primary : '#fff',
                      color: on ? '#fff' : E.ink,
                      fontWeight: 600,
                      fontSize: '0.83rem',
                      cursor: 'pointer',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Rate / class ($)">
              <input
                type="number"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                style={inp}
              />
            </Field>
            <Field label="Balance ($)">
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                style={inp}
              />
              <span style={{ fontSize: '0.75rem', color: E.muteFaint }}>
                Positive = owes. Negative = credit.
              </span>
            </Field>
          </div>

          {cfg && cfg.tags.length > 0 && (
            <Field label="Tags">
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {cfg.tags.map((t) => {
                  const on = selTags.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const n = new Set(selTags);
                        if (on) n.delete(t.id);
                        else n.add(t.id);
                        setSelTags(n);
                      }}
                      style={{
                        background: on ? t.color : t.color + '22',
                        color: on ? '#fff' : t.color,
                        border: `1px solid ${t.color}`,
                        borderRadius: 16,
                        padding: '4px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      {on ? '✓ ' : ''}{t.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {cfg && cfg.customFields.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: E.inkSoft,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  marginBottom: 6,
                }}
              >
                Custom fields
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cfg.customFields.map((f) => (
                  <Field key={f.id} label={f.label}>
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      value={cfVals[f.id] ?? ''}
                      onChange={(e) =>
                        setCfVals({ ...cfVals, [f.id]: e.target.value })
                      }
                      style={inp}
                    />
                  </Field>
                ))}
              </div>
            </div>
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
              }}
            >
              {err}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} disabled={upsert.isPending} style={btnPrimary}>
              {upsert.isPending ? 'Saving…' : '✓ Save changes'}
            </button>
            <button onClick={archive} style={btnArchive}>
              <Archive size={14} /> Archive
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
  padding: 24,
  width: '100%',
  maxWidth: 500,
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
const btnArchive: React.CSSProperties = {
  background: 'transparent',
  color: E.gray,
  border: `1px solid ${E.gray}`,
  padding: '10px 14px',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
const btnCancel: React.CSSProperties = {
  background: 'transparent',
  color: E.mute,
  border: `1px solid ${E.rule}`,
  padding: '10px 18px',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
  marginLeft: 'auto',
};
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <span
        style={{
          fontSize: '0.74rem',
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

// Suppress unused Trash2 import (kept for parity with original feature set)
void Trash2;
