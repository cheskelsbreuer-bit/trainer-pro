// The demo's in-memory database.
//
// The demo isn't a set of dead screenshots — it's a real, working app whose
// database happens to live in this tab's memory. Every button does exactly
// what it does for a paying sitter: record a payment and the balance moves,
// bill a family and the charge appears, add a kid and she's on the roster.
// Nothing ever leaves the browser, and a refresh brings the sample family
// back exactly as it was.

import type { Client, Payment } from '../../lib/database.types';
import type { BabysittingConfig } from '../lib/config';
import { DEMO_KIDS, DEMO_PAYMENTS, DEMO_CONFIG } from './demoData';

interface DemoStore {
  kids: Client[];
  payments: Payment[];
  config: BabysittingConfig;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function fresh(): DemoStore {
  return {
    kids: clone(DEMO_KIDS),
    payments: clone(DEMO_PAYMENTS),
    config: clone(DEMO_CONFIG),
  };
}

let store: DemoStore = fresh();

export function demoKids(): Client[] {
  return [...store.kids];
}
export function demoPayments(): Payment[] {
  return [...store.payments];
}
export function demoConfig(): BabysittingConfig {
  return store.config;
}
export function setDemoConfig(next: BabysittingConfig): void {
  store.config = next;
}
export function resetDemo(): void {
  store = fresh();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Every write replaces objects instead of editing them in place. React
// compares by identity, so an in-place edit can leave a screen showing a
// stale number — the balance changing on one page but not another.

/** Replace one kid's tags, matching what the real update would write. */
export function demoSetKidTags(id: string, tags: string[]): void {
  store.kids = store.kids.map((k) => (k.id === id ? { ...k, tags } : k));
}

export function demoSetKidStatus(id: string, status: Client['status']): void {
  store.kids = store.kids.map((k) => (k.id === id ? { ...k, status } : k));
}

export function demoAddPayment(input: {
  client_id: string;
  amount: number;
  paid_at: string;
  method?: string | null;
  description?: string | null;
}): void {
  store.payments = [
    {
      id: newId('demo-pay'),
      trainer_id: 'demo-trainer',
      client_id: input.client_id,
      amount: input.amount,
      currency: 'USD',
      payment_type: 'session',
      sessions_covered: 1,
      description: input.description ?? 'Babysitting payment',
      method: input.method ?? null,
      reference: null,
      paid_at: input.paid_at,
      created_at: new Date().toISOString(),
    } as Payment,
    ...store.payments,
  ];
}

export function demoDeletePayment(id: string): void {
  store.payments = store.payments.filter((p) => p.id !== id);
}

/** Create or update a kid. Returns the id (new or existing). */
export function demoUpsertKid(input: {
  id?: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  medical_notes?: string | null;
  notes?: string | null;
  emergency_contact?: string | null;
  tags: string[];
  status?: Client['status'];
}): string {
  if (input.id) {
    store.kids = store.kids.map((k) =>
      k.id === input.id
        ? {
            ...k,
            full_name: input.full_name,
            phone: input.phone ?? null,
            email: input.email ?? null,
            date_of_birth: input.date_of_birth ?? null,
            medical_notes: input.medical_notes ?? null,
            notes: input.notes ?? null,
            emergency_contact: input.emergency_contact ?? null,
            tags: input.tags,
            ...(input.status ? { status: input.status } : {}),
          }
        : k,
    );
    return input.id;
  }
  const id = newId('demo-kid');
  store.kids = [
    ...store.kids,
    {
      id,
      trainer_id: 'demo-trainer',
      auth_user_id: null,
      full_name: input.full_name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      date_of_birth: input.date_of_birth ?? null,
      goals: null,
      medical_notes: input.medical_notes ?? null,
      emergency_contact: input.emergency_contact ?? null,
      status: input.status ?? 'active',
      tags: input.tags,
      rate_per_session: null,
      package_balance: 0,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Client,
  ].sort((a, b) => a.full_name.localeCompare(b.full_name));
  return id;
}
