// Record money received. A payment lands on one kid's row; sibling
// balances add up per family, so paying "for the family" on any one
// kid works out the same.

import { useMemo, useState } from 'react';
import type { Client } from '../../lib/database.types';
import { api } from '../../lib/api';
import { readBalance, readFamilySlug, familyLabel, readWeeklyRate, formatMoney, readParent } from '../theme';
import { notify } from '../lib/notice';
import { useRecordPayment, useKids, usePayments } from '../lib/data';
import { useBabysittingConfig, appendLog } from '../lib/config';
import { useDemo } from '../demo/flag';
import { Modal, Field, inputStyle, Btn, Chip } from './ui';

export function PaymentModal({
  kid,
  onClose,
}: {
  kid: Client | null; // preselected kid, or null = pick one
  onClose: () => void;
}) {
  const { data: kids } = useKids();
  const { data: recentPayments } = usePayments();
  const record = useRecordPayment();
  const cfg = useBabysittingConfig();
  const demo = useDemo();

  const active = useMemo(
    () => (kids ?? []).filter((k) => k.status !== 'archived'),
    [kids],
  );
  const [kidId, setKidId] = useState(kid?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const methods = cfg.data?.settings.paymentMethods ?? ['cash', 'check', 'zelle', 'venmo', 'other'];
  const [method, setMethod] = useState<string>('cash');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const selected = active.find((k) => k.id === kidId) ?? null;
  const balance = selected ? readBalance(selected) : 0;

  async function save() {
    const amt = parseFloat(amount);
    if (!selected) {
      setErr('Pick a kid.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr('Enter an amount above zero.');
      return;
    }
    // Typo guards (mom-app classics): the extra-zero mistake and the
    // accidental double entry. Both just ask — never block.
    const weekly = readWeeklyRate(selected) || 150;
    if (amt >= Math.max(1000, weekly * 20)) {
      if (!window.confirm(`${formatMoney(amt)} is a very large payment — is the amount correct?`)) return;
    }
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const dup = (recentPayments ?? []).find(
      (p) =>
        p.client_id === selected.id &&
        Math.abs(Number(p.amount) - amt) < 0.005 &&
        new Date(p.created_at ?? p.paid_at).getTime() > fiveMinAgo,
    );
    if (dup && !window.confirm(`You already recorded ${formatMoney(amt)} for ${selected.full_name} a few minutes ago. Record it again?`)) {
      return;
    }
    setErr('');
    try {
      await record.mutateAsync({
        client_id: selected.id,
        amount: amt,
        paid_at: new Date(date + 'T12:00:00').toISOString(),
        method,
        description: note.trim() || 'Babysitting payment',
        currentTags: selected.tags ?? [],
      });
      if (cfg.data) {
        cfg.save.mutate(
          appendLog(
            cfg.data,
            'payment',
            `Payment ${formatMoney(amt)} — ${selected.full_name}`,
            method,
          ),
        );
        // Thank-you receipt to the parent. Still never blocks the payment —
        // the modal closes first — but the outcome lands as one line at the
        // bottom of the screen, because "did the parent get a receipt?" is
        // a question she'll otherwise be asked and unable to answer.
        if (cfg.data.settings.receipts.enabled && !demo) {
          const who = readParent(selected) || selected.full_name.split(' ')[0] + "'s parent";
          void api<{ sent: boolean; channel?: string | null; reason?: string }>(
            '/reminders/payment-receipt',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ client_id: selected.id, amount: amt }),
            },
          )
            .then((r) => {
              if (r.sent) {
                notify(`Receipt ${r.channel === 'sms' ? 'texted' : 'emailed'} to ${who}.`, 'good');
              } else if (r.reason && !/receipts off/i.test(r.reason)) {
                notify(`Payment saved, but no receipt went to ${who} — ${r.reason}`, 'bad');
              }
            })
            .catch(() => notify(`Payment saved, but the receipt to ${who} didn't send.`, 'bad'));
        }
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record the payment.');
    }
  }

  return (
    <Modal title="Record a payment" onClose={onClose}>
      <Field label="Kid">
        <select style={inputStyle} value={kidId} onChange={(e) => setKidId(e.target.value)}>
          <option value="">Pick a kid…</option>
          {active.map((k) => {
            const fam = readFamilySlug(k);
            return (
              <option key={k.id} value={k.id}>
                {k.full_name}
                {fam ? ` — ${familyLabel(fam)}` : ''}
              </option>
            );
          })}
        </select>
      </Field>
      {selected && (
        <div style={{ margin: '-6px 0 12px' }}>
          <Chip tone={balance > 0 ? 'red' : 'green'}>
            {balance > 0 ? `Currently owes ${formatMoney(balance)}` : 'All paid up'}
          </Chip>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
        <Field label="Amount ($)">
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </Field>
        <Field label="Date">
          <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="How they paid">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: 999,
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: method === m ? 'var(--tp-accent, #4f9d94)' : '#f2ede4',
                color: method === m ? '#fff' : '#6b6058',
                textTransform: 'capitalize',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Note (optional)">
        <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. for last two weeks" />
      </Field>
      {err && <Chip tone="red" style={{ marginBottom: 12 }}>{err}</Chip>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={record.isPending}>
          {record.isPending ? 'Saving…' : 'Record payment'}
        </Btn>
      </div>
    </Modal>
  );
}
