// CSV export for a single client's history — check-ins + sessions +
// payments. Triggers a browser download with no backend round trip.

import type { Client, Payment, Session } from '../../lib/database.types';
import type { CheckInRow } from '../theme';

type SessionRow = Session;

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function makeSection(title: string, headers: string[], rows: string[][]): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push(headers.map(csvEscape).join(','));
  for (const r of rows) lines.push(r.map(csvEscape).join(','));
  lines.push(''); // trailing blank between sections
  return lines.join('\n');
}

export function buildClientCsv(
  client: Client,
  checkIns: CheckInRow[],
  sessions: SessionRow[],
  payments: Payment[],
): string {
  const blocks: string[] = [];

  blocks.push(
    makeSection(
      'Client',
      ['Field', 'Value'],
      [
        ['Name', client.full_name],
        ['Email', client.email ?? ''],
        ['Phone', client.phone ?? ''],
        ['Goals', client.goals ?? ''],
        ['Status', client.status],
        ['Tags', (client.tags ?? []).join('; ')],
        ['Created at', client.created_at],
      ],
    ),
  );

  blocks.push(
    makeSection(
      'Check-ins',
      [
        'Week starting',
        'Weight (lb)',
        'Body fat %',
        'Waist (in)',
        'Hip (in)',
        'Chest (in)',
        'Compliance %',
        'Energy /5',
        'Hunger /5',
        'Sleep hrs',
        'Notes',
        'Coach reply',
        'Status',
        'Submitted',
        'Reviewed',
      ],
      checkIns.map((c) => [
        c.week_starting,
        c.weight_lb ?? '',
        c.body_fat_pct ?? '',
        c.waist_in ?? '',
        c.hip_in ?? '',
        c.chest_in ?? '',
        c.compliance_pct ?? '',
        c.energy_1_5 ?? '',
        c.hunger_1_5 ?? '',
        c.sleep_hours_avg ?? '',
        c.client_notes ?? '',
        c.coach_reply ?? '',
        c.status,
        c.submitted_at,
        c.reviewed_at ?? '',
      ].map((x) => String(x ?? ''))),
    ),
  );

  blocks.push(
    makeSection(
      'Sessions',
      ['Date', 'Type', 'Status', 'Duration (min)', 'Location/Link', 'Notes'],
      sessions.map((s) => [
        s.starts_at,
        s.session_type ?? '',
        s.status,
        s.ends_at
          ? String(
              Math.round(
                (new Date(s.ends_at).getTime() - new Date(s.starts_at).getTime()) /
                  60000,
              ),
            )
          : '',
        s.location ?? '',
        s.notes ?? '',
      ]),
    ),
  );

  blocks.push(
    makeSection(
      'Payments',
      ['Paid at', 'Amount', 'Currency', 'Method', 'Description'],
      payments.map((p) => [
        p.paid_at,
        String(p.amount),
        p.currency ?? 'USD',
        p.method ?? '',
        p.description ?? '',
      ]),
    ),
  );

  const header = [
    `# Trainer Pro — client history export`,
    `# Generated: ${new Date().toISOString()}`,
    '',
  ].join('\n');
  return header + blocks.join('\n');
}

/** Trigger a browser download. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
