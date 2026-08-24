// Kids — the roster. Search, family + day filters, sort, and quick
// actions on every active kid. Away and former kids live on their own
// quiet pages; this list is "who's in care right now".

import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { Client } from '../../lib/database.types';
import {
  B,
  ALL_DAYS,
  DAY_SHORT,
  readFamilySlug,
  familyLabel,
  readParent,
  readDays,
  daysLabel,
  readBalance,
  ageOf,
} from '../theme';
import { useKids } from '../lib/data';
import {
  Card,
  EmptyState,
  Btn,
  Avatar,
  AllergyBadge,
  BalancePill,
  TableWrap,
  Th,
  Td,
  inputStyle,
} from '../components/ui';
import { KidModal } from '../components/KidModal';
import { PaymentModal } from '../components/PaymentModal';

type SortKey = 'name' | 'balance';

/** Small pill toggle — same idiom as the day picker in KidModal. */
function PillToggle({
  on,
  onClick,
  children,
  title,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        border: 'none',
        cursor: 'pointer',
        borderRadius: B.pill,
        padding: '7px 13px',
        fontSize: '0.78rem',
        fontWeight: 800,
        fontFamily: B.fontDisplay,
        background: on ? B.accent : '#f2ede4',
        color: on ? '#fff' : B.inkSoft,
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export function KidsPage() {
  const { editMode } = useOutletContext<{ editMode: boolean }>();
  const { data: kids, isLoading } = useKids();

  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('name');

  const [showAdd, setShowAdd] = useState(false);
  const [editKid, setEditKid] = useState<Client | null>(null);
  const [payKid, setPayKid] = useState<Client | null>(null);

  const active = useMemo(() => (kids ?? []).filter((k) => k.status === 'active'), [kids]);
  const awayCount = useMemo(() => (kids ?? []).filter((k) => k.status === 'paused').length, [kids]);
  const formerCount = useMemo(() => (kids ?? []).filter((k) => k.status === 'archived').length, [kids]);

  const familySlugs = useMemo(() => {
    const set = new Set<string>();
    for (const k of active) {
      const slug = readFamilySlug(k);
      if (slug) set.add(slug);
    }
    return Array.from(set).sort();
  }, [active]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = active.filter((k) => {
      if (family && readFamilySlug(k) !== family) return false;
      if (days.length) {
        const kidDays = readDays(k);
        if (!days.some((d) => kidDays.includes(d))) return false;
      }
      if (q) {
        const slug = readFamilySlug(k);
        const hay = [k.full_name, slug, familyLabel(slug), readParent(k)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === 'balance') {
        const diff = readBalance(b) - readBalance(a);
        if (Math.abs(diff) > 0.005) return diff;
      }
      return a.full_name.localeCompare(b.full_name);
    });
  }, [active, search, family, days, sort]);

  const filtersOn = search.trim() !== '' || family !== '' || days.length > 0;

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }
  function clearFilters() {
    setSearch('');
    setFamily('');
    setDays([]);
  }

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center', color: B.mute }}>Gathering the roster…</div>;
  }

  const quietLink = (to: string, label: string) => (
    <Link to={to} style={{ color: B.primaryDeep, fontWeight: 800, textDecoration: 'none' }}>
      {label}
    </Link>
  );

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Filters */}
      <Card pad={16}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, flex: '1 1 200px', maxWidth: 340 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search kids, families, parents…"
            aria-label="Search the roster"
          />
          <select
            style={{ ...inputStyle, width: 'auto', minWidth: 150 }}
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            aria-label="Filter by family"
          >
            <option value="">All families</option>
            {familySlugs.map((slug) => (
              <option key={slug} value={slug}>
                {familyLabel(slug)}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <PillToggle on={sort === 'name'} onClick={() => setSort('name')} title="Sort alphabetically">
              Name A–Z
            </PillToggle>
            <PillToggle on={sort === 'balance'} onClick={() => setSort('balance')} title="Sort by who owes the most">
              Biggest balance
            </PillToggle>
          </div>
          {editMode && (
            <Btn onClick={() => setShowAdd(true)} style={{ marginLeft: 'auto' }}>
              + Add kid
            </Btn>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: B.mute, letterSpacing: '0.04em', textTransform: 'uppercase', marginRight: 2 }}>
            Days
          </span>
          {ALL_DAYS.map((d) => (
            <PillToggle key={d} on={days.includes(d)} onClick={() => toggleDay(d)}>
              {DAY_SHORT[d]}
            </PillToggle>
          ))}
          {filtersOn && (
            <Btn size="sm" kind="ghost" onClick={clearFilters} style={{ marginLeft: 6 }}>
              Clear filters
            </Btn>
          )}
        </div>
      </Card>

      {/* Roster */}
      {active.length === 0 ? (
        <Card pad={0}>
          <EmptyState
            emoji="🧸"
            title="No kids in care right now"
            body={
              editMode
                ? 'Add a kid to get the roster going — family, parent contact, days, and rates all live on their card.'
                : 'When kids join the roster, they show up here. Flip on editing to add one.'
            }
            action={editMode ? <Btn size="lg" onClick={() => setShowAdd(true)}>+ Add your first kid</Btn> : undefined}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card pad={0}>
          <EmptyState
            emoji="🔍"
            title="No kids match those filters"
            body="Try a different search, family, or day."
            action={<Btn kind="ghost" onClick={clearFilters}>Clear filters</Btn>}
          />
        </Card>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Kid</Th>
              <Th>Family</Th>
              <Th>Parent</Th>
              <Th>Days</Th>
              <Th>Allergies</Th>
              <Th>Balance</Th>
              <Th style={{ textAlign: 'right' }}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => {
              const slug = readFamilySlug(k);
              const parent = readParent(k);
              const age = ageOf(k.date_of_birth);
              return (
                <tr key={k.id}>
                  <Td>
                    <Link to={`/kids/${k.id}`} style={{ textDecoration: 'none', color: B.ink, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={k.full_name} size={34} />
                      <span style={{ fontWeight: 800 }}>
                        {k.full_name}
                        {age && (
                          <span style={{ color: B.mute, fontWeight: 700, marginLeft: 7, fontSize: '0.76rem' }}>{age}</span>
                        )}
                      </span>
                    </Link>
                  </Td>
                  <Td style={{ color: B.inkSoft, fontWeight: 700 }}>{slug ? familyLabel(slug) : '—'}</Td>
                  <Td>
                    <div style={{ fontWeight: 700, color: B.inkSoft }}>{parent || '—'}</div>
                    {k.phone && <div style={{ fontSize: '0.74rem', color: B.mute, marginTop: 1 }}>{k.phone}</div>}
                  </Td>
                  <Td style={{ color: B.inkSoft, whiteSpace: 'nowrap' }}>{daysLabel(k) || '—'}</Td>
                  <Td>
                    <AllergyBadge allergies={k.medical_notes} />
                  </Td>
                  <Td>
                    <BalancePill balance={readBalance(k)} />
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link to={`/kids/${k.id}`} style={{ textDecoration: 'none' }}>
                        <Btn size="sm" kind="ghost">View</Btn>
                      </Link>
                      {editMode && (
                        <>
                          <Btn size="sm" kind="soft" onClick={() => setPayKid(k)} title={`Record a payment for ${k.full_name}`}>
                            💛 Pay
                          </Btn>
                          <Btn size="sm" kind="ghost" onClick={() => setEditKid(k)} title={`Edit ${k.full_name}`}>
                            ✏️
                          </Btn>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}

      {/* Where the rest of the roster lives */}
      {(awayCount > 0 || formerCount > 0) && (
        <div style={{ color: B.mute, fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
          {awayCount > 0 && quietLink('/away', `${awayCount} kid${awayCount === 1 ? '' : 's'} away`)}
          {awayCount > 0 && formerCount > 0 && ' · '}
          {formerCount > 0 && quietLink('/former', `${formerCount} former`)}
        </div>
      )}

      {showAdd && <KidModal kid={null} onClose={() => setShowAdd(false)} />}
      {editKid && <KidModal kid={editKid} onClose={() => setEditKid(null)} />}
      {payKid && <PaymentModal kid={payKid} onClose={() => setPayKid(null)} />}
    </div>
  );
}
