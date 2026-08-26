// Shared money widgets — used by the Money screen and the client
// profile: pack selling, owed-session rows, and the little chips.

import { useMemo, useState } from 'react';
import type { Client, Trainer, PaymentMethod } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, formatMoney, shortDate } from '../theme';
import { useSellPack, useMarkSessionPaid, type OwedSession } from '../lib/money';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'venmo', label: 'Venmo' },
  { key: 'zelle', label: 'Zelle' },
  { key: 'other', label: 'Other' },
];

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
      {children}
    </div>
  );
}

export function Chip({ onClick, active, children, disabled }: { onClick: () => void; active?: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: active ? 'none' : `1.5px solid ${F.edge}`, cursor: 'pointer', borderRadius: RADII.pill,
        padding: '9px 14px', minHeight: 38, background: active ? F.ink : 'transparent',
        color: active ? F.bg : F.inkSoft, fontWeight: 700, fontSize: 13, fontFamily: TYPE.body,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Sell-a-pack inline form ───────────────────────────────────────────
export function SellPackForm({ client, trainer, onDone }: { client: Client; trainer: Trainer | undefined; onDone: () => void }) {
  const sell = useSellPack();
  const presets = useMemo(() => {
    const own = (trainer?.default_packages ?? []).filter((p) => p.sessions >= 1 && p.price > 0);
    if (own.length) return own.map((p) => ({ name: p.name, sessions: p.sessions, price: p.price }));
    const rate = client.rate_per_session ?? 0;
    return [5, 10, 20].map((n) => ({ name: `${n}-pack`, sessions: n, price: rate ? rate * n : 0 }));
  }, [trainer, client]);

  const [sessions, setSessions] = useState<number>(presets[0]?.sessions ?? 10);
  const [label, setLabel] = useState<string>(presets[0]?.name ?? '10-pack');
  const [amount, setAmount] = useState<string>(presets[0]?.price ? String(presets[0].price) : '');
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const amt = Number(amount);
  const valid = sessions > 0 && amt > 0;

  return (
    <div style={{ background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: RADII.sm, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {presets.map((p) => (
          <Chip
            key={p.name}
            active={label === p.name}
            onClick={() => { setLabel(p.name); setSessions(p.sessions); if (p.price) setAmount(String(p.price)); }}
          >
            {p.name}{p.price ? ` · ${formatMoney(p.price)}` : ''}
          </Chip>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10.5, color: F.mute, fontWeight: 600, paddingLeft: 2 }}>sessions</span>
          <input
            value={sessions || ''} inputMode="numeric"
            onChange={(e) => { const n = Number(e.target.value) || 0; setSessions(n); setLabel(n > 1 ? `${n}-pack` : 'single'); }}
            style={{ height: 40, background: F.card, border: `1px solid ${F.edge}`, borderRadius: 11, color: F.ink, padding: '0 11px', fontSize: 15, fontFamily: TYPE.body, outline: 'none', width: '100%', ...num }}
          />
        </label>
        <label style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10.5, color: F.mute, fontWeight: 600, paddingLeft: 2 }}>paid $</span>
          <input
            value={amount} inputMode="decimal" placeholder="650"
            onChange={(e) => setAmount(e.target.value)}
            style={{ height: 40, background: F.card, border: `1px solid ${F.edge}`, borderRadius: 11, color: F.ink, padding: '0 11px', fontSize: 15, fontFamily: TYPE.body, outline: 'none', width: '100%', ...num }}
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {METHODS.map((m) => (
          <Chip key={m.key} active={method === m.key} onClick={() => setMethod(m.key)}>{m.label}</Chip>
        ))}
      </div>
      {sell.isError && <div style={{ fontSize: 13, color: F.bad }}>Couldn't save — try again.</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onDone} style={{ flex: 1, height: HIT, borderRadius: 12, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: TYPE.body }}>Cancel</button>
        <button
          disabled={!valid || sell.isPending}
          onClick={() => {
            void sell.mutateAsync({ client, sessions, amount: amt, method, label }).then(onDone);
          }}
          style={{ flex: 1.6, height: HIT, borderRadius: 12, border: 'none', background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: TYPE.body, opacity: !valid || sell.isPending ? 0.5 : 1 }}
        >
          {sell.isPending ? 'Saving…' : `Sold — add ${sessions} session${sessions === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}

// ── One owed session row ──────────────────────────────────────────────
export function OwedRow({ s }: { s: OwedSession }) {
  const mark = useMarkSessionPaid();
  const [picking, setPicking] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 34 }}>
      <span style={{ fontSize: 13, color: F.inkSoft }}>{shortDate(s.starts_at)}</span>
      <span style={{ ...num, fontSize: 13.5, fontWeight: 700 }}>{formatMoney(Number(s.price))}</span>
      <span style={{ marginLeft: 'auto' }}></span>
      {picking ? (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {METHODS.map((m) => (
            <button
              key={m.key}
              disabled={mark.isPending}
              onClick={() => { void mark.mutateAsync({ session: s, method: m.key }); }}
              style={{ border: 'none', cursor: 'pointer', borderRadius: RADII.pill, padding: '7px 11px', background: F.goodSoft, color: F.goodSoftInk, fontWeight: 700, fontSize: 12, fontFamily: TYPE.body }}
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          style={{ border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, borderRadius: RADII.pill, padding: '7px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: TYPE.body }}
        >
          Got paid
        </button>
      )}
    </div>
  );
}
