// Tiny helpers for SMS / email reminders. Mom's old app could open the
// phone's SMS app prefilled with a message — we do the same with an
// `sms:` URL (works on iOS + Android; on desktop the OS may bounce).

import type { Client } from '../../lib/database.types';
import { readBalance } from '../theme';
import type { ExerciseSettings } from './exerciseConfig';

/** Substitute {firstName}, {currency}, {balance} into the template. */
export function fillTemplate(
  template: string,
  client: Client,
  settings: ExerciseSettings,
): string {
  const firstName = (client.full_name || '').split(/\s+/)[0] || 'there';
  const balance = readBalance(client);
  const balanceStr = balance.toFixed(0);
  return template
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{currency\}/g, settings.currency || '$')
    .replace(/\{balance\}/g, balanceStr);
}

/** Build a `sms:` URL the OS will open in the user's messaging app. */
export function smsLink(phone: string, body: string): string {
  // Strip non-digits for the recipient; keep "+" if leading.
  const lead = phone.trim().startsWith('+') ? '+' : '';
  const digits = phone.replace(/[^\d]/g, '');
  // iOS uses ?&body=, Android uses ?body= — the combined "?&" works on both.
  return `sms:${lead}${digits}?&body=${encodeURIComponent(body)}`;
}

export function mailtoLink(email: string, subject: string, body: string): string {
  const qs = new URLSearchParams({ subject, body }).toString();
  return `mailto:${email}?${qs}`;
}
