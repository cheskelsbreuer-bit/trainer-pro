// Families — every household at a glance. Siblings share one card, one
// combined balance, and one set of reminder links, because that's how
// real families get billed.

import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import { B, readFamilySlug, familyLabel, shortDate, ageOf } from '../theme';
import { useKids, usePayments } from '../lib/data';
import { useBabysittingConfig } from '../lib/config';
import { fillTemplate, familySummary, smsLink, mailtoLink } from '../lib/messages';
import {
  Card,
  SectionTitle,
  EmptyState,
  Btn,
  BalancePill,
  AllergyBadge,
  Avatar,
  inputStyle,
} from '../components/ui';
import { KidModal } from '../components/KidModal';
import { InviteParentButton } from '../components/InviteParentButton';
import { PaymentModal } from '../components/PaymentModal';
import { ChargeModal } from '../components/ChargeModal';

interface FamilyGroup {
  slug: string;
  members: Client[];
  parentName: string;
  kidNames: string[];
  balance: number;
  phone: string | null;
  email: string | null;
}

export function FamiliesPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { data: kids, isLoading } = useKids();
  const { data: payments } = usePayments();
  const cfg = useBabysittingConfig();
  const settings = cfg.data?.settings;

  const [search, setSearch] = useState('');
  const [billFam, setBillFam] = useState<FamilyGroup | null>(null);
  const [payKid, setPayKid] = useState<Client | null>(null);
  const [editKid, setEditKid] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const active = useMemo(() => (kids ?? []).filter((k) => k.status === 'active'), [kids]);

  // Group active kids into real families; family-less kids stay separate.
  const { families, noFamily } = useMemo((): { families: FamilyGroup[]; noFamily: Client[] } => {
    const byFam = new Map<string, Client[]>();
    const loners: Client[] = [];
    for (const k of active) {
      const slug = readFamilySlug(k);
      if (slug) byFam.set(slug, [...(byFam.get(slug) ?? []), k]);
      else loners.push(k);
    }
    const groups: FamilyGroup[] = Array.from(byFam.entries())
      .map(([slug, members]) => ({ slug, members, ...familySummary(members) }))
      .sort((a, b) => familyLabel(a.slug).localeCompare(familyLabel(b.slug)));
    return { families: groups, noFamily: loners };
  }, [active]);

  // Search across family label, parent name, and kid names.
  const q = search.trim().toLowerCase();
  const shownFamilies = useMemo((): FamilyGroup[] => {
    if (!q) return families;
    return families.filter(
      (f) =>
        familyLabel(f.slug).toLowerCase().includes(q) ||
        f.parentName.toLowerCase().includes(q) ||
        f.members.some((m) => m.full_name.toLowerCase().includes(q)),
    );
  }, [families, q]);

  const shownNoFamily = useMemo((): Client[] => {
    if (!q) return noFamily;
    return noFamily.filter((k) => k.full_name.toLowerCase().includes(q));
  }, [noFamily, q]);

  // Most recent payment date per family slug (payments arrive newest first).
  const lastPaymentByFamily = useMemo(() => {
    const kidFam = new Map<string, string>();
    for (const k of active) {
      const slug = readFamilySlug(k);
      if (slug) kidFam.set(k.id, slug);
    }
    const last = new Map<string, string>();
    for (const p of payments ?? []) {
      const fam = kidFam.get(p.client_id);
      if (fam && p.paid_at && !last.has(fam)) last.set(fam, p.paid_at);
    }
    return last;
  }, [payments, active]);

  const kidCount = shownFamilies.reduce((s, f) => s + f.members.length, 0) + shownNoFamily.length;

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Gathering the families…</div>;
  }

  if (!active.length) {
    return (
      <Card pad={0}>
        <EmptyState
          emoji="👨‍👩‍👧"
          title="No families yet"
          body="Add your first kid and give them a family — siblings with the same family share one bill and one balance."
          action={editMode ? <Btn size="lg" onClick={() => setShowAdd(true)}>+ Add a kid</Btn> : undefined}
        />
        {showAdd && <KidModal kid={null} onClose={() => setShowAdd(false)} />}
      </Card>
    );
  }

  const kidRow = (k: Client) => (
    <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Link
        to={`/kids/${k.id}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: B.ink,
          minWidth: 0,
          flex: 1,
        }}
      >
        <Avatar name={k.full_name} size={30} />
        <span style={{ fontWeight: 800, fontSize: '0.88rem' }}>{k.full_name.split(' ')[0]}</span>
        {ageOf(k.date_of_birth) && (
          <span style={{ color: B.mute, fontWeight: 700, fontSize: '0.74rem' }}>{ageOf(k.date_of_birth)}</span>
        )}
        <AllergyBadge allergies={k.medical_notes} />
      </Link>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Top bar: search + counts */}
      <Card pad={14}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <input
            style={{ ...inputStyle, maxWidth: 340 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by family, parent, or kid…"
          />
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: B.inkSoft, marginLeft: 'auto' }}>
            {shownFamilies.length} {shownFamilies.length === 1 ? 'family' : 'families'} · {kidCount}{' '}
            {kidCount === 1 ? 'kid' : 'kids'}
          </div>
        </div>
      </Card>

      {!shownFamilies.length && !shownNoFamily.length ? (
        <Card pad={0}>
          <EmptyState
            emoji="🔎"
            title="No family matches that"
            body={`Nothing found for “${search.trim()}”. Try a family name, a parent, or a kid.`}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18 }}>
          {shownFamilies.map((f) => {
            const label = familyLabel(f.slug);
            const smsBody = settings ? fillTemplate(settings.smsTemplate, f, settings) : '';
            const emailBody = settings ? fillTemplate(settings.emailTemplate, f, settings) : '';
            const canRemind = f.balance > 0.005 && !!settings;
            return (
              <Card key={f.slug} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Header: family + parent + balance */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, fontSize: '1.02rem', color: B.ink }}>
                      {label}
                    </div>
                    {f.parentName && (
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: B.inkSoft, marginTop: 2 }}>
                        Parent: {f.parentName}
                      </div>
                    )}
                  </div>
                  <BalancePill balance={f.balance} />
                </div>

                {/* Contact row */}
                {(f.phone || f.email) && (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700 }}>
                    {f.phone && (
                      <a href={`tel:${f.phone}`} style={{ color: B.accentDeep, textDecoration: 'none' }}>
                        📞 {f.phone}
                      </a>
                    )}
                    {f.email && (
                      <a
                        href={`mailto:${f.email}`}
                        style={{
                          color: B.accentDeep,
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        ✉️ {f.email}
                      </a>
                    )}
                  </div>
                )}

                {/* Kids */}
                <div style={{ display: 'grid', gap: 8, padding: '2px 0' }}>{f.members.map(kidRow)}</div>

                {/* Last payment */}
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: B.mute,
                    fontWeight: 700,
                    borderTop: `1px solid ${B.rule}`,
                    paddingTop: 10,
                    marginTop: 'auto',
                  }}
                >
                  Last payment: {shortDate(lastPaymentByFamily.get(f.slug))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {editMode && (
                    <>
                      <Btn size="sm" onClick={() => setBillFam(f)}>🧾 Bill family</Btn>
                      <Btn size="sm" kind="soft" onClick={() => setPayKid(f.members[0])}>💛 Payment</Btn>
                      <InviteParentButton firstKid={f.members[0]} />
                    </>
                  )}
                  {canRemind && f.phone && (
                    <a href={smsLink(f.phone, smsBody)} title="Text the balance reminder">
                      <Btn size="sm" kind="ghost">📱 Text</Btn>
                    </a>
                  )}
                  {canRemind && f.email && settings && (
                    <a href={mailtoLink(f.email, settings.emailSubject, emailBody)} title="Email the balance reminder">
                      <Btn size="sm" kind="ghost">✉️ Email</Btn>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Kids without a family */}
          {shownNoFamily.length > 0 && (
            <Card style={{ display: 'flex', flexDirection: 'column', gap: 12, background: B.rowAlt }}>
              <SectionTitle style={{ margin: 0 }}>No family set</SectionTitle>
              <div style={{ fontSize: '0.8rem', color: B.inkSoft }}>
                Siblings who share a family get billed together on one card. Give each kid a family name and
                they'll join (or start) one.
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {shownNoFamily.map((k) => (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>{kidRow(k)}</div>
                    {editMode && (
                      <Btn size="sm" kind="ghost" title={`Set a family for ${k.full_name.split(' ')[0]}`} onClick={() => setEditKid(k)}>
                        ✏️
                      </Btn>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {billFam && (
        <ChargeModal
          kids={billFam.members}
          title={`Bill the ${familyLabel(billFam.slug)}`}
          onClose={() => setBillFam(null)}
        />
      )}
      {payKid && <PaymentModal kid={payKid} onClose={() => setPayKid(null)} />}
      {editKid && <KidModal kid={editKid} onClose={() => setEditKid(null)} />}
      {showAdd && <KidModal kid={null} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
