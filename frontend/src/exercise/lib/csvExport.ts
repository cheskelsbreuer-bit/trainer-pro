// CSV export — Members and Payments, both downloadable as a single
// .csv each. Mirrors mom's old app's "Export Members CSV" button.

import type { Client, Payment } from '../../lib/database.types';
import {
  readBalance,
  readGroup,
  readRate,
  readTotalClasses,
  readTotalOwed,
  readTotalPaid,
  readPausedClasses,
  readStartDate,
} from '../theme';

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Wrap in quotes if it has comma, quote, or newline; double inner quotes.
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(escapeCell).join(',')).join('\n');
}

export function membersCsv(clients: Client[]): string {
  const header = [
    'Name',
    'Status',
    'Group',
    'Phone',
    'Rate per class',
    'Total classes',
    'Total owed',
    'Total paid',
    'Balance',
    'Paused classes',
    'Joined',
  ];
  const body = clients.map((c) => [
    c.full_name,
    c.status,
    readGroup(c),
    c.phone ?? '',
    readRate(c),
    readTotalClasses(c),
    readTotalOwed(c),
    readTotalPaid(c),
    readBalance(c),
    readPausedClasses(c),
    readStartDate(c) ?? '',
  ]);
  return toCsv([header, ...body]);
}

export function paymentsCsv(payments: Payment[], clients: Client[]): string {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const header = ['Date', 'Name', 'Group', 'Amount', 'Currency', 'Method', 'Description'];
  const body = payments
    .slice()
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
    .map((p) => {
      const c = byId.get(p.client_id);
      return [
        new Date(p.paid_at).toISOString().slice(0, 10),
        c?.full_name ?? '',
        c ? readGroup(c) : '',
        Number(p.amount),
        p.currency ?? 'USD',
        p.method ?? '',
        p.description ?? '',
      ];
    });
  return toCsv([header, ...body]);
}

/** Trigger a file download in the browser. */
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
