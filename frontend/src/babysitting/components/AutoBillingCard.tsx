// 🔁 Automatic weekly billing — pick a day and the week's charges post
// themselves: every active kid's weekly rate, sibling discounts applied,
// away kids skipped. Practice mode shows the exact bill before you trust it.

import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api';
import { B, ALL_DAYS, DAY_SHORT, formatMoney, readWeeklyRate, readFamilySlug, tagsAfterCharge } from '../theme';
import { useBabysittingConfig, appendLog, appendCharge } from '../lib/config';
import { useKids } from '../lib/data';
import { useDemo } from '../demo/flag';
import { demoSetKidTags } from '../demo/demoStore';
import { Card, SectionTitle, Btn, Chip } from './ui';

interface BillingRunResult {
  dry_run: boolean;
  would_bill?: Array<{ kid: string; amount: number; discounted: boolean }>;
  total?: number;
  billed_kids?: number;
  errors?: string[];
  skipped?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AutoBillingCard() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const cfg = useBabysittingConfig();
  const demo = useDemo();
  const { data: kids } = useKids();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BillingRunResult | null>(null);
  const [err, setErr] = useState('');

  const ab = cfg.data?.settings.autoBilling ?? { enabled: false, day: 0 };

  function saveAb(next: { enabled: boolean; day: number }, log: string) {
    if (!cfg.data) return;
    cfg.save.mutate(
      appendLog({ ...cfg.data, settings: { ...cfg.data.settings, autoBilling: next } }, 'settings', log),
    );
  }

