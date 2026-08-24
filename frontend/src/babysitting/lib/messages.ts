// Balance-reminder message builders. Step 1 ships device deep links
// (sms: / mailto:) from the dashboard; Step 2 adds the scheduled
// server-side Thursday send using the same templates.

import type { Client } from '../../lib/database.types';
import { readParent, readBalance } from '../theme';
import type { BabysittingSettings } from './config';

/** Fill {parent} {kids} {currency}{balance} into a template for one family. */
export function fillTemplate(
  template: string,
  family: { parentName: string; kidNames: string[]; balance: number },
  settings: BabysittingSettings,
): string {
  const kids =
    family.kidNames.length <= 1
      ? family.kidNames[0] ?? 'your kids'
      : family.kidNames.slice(0, -1).join(', ') +
        ' and ' +
        family.kidNames[family.kidNames.length - 1];
  return template
    .replace(/\{parent\}/g, family.parentName || 'there')
    .replace(/\{kids\}/g, kids)
    .replace(/\{currency\}/g, settings.currency || '$')
    .replace(/\{balance\}/g, family.balance.toFixed(family.balance % 1 === 0 ? 0 : 2));
}

/** Family summary for one group of sibling rows. */
export function familySummary(kids: Client[]): {
  parentName: string;
  kidNames: string[];
  balance: number;
  phone: string | null;
  email: string | null;
} {
  const withParent = kids.find((k) => readParent(k));
  const withPhone = kids.find((k) => k.phone);
  const withEmail = kids.find((k) => k.email);
  return {
    parentName: withParent ? readParent(withParent) : '',
    kidNames: kids.map((k) => k.full_name.split(' ')[0]),
    balance: Math.round(kids.reduce((s, k) => s + readBalance(k), 0) * 100) / 100,
    phone: withPhone?.phone ?? null,
    email: withEmail?.email ?? null,
  };
}

/** sms: link — the "?&body=" form works on both iOS and Android. */
export function smsLink(phone: string, body: string): string {
  const clean = phone.trim().startsWith('+')
    ? '+' + phone.replace(/[^\d]/g, '')
    : phone.replace(/[^\d]/g, '');
  return `sms:${clean}?&body=${encodeURIComponent(body)}`;
}

export function mailtoLink(email: string, subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`;
}
