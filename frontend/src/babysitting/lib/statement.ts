// Printable family statement — the mom-app classic, rebuilt: a branded
// one-pager per family with the kids, the balance, and recent activity.
// Opens in a new window ready to print (or save as PDF from the print
// dialog and email it).

import type { Client, Payment } from '../../lib/database.types';
import type { ChargeEntry } from './config';
import {
  readBalance,
  readTotalOwed,
  readTotalPaid,
  formatMoney,
  shortDate,
  familyLabel,
} from '../theme';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function openFamilyStatement(opts: {
  familySlug: string;
  members: Client[];
  payments: Payment[]; // this family's, newest first
  charges: ChargeEntry[]; // this family's, newest first
  businessName: string;
  currencyLabel?: string;
}): void {
  const { familySlug, members, payments, charges, businessName } = opts;
  const famName = familySlug.startsWith('solo-')
    ? members[0]?.full_name ?? 'Family'
    : familyLabel(familySlug);
  const balance = Math.round(members.reduce((s, m) => s + readBalance(m), 0) * 100) / 100;
  const billed = Math.round(members.reduce((s, m) => s + readTotalOwed(m), 0) * 100) / 100;
  const paid = Math.round(members.reduce((s, m) => s + readTotalPaid(m), 0) * 100) / 100;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const kidName = (id: string) => members.find((m) => m.id === id)?.full_name.split(' ')[0] ?? '';

  const chargeRows = charges
    .slice(0, 20)
    .map(
      (c) =>
        `<tr><td>${shortDate(c.ts)}</td><td>${esc(c.kidName.split(' ')[0])}</td><td>${esc(
          c.kind === 'week' ? 'Weekly' : c.kind === 'hours' ? `${c.hours ?? ''} hours` : c.amount < 0 ? 'Credit' : 'Charge',
        )}${c.note ? ' — ' + esc(c.note) : ''}</td><td class="num">${formatMoney(c.amount)}</td></tr>`,
    )
    .join('');
  const paymentRows = payments
    .slice(0, 20)
    .map(
      (p) =>
        `<tr><td>${shortDate(p.paid_at)}</td><td>${esc(kidName(p.client_id))}</td><td>${esc(p.method ?? '')}</td><td class="num">${formatMoney(Number(p.amount))}</td></tr>`,
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Statement — ${esc(famName)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #37302a; max-width: 680px; margin: 24px auto; padding: 0 20px; }
  header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #d96f4e; padding-bottom: 10px; }
  h1 { font-size: 1.3rem; margin: 0; } h2 { font-size: 0.95rem; margin: 26px 0 8px; }
  .muted { color: #9a8f85; font-size: 0.8rem; }
  .balance { background: ${balance > 0.005 ? '#fbe7e2' : '#e4f2e7'}; border-radius: 12px; padding: 14px 18px; margin: 18px 0; display: flex; justify-content: space-between; align-items: center; }
  .balance b { font-size: 1.5rem; color: ${balance > 0.005 ? '#cf4f38' : '#4e9d5f'}; }
  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; color: #9a8f85; padding: 6px 8px; border-bottom: 1.5px solid #e9e0d4; }
  td { padding: 6px 8px; border-bottom: 1px solid #f0e9dd; } .num { text-align: right; font-weight: 600; }
  .totals { display: flex; gap: 24px; margin-top: 10px; font-size: 0.86rem; }
  .noprint { margin: 22px 0; } @media print { .noprint { display: none; } }
  footer { margin-top: 30px; color: #9a8f85; font-size: 0.74rem; border-top: 1px solid #e9e0d4; padding-top: 10px; }
</style></head><body>
<header><h1>🧸 ${esc(businessName)}</h1><div class="muted">${today}</div></header>
<h2>Statement for the ${esc(famName)}</h2>
<div class="muted">${members.map((m) => esc(m.full_name)).join(' · ')}</div>
<div class="balance"><span>${balance > 0.005 ? 'Balance due' : balance < -0.005 ? 'Credit on account' : 'Balance'}</span><b>${formatMoney(Math.abs(balance))}</b></div>
<div class="totals"><span>Total billed: <b>${formatMoney(billed)}</b></span><span>Total paid: <b>${formatMoney(paid)}</b></span></div>
${chargeRows ? `<h2>Recent charges</h2><table><tr><th>Date</th><th>Kid</th><th>What</th><th style="text-align:right">Amount</th></tr>${chargeRows}</table>` : ''}
${paymentRows ? `<h2>Recent payments</h2><table><tr><th>Date</th><th>Kid</th><th>How</th><th style="text-align:right">Amount</th></tr>${paymentRows}</table>` : ''}
<div class="noprint"><button onclick="window.print()" style="background:#d96f4e;color:#fff;border:none;border-radius:999px;padding:10px 22px;font-weight:700;cursor:pointer">🖨 Print / Save as PDF</button></div>
<footer>Prepared by ${esc(businessName)} · ${today}. Thank you!</footer>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
