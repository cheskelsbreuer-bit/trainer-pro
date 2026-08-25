// CSV exports — kids roster and payment history.

import type { Client, Payment } from '../../lib/database.types';
import {
  readFamilySlug,
  familyLabel,
  readParent,
  readDays,
  DAY_SHORT,
  readWeeklyRate,
  readHourlyRate,
  readTotalOwed,
  readTotalPaid,
  readBalance,
  readStartDate,
} from '../theme';

function cell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function kidsCsv(kids: Client[]): string {
  const header = [
    'Kid', 'Family', 'Parent', 'Phone', 'Email', 'Birthday', 'Days',
    'Weekly rate', 'Hourly rate', 'Total billed', 'Total paid', 'Balance',
    'Allergies', 'Notes', 'Status', 'Started',
  ];
  const rows = kids.map((k) => [
    k.full_name,
    familyLabel(readFamilySlug(k)),
    readParent(k),
    k.phone ?? '',
    k.email ?? '',
    k.date_of_birth ?? '',
    readDays(k).map((d) => DAY_SHORT[d]).join(' '),
    readWeeklyRate(k) || '',
    readHourlyRate(k) || '',
    readTotalOwed(k),
    readTotalPaid(k),
    readBalance(k),
    k.medical_notes ?? '',
    k.notes ?? '',
    k.status ?? '',
    readStartDate(k) ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

export function paymentsCsv(payments: Payment[], kidName: (id: string) => string): string {
  const header = ['Date', 'Kid', 'Amount', 'Method', 'Note'];
  const rows = payments.map((p) => [
    p.paid_at?.slice(0, 10) ?? '',
    kidName(p.client_id),
    p.amount,
    p.method ?? '',
    p.description ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

/** Tax-season export: every charge and payment in one dated ledger. */
export function yearCsv(
  payments: Payment[],
  charges: Array<{ ts: string; kidName: string; familySlug: string; amount: number; kind: string; note?: string }>,
  kidName: (id: string) => string,
): string {
  const header = ['Date', 'Type', 'Kid', 'Family', 'Detail', 'Money in', 'Billed'];
  const rows: Array<Array<string | number>> = [];
  for (const p of payments) {
    rows.push([p.paid_at?.slice(0, 10) ?? '', 'Payment', kidName(p.client_id), '', p.method ?? '', Number(p.amount), '']);
  }
  for (const ch of charges) {
    rows.push([ch.ts.slice(0, 10), ch.amount < 0 ? 'Credit' : 'Charge', ch.kidName, ch.familySlug, `${ch.kind}${ch.note ? ' — ' + ch.note : ''}`, '', ch.amount]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
