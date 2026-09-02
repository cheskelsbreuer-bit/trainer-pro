// Kids — the roster. Search, family + day filters, sort, and quick
// actions on every active kid. Away and former kids live on their own
// quiet pages; this list is "who's in care right now".

import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
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
  readKidTagIds,
  ageOf,
} from '../theme';
import { useKids, useSetKidStatus, useSetKidTags } from '../lib/data';
import { useBabysittingConfig, appendLog } from '../lib/config';
import {
  Card,
  EmptyState,
  Btn,
  Chip,
  Avatar,
  AllergyBadge,
  BalancePill,
  TableWrap,
  Th,
  Td,
  inputStyle,
} from '../components/ui';
import { KidModal } from '../components/KidModal';
import { ChargeModal } from '../components/ChargeModal';
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
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [family, setFamily] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('name');

  const [showAdd, setShowAdd] = useState(false);
  const [editKid, setEditKid] = useState<Client | null>(null);
  const [payKid, setPayKid] = useState<Client | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [billSelection, setBillSelection] = useState<Client[] | null>(null);
  const cfg = useBabysittingConfig();
  const setStatus = useSetKidStatus();
  const setKidTags = useSetKidTags();

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

  const selectedKids = active.filter((k) => selected.has(k.id));

  function toggleSelect(id: string) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function bulkArchive() {
    if (!selectedKids.length) return;
    if (!window.confirm(`Move ${selectedKids.length} kid${selectedKids.length === 1 ? '' : 's'} to Former? Their history stays; you can bring them back any time.`)) return;
    for (const k of selectedKids) {
      await setStatus.mutateAsync({ id: k.id, status: 'archived' });
    }
    if (cfg.data) cfg.save.mutate(appendLog(cfg.data, 'kid', `Moved ${selectedKids.length} kids to Former`));
    setSelected(new Set());
  }

  async function bulkTag(tagId: string) {
    for (const k of selectedKids) {
      if (readKidTagIds(k).includes(tagId)) continue;
      await setKidTags.mutateAsync({ id: k.id, tags: [...(k.tags ?? []), `ktag:${tagId}`] });
    }
    setSelected(new Set());
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
        <>
        {editMode && selected.size > 0 && (
          <Card pad={12}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip tone="primary">{selected.size} selected</Chip>
              <Btn size="sm" onClick={() => setBillSelection(selectedKids)}>🧾 Bill them</Btn>
              <Btn size="sm" kind="ghost" onClick={() => void bulkArchive()}>🗃 Move to Former</Btn>
              {(cfg.data?.kidTags ?? []).map((tg) => (
                <Btn
                  key={tg.id}
                  size="sm"
                  kind="ghost"
                  onClick={() => void bulkTag(tg.id)}
                  title={`Put your "${tg.label}" label on everyone selected. These are your own labels — add or remove them in Settings → Make it yours.`}
                >
                  🏷 Tag as "{tg.label}"
                </Btn>
              ))}
              <Btn size="sm" kind="ghost" onClick={() => setSelected(new Set())}>Clear</Btn>
            </div>
          </Card>
        )}
        <TableWrap>
          <thead>
            <tr>
              {editMode && <Th style={{ width: 34 }} />}
              <Th>Kid</Th>
              {/* On a phone these four fold up under the kid's name instead
                  of pushing the table wider than the screen. */}
              <Th className="bs-phone-hide">Family</Th>
              <Th className="bs-phone-hide">Parent</Th>
              <Th className="bs-phone-hide">Days</Th>
              <Th className="bs-phone-hide">Allergies</Th>
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
                // The whole row opens the kid — not just their name.
                <tr
                  key={k.id}
                  onClick={() => navigate(`/kids/${k.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {editMode && (
                    <Td>
                      <input
                        type="checkbox"
                        checked={selected.has(k.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(k.id)}
                        aria-label={`Select ${k.full_name}`}
                      />
                    </Td>
                  )}
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
                    {/* The phone version of the four columns hidden to the
                        right — same facts, stacked instead of spread. */}
                    <div className="bs-phone-only" style={{ marginTop: 5, fontSize: '0.74rem', color: B.mute, fontWeight: 700, lineHeight: 1.5 }}>
                      {[slug ? familyLabel(slug) : null, parent || null, daysLabel(k) || null]
                        .filter(Boolean)
                        .join(' · ')}
                      {k.medical_notes && (
                        <div style={{ marginTop: 4 }}>
                          <AllergyBadge allergies={k.medical_notes} />
                        </div>
                      )}
                    </div>
                  </Td>
                  <Td className="bs-phone-hide" style={{ color: B.inkSoft, fontWeight: 700 }}>{slug ? familyLabel(slug) : '—'}</Td>
                  <Td className="bs-phone-hide">
                    <div style={{ fontWeight: 700, color: B.inkSoft }}>{parent || '—'}</div>
                    {k.phone && <div style={{ fontSize: '0.74rem', color: B.mute, marginTop: 1 }}>{k.phone}</div>}
                  </Td>
                  <Td className="bs-phone-hide" style={{ color: B.inkSoft, whiteSpace: 'nowrap' }}>{daysLabel(k) || '—'}</Td>
                  <Td className="bs-phone-hide">
                    <AllergyBadge allergies={k.medical_notes} />
                  </Td>
                  <Td>
                    <BalancePill balance={readBalance(k)} />
                  </Td>
                  <Td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      {/* On a phone the whole row already opens the kid, so
                          this button is only taking width from their name. */}
                      <Link to={`/kids/${k.id}`} className="bs-phone-hide" style={{ textDecoration: 'none' }}>
                        <Btn size="sm" kind="ghost">View</Btn>
                      </Link>
                      {editMode && (
                        <>
                          <Btn size="sm" kind="soft" onClick={() => setPayKid(k)} title={`Record a payment for ${k.full_name}`}>
                            💛<span className="bs-phone-hide"> Pay</span>
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
        </>
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
      {billSelection && (
        <ChargeModal
          kids={billSelection}
          title={`Bill ${billSelection.length} kid${billSelection.length === 1 ? '' : 's'}`}
          onClose={() => {
            setBillSelection(null);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
