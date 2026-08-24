// Reports — the money picture over time. Everything is computed
// client-side from payments (received), cfg.charges (billed), and the
// kids' balance tags. Charts are hand-styled divs — warm, quiet bars,
// no libraries.

import { useMemo } from 'react';
import type { Client, Payment } from '../../lib/database.types';
import { B, readBalance, readFamilySlug, familyLabel, formatMoney } from '../theme';
import { useKids, usePayments } from '../lib/data';
import { useBabysittingConfig } from '../lib/config';
import { Card, SectionTitle, StatTile, EmptyState, Avatar, BalancePill } from '../components/ui';

interface MonthRow {
  key: string;
  label: string;
  total: number;
}

interface FamilyRow {
  slug: string;
  label: string;
  total: number;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

/** One horizontal bar row: label · bar · amount. */
function BarRow({
  label,
  amount,
  max,
  color,
}: {
  label: string;
  amount: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(amount > 0 ? 3 : 0, Math.round((amount / max) * 100)) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '86px 1fr 84px', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: B.inkSoft, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ background: B.rowAlt, border: `1px solid ${B.rule}`, borderRadius: B.pill, height: 14, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: B.pill,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: B.ink, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {formatMoney(amount)}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { data: kids, isLoading: kidsLoading } = useKids();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const cfg = useBabysittingConfig();

  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const received = useMemo<Payment[]>(
    () => (payments ?? []).filter((p) => p.paid_at && Number(p.amount) > 0),
    [payments],
  );

  const collectedThisMonth = useMemo<number>(
    () =>
      Math.round(
        received
          .filter((p) => monthKey(new Date(p.paid_at)) === thisMonthKey)
          .reduce((s, p) => s + Number(p.amount), 0) * 100,
      ) / 100,
    [received, thisMonthKey],
  );

  const collectedLastMonth = useMemo<number>(
    () =>
      Math.round(
        received
          .filter((p) => monthKey(new Date(p.paid_at)) === lastMonthKey)
          .reduce((s, p) => s + Number(p.amount), 0) * 100,
      ) / 100,
    [received, lastMonthKey],
  );

  const billedThisMonth = useMemo<number>(
    () =>
      Math.round(
        (cfg.data?.charges ?? [])
          .filter((c) => c.amount > 0 && monthKey(new Date(c.ts)) === thisMonthKey)
          .reduce((s, c) => s + c.amount, 0) * 100,
      ) / 100,
    [cfg.data, thisMonthKey],
  );

  const outstanding = useMemo<number>(
    () =>
      Math.round(
        (kids ?? [])
          .filter((k) => k.status !== 'archived')
          .reduce((s, k) => s + Math.max(0, readBalance(k)), 0) * 100,
      ) / 100,
    [kids],
  );

  // Last 12 months of money received, oldest → newest, leading quiet
  // months trimmed so the chart starts where the story starts.
  const monthRows = useMemo<MonthRow[]>(() => {
    const totals = new Map<string, number>();
    for (const p of received) {
      const k = monthKey(new Date(p.paid_at));
      totals.set(k, (totals.get(k) ?? 0) + Number(p.amount));
    }
    const anchor = new Date();
    const rows: MonthRow[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
      rows.push({
        key: monthKey(d),
        label: `${d.toLocaleDateString('en-US', { month: 'short' })} ’${String(d.getFullYear()).slice(2)}`,
        total: Math.round((totals.get(monthKey(d)) ?? 0) * 100) / 100,
      });
    }
    const first = rows.findIndex((r) => r.total > 0);
    return first === -1 ? [] : rows.slice(first);
  }, [received]);

  // Collected per family, biggest first.
  const familyRows = useMemo<FamilyRow[]>(() => {
    const kidById = new Map<string, Client>();
    for (const k of kids ?? []) kidById.set(k.id, k);
    const totals = new Map<string, FamilyRow>();
    for (const p of received) {
      const kid = kidById.get(p.client_id);
      if (!kid) continue;
      const slug = readFamilySlug(kid) || `solo-${kid.id}`;
      const label = slug.startsWith('solo-') ? kid.full_name : familyLabel(slug);
      const row = totals.get(slug) ?? { slug, label, total: 0 };
      row.total = Math.round((row.total + Number(p.amount)) * 100) / 100;
      totals.set(slug, row);
    }
    return Array.from(totals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [received, kids]);

  const biggestBalances = useMemo<Client[]>(
    () =>
      (kids ?? [])
        .filter((k) => k.status !== 'archived' && readBalance(k) > 0.005)
        .sort((a, b) => readBalance(b) - readBalance(a))
        .slice(0, 8),
    [kids],
  );

  if (kidsLoading || paymentsLoading || cfg.isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Adding up the numbers…</div>;
  }

  const nothingYet = !received.length && !(cfg.data?.charges ?? []).length && !biggestBalances.length;
  if (nothingYet) {
    return (
      <Card pad={0}>
        <EmptyState
          emoji="📈"
          title="No money story to tell yet"
          body="Once you bill a week or record a payment, this page turns into your little bookkeeping report — month by month, family by family."
        />
      </Card>
    );
  }

  const monthMax = monthRows.reduce((m, r) => Math.max(m, r.total), 0);
  const familyMax = familyRows.reduce((m, r) => Math.max(m, r.total), 0);
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatTile label={`Collected in ${monthName}`} value={formatMoney(collectedThisMonth)} tone="good" />
        <StatTile label="Collected last month" value={formatMoney(collectedLastMonth)} />
        <StatTile label={`Billed in ${monthName}`} value={formatMoney(billedThisMonth)} tone="accent" />
        <StatTile
          label="Still outstanding"
          value={formatMoney(outstanding)}
          tone={outstanding > 0 ? 'warn' : 'good'}
          hint={outstanding > 0 ? 'across all families' : 'everyone is paid up'}
        />
      </div>

      {/* Collected by month */}
      <Card>
        <SectionTitle>Collected by month</SectionTitle>
        {monthRows.length ? (
          <div style={{ display: 'grid', gap: 9 }}>
            {monthRows.map((r) => (
              <BarRow key={r.key} label={r.label} amount={r.total} max={monthMax} color={B.accent} />
            ))}
          </div>
        ) : (
          <div style={{ color: B.mute, fontSize: '0.85rem' }}>
            No payments in the last year yet — the bars will grow as money comes in.
          </div>
        )}
      </Card>

      {/* By family + biggest balances */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Card>
          <SectionTitle>Collected by family</SectionTitle>
          {familyRows.length ? (
            <div style={{ display: 'grid', gap: 9 }}>
              {familyRows.map((r) => (
                <BarRow key={r.slug} label={r.label} amount={r.total} max={familyMax} color={B.primary} />
              ))}
            </div>
          ) : (
            <div style={{ color: B.mute, fontSize: '0.85rem' }}>No payments recorded yet.</div>
          )}
        </Card>

        <Card>
          <SectionTitle>Biggest balances</SectionTitle>
          {biggestBalances.length ? (
            <div style={{ display: 'grid', gap: 9 }}>
              {biggestBalances.map((k) => {
                const fam = readFamilySlug(k);
                return (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={k.full_name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.86rem', color: B.ink }}>{k.full_name}</div>
                      {fam && (
                        <div style={{ fontSize: '0.72rem', color: B.mute, fontWeight: 700 }}>{familyLabel(fam)}</div>
                      )}
                    </div>
                    <BalancePill balance={readBalance(k)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: B.mute, fontSize: '0.85rem' }}>Nobody owes anything right now. Lovely.</div>
          )}
        </Card>
      </div>
    </div>
  );
}
