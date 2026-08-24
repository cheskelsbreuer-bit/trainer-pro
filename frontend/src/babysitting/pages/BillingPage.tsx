// Billing — the money history in one calm place. Two tabs: Payments
// (rows from the shared payments table) and Charges (the billing
// history kept in the config blob). Corrections are honest: payments
// can be deleted (the money goes back on the balance), charges are
// never rewritten — you add a credit instead.

import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { Client, Payment } from '../../lib/database.types';
import { B, readFamilySlug, familyLabel, formatMoney, shortDate } from '../theme';
import { useKids, usePayments, useDeletePayment } from '../lib/data';
import { useBabysittingConfig, type ChargeEntry } from '../lib/config';
import {
  Card,
  EmptyState,
  Btn,
  Chip,
  Avatar,
  TableWrap,
  Th,
  Td,
  inputStyle,
  Field,
  Modal,
} from '../components/ui';
import { PaymentModal } from '../components/PaymentModal';
import { ChargeModal } from '../components/ChargeModal';

type Tab = 'payments' | 'charges';

const METHOD_OPTIONS = ['cash', 'check', 'zelle', 'venmo', 'other'] as const;
const PAGE = 50;

export function BillingPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { data: kids, isLoading: kidsLoading } = useKids();
  const { data: payments, isLoading: payLoading } = usePayments();
  const cfg = useBabysittingConfig();
  const del = useDeletePayment();

  const [tab, setTab] = useState<Tab>('payments');
  const [showPay, setShowPay] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pick, setPick] = useState('');
  const [billKids, setBillKids] = useState<Client[] | null>(null);
  const [billTitle, setBillTitle] = useState<string | undefined>(undefined);

  // Filters (payments tab)
  const [q, setQ] = useState('');
  const [method, setMethod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [shown, setShown] = useState(PAGE);

  const kidById = useMemo(() => {
    const map = new Map<string, Client>();
    for (const k of kids ?? []) map.set(k.id, k);
    return map;
  }, [kids]);

  const active = useMemo(() => (kids ?? []).filter((k) => k.status === 'active'), [kids]);

  const families = useMemo(() => {
    const counts = new Map<string, number>();
    for (const k of active) {
      const slug = readFamilySlug(k);
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([slug, count]) => ({ slug, label: familyLabel(slug), count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [active]);

  const famLabelOf = (k: Client | undefined): string => {
    if (!k) return '';
    const slug = readFamilySlug(k);
    return slug ? familyLabel(slug) : '';
  };

  const filtered = useMemo((): Payment[] => {
    const needle = q.trim().toLowerCase();
    return (payments ?? []).filter((p) => {
      const kid = kidById.get(p.client_id);
      if (needle) {
        const hay = `${kid?.full_name ?? ''} ${famLabelOf(kid)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (method !== 'all' && p.method !== method) return false;
      const day = (p.paid_at ?? '').slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, kidById, q, method, from, to]);

  const filteredTotal = useMemo(
    () => Math.round(filtered.reduce((s, p) => s + Number(p.amount), 0) * 100) / 100,
    [filtered],
  );

  const visible = filtered.slice(0, shown);
  const charges: ChargeEntry[] = cfg.data?.charges ?? [];

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setShown(PAGE);
    };
  }
  const setQ2 = resetPage(setQ);
  const setMethod2 = resetPage(setMethod);
  const setFrom2 = resetPage(setFrom);
  const setTo2 = resetPage(setTo);

  function openBill() {
    if (!pick) return;
    if (pick.startsWith('fam:')) {
      const slug = pick.slice(4);
      const members = active.filter((k) => readFamilySlug(k) === slug);
      if (!members.length) return;
      setBillKids(members);
      setBillTitle(`Bill the ${familyLabel(slug)}`);
    } else {
      const kid = active.find((k) => k.id === pick);
      if (!kid) return;
      setBillKids([kid]);
      setBillTitle(undefined);
    }
    setShowPicker(false);
  }

  function deletePayment(p: Payment, kid: Client) {
    if (!window.confirm('Delete this payment? The money goes back onto the balance.')) return;
    del.mutate({
      id: p.id,
      client_id: p.client_id,
      amount: Number(p.amount),
      currentTags: kid.tags ?? [],
    });
  }

  const kindChip = (c: ChargeEntry) => {
    if (c.amount < 0 || c.kind === 'adjustment') return <Chip tone="plum">Credit</Chip>;
    if (c.kind === 'week') return <Chip tone="accent">Week</Chip>;
    if (c.kind === 'hours') return <Chip tone="butter">{c.hours ? `${c.hours} hrs` : 'Hours'}</Chip>;
    return <Chip tone="neutral">Custom</Chip>;
  };

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        border: 'none',
        cursor: 'pointer',
        borderRadius: B.pill,
        padding: '8px 18px',
        fontSize: '0.84rem',
        fontWeight: 800,
        fontFamily: B.fontDisplay,
        background: tab === id ? B.primary : '#f2ede4',
        color: tab === id ? '#fff' : B.inkSoft,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  );

  const noteCell = (note: string | null | undefined) => (
    <div
      style={{
        color: B.mute,
        fontSize: '0.8rem',
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={note ?? undefined}
    >
      {note?.trim() || '—'}
    </div>
  );

  if (kidsLoading || payLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Adding up the money…</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Tabs + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {tabBtn('payments', '💛 Payments')}
        {tabBtn('charges', '🧾 Charges')}
        {editMode && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Btn size="sm" onClick={() => setShowPay(true)}>💛 Record payment</Btn>
            <Btn size="sm" kind="soft" onClick={() => { setPick(''); setShowPicker(true); }}>
              🧾 Add to bill
            </Btn>
          </div>
        )}
      </div>

      {tab === 'payments' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              style={{ ...inputStyle, width: 220 }}
              value={q}
              onChange={(e) => setQ2(e.target.value)}
              placeholder="Search kid or family…"
            />
            <select style={{ ...inputStyle, width: 150 }} value={method} onChange={(e) => setMethod2(e.target.value)}>
              <option value="all">Any method</option>
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
            <input
              style={{ ...inputStyle, width: 150 }}
              type="date"
              value={from}
              onChange={(e) => setFrom2(e.target.value)}
              title="From date"
            />
            <span style={{ color: B.mute, fontSize: '0.8rem', fontWeight: 700 }}>to</span>
            <input
              style={{ ...inputStyle, width: 150 }}
              type="date"
              value={to}
              onChange={(e) => setTo2(e.target.value)}
              title="To date"
            />
            {filtered.length > 0 && (
              <span style={{ marginLeft: 'auto', color: B.inkSoft, fontSize: '0.8rem', fontWeight: 700 }}>
                {filtered.length} payment{filtered.length === 1 ? '' : 's'} · {formatMoney(filteredTotal)}
              </span>
            )}
          </div>

          {(payments ?? []).length === 0 ? (
            <Card pad={0}>
              <EmptyState
                emoji="💛"
                title="No payments yet"
                body="When money comes in, record it here and every family's balance stays up to date."
                action={editMode ? <Btn onClick={() => setShowPay(true)}>💛 Record a payment</Btn> : undefined}
              />
            </Card>
          ) : filtered.length === 0 ? (
            <Card pad={0}>
              <EmptyState
                emoji="🔍"
                title="Nothing matches those filters"
                body="Try widening the dates or clearing the search."
              />
            </Card>
          ) : (
            <>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Kid</Th>
                    <Th>Family</Th>
                    <Th>Method</Th>
                    <Th>Note</Th>
                    <Th style={{ textAlign: 'right' }}>Amount</Th>
                    {editMode && <Th style={{ textAlign: 'right' }} />}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => {
                    const kid = kidById.get(p.client_id);
                    return (
                      <tr key={p.id}>
                        <Td style={{ color: B.inkSoft, whiteSpace: 'nowrap' }}>{shortDate(p.paid_at)}</Td>
                        <Td>
                          {kid ? (
                            <Link
                              to={`/kids/${kid.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                textDecoration: 'none',
                                color: B.ink,
                                fontWeight: 800,
                              }}
                            >
                              <Avatar name={kid.full_name} size={26} />
                              {kid.full_name}
                            </Link>
                          ) : (
                            <span style={{ color: B.mute }}>(kid removed)</span>
                          )}
                        </Td>
                        <Td style={{ color: B.inkSoft }}>{famLabelOf(kid) || '—'}</Td>
                        <Td>{p.method ? <Chip tone="neutral" style={{ textTransform: 'capitalize' }}>{p.method}</Chip> : '—'}</Td>
                        <Td>{noteCell(p.description)}</Td>
                        <Td style={{ textAlign: 'right' }}>
                          <Chip tone={Number(p.amount) >= 0 ? 'green' : 'red'}>{formatMoney(Number(p.amount))}</Chip>
                        </Td>
                        {editMode && (
                          <Td style={{ textAlign: 'right' }}>
                            {kid && (
                              <Btn
                                size="sm"
                                kind="danger"
                                title="Delete this payment"
                                disabled={del.isPending}
                                onClick={() => deletePayment(p, kid)}
                              >
                                🗑
                              </Btn>
                            )}
                          </Td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
              {filtered.length > shown && (
                <div style={{ textAlign: 'center' }}>
                  <Btn kind="ghost" onClick={() => setShown((s) => s + PAGE)}>
                    Show more ({filtered.length - shown} left)
                  </Btn>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'charges' && (
        <>
          {cfg.isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: B.mute }}>Loading the billing history…</div>
          ) : charges.length === 0 ? (
            <Card pad={0}>
              <EmptyState
                emoji="🧾"
                title="Nothing billed yet"
                body='Use "Add to bill" to charge a week, hours, or a custom amount — it lands here and on the family balance.'
                action={
                  editMode ? (
                    <Btn onClick={() => { setPick(''); setShowPicker(true); }}>🧾 Add to bill</Btn>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Kid</Th>
                    <Th>Family</Th>
                    <Th>What</Th>
                    <Th>Note</Th>
                    <Th style={{ textAlign: 'right' }}>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c) => {
                    const kid = kidById.get(c.clientId);
                    return (
                      <tr key={c.id}>
                        <Td style={{ color: B.inkSoft, whiteSpace: 'nowrap' }}>{shortDate(c.ts)}</Td>
                        <Td style={{ fontWeight: 800 }}>
                          {kid ? (
                            <Link to={`/kids/${kid.id}`} style={{ textDecoration: 'none', color: B.ink }}>
                              {c.kidName}
                            </Link>
                          ) : (
                            c.kidName
                          )}
                        </Td>
                        <Td style={{ color: B.inkSoft }}>{c.familySlug ? familyLabel(c.familySlug) : '—'}</Td>
                        <Td>{kindChip(c)}</Td>
                        <Td>{noteCell(c.note)}</Td>
                        <Td style={{ textAlign: 'right', fontWeight: 800 }}>
                          {c.amount < 0 ? (
                            <span style={{ color: B.accentDeep }}>{formatMoney(-c.amount)} credit</span>
                          ) : (
                            formatMoney(c.amount)
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
              <div style={{ color: B.mute, fontSize: '0.78rem', textAlign: 'center' }}>
                To undo a charge, add a credit — history stays honest.
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      {showPay && <PaymentModal kid={null} onClose={() => setShowPay(false)} />}

      {showPicker && (
        <Modal title="Who are you billing?" onClose={() => setShowPicker(false)}>
          <Field label="Kid or family" hint="Picking a family bills every sibling at once.">
            <select style={inputStyle} value={pick} onChange={(e) => setPick(e.target.value)} autoFocus>
              <option value="">Pick who to bill…</option>
              {families.length > 0 && (
                <optgroup label="Whole family">
                  {families.map((f) => (
                    <option key={f.slug} value={`fam:${f.slug}`}>
                      {f.label} ({f.count} kid{f.count === 1 ? '' : 's'})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="One kid">
                {active.map((k) => {
                  const fam = readFamilySlug(k);
                  return (
                    <option key={k.id} value={k.id}>
                      {k.full_name}
                      {fam ? ` — ${familyLabel(fam)}` : ''}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </Field>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn kind="ghost" onClick={() => setShowPicker(false)}>Cancel</Btn>
            <Btn onClick={openBill} disabled={!pick}>Continue</Btn>
          </div>
        </Modal>
      )}

      {billKids && (
        <ChargeModal
          kids={billKids}
          title={billTitle}
          onClose={() => {
            setBillKids(null);
            setBillTitle(undefined);
          }}
        />
      )}
    </div>
  );
}