  async function run(dryRun: boolean) {
    setBusy(true);
    setErr('');
    setResult(null);
    // The demo bills for real — against its in-memory books — using the
    // same rules the server uses: active kids only, away kids skipped,
    // sibling discount on the 2nd+ child in a family.
    if (demo) {
      await new Promise((r) => setTimeout(r, 650));
      const awayIds = new Set((cfg.data?.away ?? []).filter((a) => !a.endedAt).map((a) => a.clientId));
      const fd = cfg.data?.settings.familyDiscount;
      const seenInFamily = new Map<string, number>();
      const lines: Array<{ kid: string; amount: number; discounted: boolean; id: string; tags: string[]; slug: string }> = [];
      for (const k of (kids ?? []).filter((k) => k.status === 'active' && !awayIds.has(k.id))) {
        const rate = readWeeklyRate(k);
        if (!rate) continue;
        const slug = readFamilySlug(k) || `solo-${k.id}`;
        const nth = seenInFamily.get(slug) ?? 0;
        seenInFamily.set(slug, nth + 1);
        const discounted = !!fd?.enabled && nth > 0;
        const amount = discounted
          ? fd!.type === 'percent'
            ? Math.round(rate * (1 - fd!.value / 100) * 100) / 100
            : Math.max(0, rate - fd!.value)
          : rate;
        lines.push({ kid: k.full_name, amount, discounted, id: k.id, tags: k.tags ?? [], slug });
      }
      const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
      setResult({
        dry_run: dryRun,
        would_bill: lines.map((l) => ({ kid: l.kid, amount: l.amount, discounted: l.discounted })),
        total,
        billed_kids: lines.length,
      });
      if (!dryRun && cfg.data) {
        let next = cfg.data;
        for (const l of lines) {
          demoSetKidTags(l.id, tagsAfterCharge(l.tags, l.amount));
          next = appendCharge(next, {
            clientId: l.id,
            kidName: l.kid,
            familySlug: l.slug,
            amount: l.amount,
            kind: 'week',
            note: l.discounted ? 'auto (sibling discount)' : 'auto',
          });
        }
        cfg.save.mutate(
          appendLog(next, 'charge', `Auto-billed the week: ${formatMoney(total)} across ${lines.length} kids`, 'automatic weekly billing'),
        );
        qc.invalidateQueries({ queryKey: ['babysitting-kids'] });
      }
      setBusy(false);
      return;
    }
    try {
      const res = await api<BillingRunResult>('/billing/run-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun, force: true }),
      });
      setResult(res);
      if (!dryRun) {
        qc.invalidateQueries({ queryKey: ['babysitting-kids'] });
        qc.invalidateQueries({ queryKey: ['babysitting-config'] });
      }
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.status}: ${e.message}` : e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ borderLeft: `4px solid ${B.butter}` }}>
      <SectionTitle
        right={ab.enabled ? <Chip tone="green">On — every {DAY_NAMES[ab.day]}</Chip> : <Chip tone="neutral">Off</Chip>}
      >
        🔁 Automatic weekly billing
      </SectionTitle>
      <div style={{ color: B.inkSoft, fontSize: '0.86rem', marginBottom: 12 }}>
        Pick a day and the week's charges post themselves — every active kid's weekly rate, sibling discounts
        included, away kids skipped. Kids without a weekly rate are left alone (bill their hours by hand).
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <button
          onClick={() => saveAb({ ...ab, enabled: !ab.enabled }, ab.enabled ? 'Auto-billing turned off' : 'Auto-billing turned on')}
          disabled={!editMode}
          style={{
            border: 'none',
            cursor: editMode ? 'pointer' : 'not-allowed',
            borderRadius: B.pill,
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: 800,
            fontFamily: B.fontDisplay,
            background: ab.enabled ? B.accent : '#f2ede4',
            color: ab.enabled ? '#fff' : B.inkSoft,
            opacity: editMode ? 1 : 0.6,
          }}
        >
          {ab.enabled ? '✓ Auto-billing is ON' : 'Turn on auto-billing'}
        </button>
        <div style={{ display: 'flex', gap: 5 }}>
          {ALL_DAYS.map((d, i) => (
            <button
              key={d}
              disabled={!editMode}
              onClick={() => saveAb({ ...ab, day: i }, `Auto-billing day set to ${DAY_SHORT[d]}`)}
              style={{
                border: 'none',
                cursor: editMode ? 'pointer' : 'not-allowed',
                borderRadius: B.pill,
                padding: '7px 11px',
                fontSize: '0.74rem',
                fontWeight: 800,
                background: ab.day === i ? B.primary : '#f2ede4',
                color: ab.day === i ? '#fff' : B.inkSoft,
              }}
            >
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>
        {editMode && (
          <>
            <Btn size="sm" kind="accent" onClick={() => void run(true)} disabled={busy}>
              {busy ? '…' : '🧪 Practice run'}
            </Btn>
            <Btn
              size="sm"
              onClick={() => {
                if (window.confirm("Bill the whole week now, for real? Every active kid's weekly rate goes on their balance.")) void run(false);
              }}
              disabled={busy}
            >
              🧾 Bill the week now
            </Btn>
          </>
        )}
      </div>
      {err && <Chip tone="red">{err}</Chip>}
      {result && (
        <div style={{ border: `1.5px solid ${B.rule}`, borderRadius: B.radiusSm, padding: '12px 14px' }}>
          {result.dry_run ? (
            <>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                🧪 Practice — this would bill {formatMoney(result.total ?? 0)}:
              </div>
              <div style={{ display: 'grid', gap: 4, fontSize: '0.84rem' }}>
                {(result.would_bill ?? []).map((r, i) => (
                  <div key={i}>
                    <b>{r.kid}</b> — {formatMoney(r.amount)}
                    {r.discounted && <span style={{ color: B.accentDeep }}> (sibling discount)</span>}
                  </div>
                ))}
                {!(result.would_bill ?? []).length && <span style={{ color: B.mute }}>Nobody has a weekly rate set yet.</span>}
              </div>
            </>
          ) : (
            <div style={{ fontWeight: 800 }}>
              ✅ Billed {formatMoney(result.total ?? 0)} across {result.billed_kids ?? 0} kids.
              {(result.errors ?? []).map((e, i) => (
                <div key={i} style={{ color: B.red, fontWeight: 600, fontSize: '0.83rem' }}>⚠️ {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
