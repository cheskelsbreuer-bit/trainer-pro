// Tiny CSV exporter — no dependencies. Handles strings, numbers, dates, null.
// Use: downloadCsv('clients.csv', rows, ['full_name','email','status'])

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns?: (keyof T)[],
): string {
  if (rows.length === 0) return '';
  const cols = (columns ?? Object.keys(rows[0]) as (keyof T)[]) as string[];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    let s: string;
    if (v instanceof Date) s = v.toISOString();
    else if (typeof v === 'object') s = JSON.stringify(v);
    else s = String(v);
    if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.map(escape).join(',');
  const body = rows.map((r) => cols.map((c) => escape((r as Record<string, unknown>)[c])).join(','));
  return [header, ...body].join('\r\n');
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: (keyof T)[],
) {
  const csv = toCsv(rows, columns);
  // Add BOM so Excel reads UTF-8 correctly
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// Stamp a filename with a date — "clients-2026-05-06.csv"
export function dateStamp(prefix: string, ext = 'csv'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.${ext}`;
}
