// 🩺 Check my numbers — the mom-app repair pattern, faithfully:
// recompute what's verifiable, SHOW the differences, fix only the rows
// she ticks. Never auto-fix. Also finds "ghost money": payments whose
// kid no longer exists in the app.

import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import { B, readTotalPaid, tagsWithMoney, formatMoney, shortDate } from '../theme';
import { useKids, usePayments, useSetKidTags, useDeleteGhostPayment } from '../lib/data';
import { useBabysittingConfig, appendLog } from '../lib/config';
import { Card, SectionTitle, Btn, Chip } from './ui';

interface Mismatch {
  kid: Client;
  recorded: number; // what the kid's card says was paid
  actual: number; // what the payment records add up to
}

export function HealthPanel() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { data: kids } = useKids();
  const { data: payments } = usePayments();
  const cfg = useBabysittingConfig();
  const setTags = useSetKidTags();
  const delGhost = useDeleteGhostPayment();
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [fixing, setFixing] = useState(false);

  const paidByKid = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments ?? []) {
      m.set(p.client_id, (m.get(p.client_id) ?? 0) + Number(p.amount));
    }
    return m;
  }, [payments]);

  const mismatches = useMemo<Mismatch[]>(() => {
    const out: Mismatch[] = [];
    for (const k of kids ?? []) {
      const recorded = readTotalPaid(k);
      const actual = Math.round((paidByKid.get(k.id) ?? 0) * 100) / 100;
      if (Math.abs(recorded - actual) > 0.005) out.push({ kid: k, recorded, actual });
    }
    return out.sort((a, b) => Math.abs(b.recorded - b.actual) - Math.abs(a.recorded - a.actual));
  }, [kids, paidByKid]);

  const ghosts = useMemo(() => {
    const ids = new Set((kids ?? []).map((k) => k.id));
    return (payments ?? []).filter((p) => !ids.has(p.client_id));
  }, [kids, payments]);

  const ghostTotal = Math.round(ghosts.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;

  async function fixTicked() {
    if (!ticked.size) return;
    setFixing(true);
    try {
      let fixed = 0;
      for (const m of mismatches) {
        if (!ticked.has(m.kid.id)) continue;
        await setTags.mutateAsync({
          id: m.kid.id,
          tags: tagsWithMoney(m.kid.tags ?? [], { totalPaid: m.actual }),
        });
        fixed += 1;
      }
      if (cfg.data && fixed) {
        cfg.save.mutate(appendLog(cfg.data, 'settings', `Repaired totals for ${fixed} kid${fixed === 1 ? '' : 's'}`));
      }
      setTicked(new Set());
    } finally {
      setFixing(false);
    }
  }

  function removeGhost(id: string, amount: number) {
    if (!window.confirm(`Remove this ${formatMoney(amount)} payment? Its kid is no longer in the app, so no balance changes — the record just goes away.`)) return;
    delGhost.mutate({ id });
    if (cfg.data) cfg.save.mutate(appendLog(cfg.data, 'settings', `Removed ghost payment ${formatMoney(amount)}`));
  }

  const healthy = mismatches.length === 0 && ghosts.length === 0;

  return (
    <Card style={{ borderLeft: `4px solid ${healthy ? B.green : B.butter}` }}>
      <SectionTitle>🩺 Check my numbers</SectionTitle>
      {healthy ? (
        <div style={{ color: B.green, fontWeight: 700, fontSize: '0.9rem' }}>
          ✓ Everything adds up. Every kid's total matches their actual payment records.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {mismatches.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>
                {mismatches.length} kid{mismatches.length === 1 ? "'s" : "s'"} totals don't match their payment records
              </div>
              <div style={{ color: B.inkSoft, fontSize: '0.82rem', marginBottom: 10 }}>
                Tick the ones to fix — the total is set to what the payment records actually add up to. Nothing changes without your tick.
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {mismatches.map((m) => (
                  <label key={m.kid.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', cursor: editMode ? 'pointer' : 'default' }}>
                    {editMode && (
                      <input
                        type="checkbox"
                        checked={ticked.has(m.kid.id)}
                        onChange={(e) => {
                          const next = new Set(ticked);
                          if (e.target.checked) next.add(m.kid.id);
                          else next.delete(m.kid.id);
                          setTicked(next);
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 700, flex: 1 }}>{m.kid.full_name}</span>
                    <span style={{ color: B.mute }}>card says {formatMoney(m.recorded)}</span>
                    <span>→</span>
                    <Chip tone="accent">records say {formatMoney(m.actual)}</Chip>
                  </label>
                ))}
              </div>
              {editMode && (
                <div style={{ marginTop: 10 }}>
                  <Btn size="sm" onClick={() => void fixTicked()} disabled={!ticked.size || fixing}>
                    {fixing ? 'Fixing…' : `Fix ${ticked.size} ticked`}
                  </Btn>
                </div>
              )}
            </div>
          )}
          {ghosts.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>
                👻 {formatMoney(ghostTotal)} of ghost money ({ghosts.length} payment{ghosts.length === 1 ? '' : 's'})
              </div>
              <div style={{ color: B.inkSoft, fontSize: '0.82rem', marginBottom: 10 }}>
                These payments belong to kids that are no longer in the app. They quietly inflate your lifetime totals.
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ghosts.slice(0, 10).map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem' }}>
                    <span style={{ flex: 1, color: B.inkSoft }}>{shortDate(p.paid_at)} · {p.method ?? ''}</span>
                    <Chip tone="neutral">{formatMoney(Number(p.amount))}</Chip>
                    {editMode && (
                      <Btn size="sm" kind="danger" onClick={() => removeGhost(p.id, Number(p.amount))} disabled={delGhost.isPending}>
                        Remove
                      </Btn>
                    )}
                  </div>
                ))}
                {ghosts.length > 10 && <div style={{ color: B.mute, fontSize: '0.78rem' }}>…and {ghosts.length - 10} more.</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
