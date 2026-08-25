// Flexible billing — the heart of "she charges however she charges":
//   · Week   — each selected kid's flat weekly rate
//   · Hours  — hours × each kid's hourly rate
//   · Custom — a one-off amount (positive = charge, negative = credit)
// Works on one kid or a whole family at once, with a per-kid preview
// and editable amounts before anything is saved.

import { useMemo, useState } from 'react';
import type { Client } from '../../lib/database.types';
import {
  B,
  readWeeklyRate,
  readHourlyRate,
  readFamilySlug,
  formatMoney,
} from '../theme';
import { useAddCharge } from '../lib/data';
import { useBabysittingConfig, appendCharge, appendLog, type BabysittingConfig } from '../lib/config';
import { Modal, Field, inputStyle, Btn, Chip, Avatar } from './ui';

type Kind = 'week' | 'hours' | 'custom';

export function ChargeModal({
  kids,
  title,
  onClose,
}: {
  kids: Client[]; // the kid(s) being billed — one kid or a family
  title?: string;
  onClose: () => void;
}) {
  const addCharge = useAddCharge();
  const cfg = useBabysittingConfig();

  const [kind, setKind] = useState<Kind>('week');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const fd = cfg.data?.settings.familyDiscount;
  const suggested = useMemo(() => {
    const h = parseFloat(hours) || 0;
    const map: Record<string, number> = {};
    kids.forEach((k, i) => {
      if (kind === 'week') {
        let amt = readWeeklyRate(k);
        // Sibling discount: every kid after the first in a family bill.
        if (fd?.enabled && i > 0 && kids.length > 1) {
          amt = fd.type === 'percent' ? amt * (1 - fd.value / 100) : Math.max(0, amt - fd.value);
        }
        map[k.id] = Math.round(amt * 100) / 100;
      } else if (kind === 'hours') map[k.id] = Math.round(h * readHourlyRate(k) * 100) / 100;
      else map[k.id] = 0;
    });
    return map;
  }, [kids, kind, hours, fd]);

  function amountFor(k: Client): number {
    const o = overrides[k.id];
    if (o !== undefined && o !== '') {
      const v = parseFloat(o);
      return Number.isFinite(v) ? v : 0;
    }
    return suggested[k.id] ?? 0;
  }

  const total = Math.round(kids.reduce((s, k) => s + amountFor(k), 0) * 100) / 100;

  async function save() {
    const rows = kids
      .map((k) => ({ kid: k, amount: Math.round(amountFor(k) * 100) / 100 }))
      .filter((r) => r.amount !== 0);
    if (!rows.length) {
      setErr('Nothing to bill — every amount is zero.');
      return;
    }
    setErr('');
    setSaving(true);
    try {
      let nextCfg: BabysittingConfig | null = cfg.data ?? null;
      for (const r of rows) {
        await addCharge.mutateAsync({
          client_id: r.kid.id,
          amount: r.amount,
          currentTags: r.kid.tags ?? [],
        });
        if (nextCfg) {
          nextCfg = appendCharge(nextCfg, {
            clientId: r.kid.id,
            kidName: r.kid.full_name,
            familySlug: readFamilySlug(r.kid),
            amount: r.amount,
            kind: kind === 'custom' && r.amount < 0 ? 'adjustment' : kind,
            hours: kind === 'hours' ? parseFloat(hours) || undefined : undefined,
            note: note.trim() || undefined,
          });
        }
      }
      if (nextCfg) {
        nextCfg = appendLog(
          nextCfg,
          'charge',
          `Billed ${formatMoney(total)} (${rows.length} kid${rows.length > 1 ? 's' : ''})`,
          note.trim() || undefined,
        );
        cfg.save.mutate(nextCfg);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save the charge.');
      setSaving(false);
    }
  }

  const kindBtn = (k: Kind, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      style={{
        flex: 1,
        border: kind === k ? `2px solid ${B.primary}` : `1.5px solid ${B.rule}`,
        background: kind === k ? B.primarySoft : '#fffdf9',
        color: kind === k ? B.primaryDeep : B.inkSoft,
        borderRadius: B.radiusSm,
        padding: '10px 8px',
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: '0.86rem', fontFamily: B.fontDisplay }}>{label}</div>
      <div style={{ fontSize: '0.68rem', marginTop: 2, opacity: 0.8 }}>{hint}</div>
    </button>
  );

  return (
    <Modal title={title ?? 'Add to the bill'} onClose={onClose} width={520}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {kindBtn('week', 'Week', 'flat weekly rate')}
        {kindBtn('hours', 'Hours', 'hours × hourly rate')}
        {kindBtn('custom', 'Custom', 'any amount or credit')}
      </div>

      {kind === 'hours' && (
        <Field label="Hours">
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 6"
            autoFocus
          />
        </Field>
      )}

      <div
        style={{
          border: `1.5px solid ${B.rule}`,
          borderRadius: B.radiusSm,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        {kids.map((k, i) => (
          <div
            key={k.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderTop: i ? `1px solid ${B.rule}` : 'none',
              background: i % 2 ? B.rowAlt : 'transparent',
            }}
          >
            <Avatar name={k.full_name} size={30} />
            <div style={{ flex: 1, fontWeight: 700, fontSize: '0.88rem' }}>{k.full_name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: B.mute, fontSize: '0.8rem' }}>$</span>
              <input
                style={{ ...inputStyle, width: 90, padding: '7px 10px', textAlign: 'right' }}
                type="number"
                step="0.01"
                value={overrides[k.id] ?? (suggested[k.id] ? String(suggested[k.id]) : '')}
                onChange={(e) => setOverrides((p) => ({ ...p, [k.id]: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: B.butterSoft,
            fontWeight: 800,
            fontSize: '0.9rem',
          }}
        >
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      <Field label="Note (optional)">
        <input
          style={inputStyle}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={kind === 'custom' ? 'e.g. late pickup / sibling credit' : 'e.g. week of Aug 24'}
        />
      </Field>

      {kind === 'week' && fd?.enabled && kids.length > 1 && (
        <div style={{ margin: '-4px 0 12px' }}>
          <Chip tone="accent">Sibling discount applied: {fd.type === 'percent' ? `${fd.value}% off` : `$${fd.value} off`} each kid after the first.</Chip>
        </div>
      )}
      {kind === 'custom' && (
        <div style={{ margin: '-4px 0 12px' }}>
          <Chip tone="butter">Tip: a negative amount gives the family a credit.</Chip>
        </div>
      )}
      {err && <Chip tone="red" style={{ marginBottom: 12 }}>{err}</Chip>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? 'Billing…' : `Bill ${formatMoney(total)}`}
        </Btn>
      </div>
    </Modal>
  );
}
