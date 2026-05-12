// Dojo students roster. Built for a sensei skimming the mat at a glance.
//
// Columns:
//   - Student (name + family chip)
//   - Belt rank (visible color bar)
//   - Time at rank (e.g., "8 months")
//   - Classes since last promotion (the attendance count toward next belt)
//   - Last attendance
//   - Quick actions (promote, edit belt)
//
// Filters: free-text search, belt rank dropdown, family dropdown.
// Add Student opens a slim drawer (re-uses the existing AddClient form
// concept from the trainer side — but with belt + family fields).

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  ShieldCheck,
  HeartHandshake,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Client } from '../../lib/database.types';
import {
  DOJO_COLORS,
  BELT_SYSTEMS,
  readBeltFromTags,
  readFamilyFromTags,
  BELT_TAG_PREFIX,
  useActiveBeltSystem,
  type BeltSystemId,
} from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoButton,
} from '../components/DojoUI';
import { BeltChip } from '../components/BeltChip';

export function DojoStudents() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [system] = useActiveBeltSystem();

  const [q, setQ] = useState('');
  const [beltFilter, setBeltFilter] = useState<string>('');
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [adding, setAdding] = useState(false);

  const { data: students } = useQuery({
    queryKey: ['dojo-students-all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });

  const families = useMemo(() => {
    const set = new Set<string>();
    (students ?? []).forEach((s) => {
      const f = readFamilyFromTags(s.tags);
      if (f) set.add(f);
    });
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const list = (students ?? []).map((s) => ({
      s,
      belt: readBeltFromTags(s.tags, system),
      family: readFamilyFromTags(s.tags),
    }));
    return list.filter(({ s, belt, family }) => {
      if (q) {
        const needle = q.toLowerCase();
        const hay =
          (s.full_name ?? '').toLowerCase() +
          ' ' +
          (s.email ?? '').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (beltFilter && belt?.id !== beltFilter) return false;
      if (familyFilter && family !== familyFilter) return false;
      return true;
    });
  }, [students, q, beltFilter, familyFilter, system]);

  const promote = useMutation({
    mutationFn: async (studentId: string) => {
      const student = students?.find((s) => s.id === studentId);
      if (!student) throw new Error('Student not found');
      const currentBelt = readBeltFromTags(student.tags, system);
      const belts = BELT_SYSTEMS[system].belts;
      const idx = currentBelt ? belts.findIndex((b) => b.id === currentBelt.id) : -1;
      const nextBelt = belts[idx + 1];
      if (!nextBelt) {
        // Don't silently wrap to white belt — refuse and let the UI explain.
        throw new Error('Already at the highest rank in this system.');
      }
      const newTags = (student.tags ?? []).filter(
        (t) => !t.startsWith(BELT_TAG_PREFIX),
      );
      newTags.push(`${BELT_TAG_PREFIX}${nextBelt.id}`);
      const { error } = await supabase
        .from('clients')
        .update({
          tags: newTags,
          // Reset attendance counter on promotion. Sensei increments it via
          // class attendance from the classes page (or manually).
          package_balance: 0,
        })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dojo-students-all'] }),
  });

  function atMaxRank(tags: string[] | null | undefined): boolean {
    const belts = BELT_SYSTEMS[system].belts;
    const currentBelt = readBeltFromTags(tags, system);
    if (!currentBelt) return false;
    return belts[belts.length - 1].id === currentBelt.id;
  }

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="Roster"
        title="Students"
        subtitle={
          students
            ? `${students.length} active on the mat`
            : 'Loading the dojo…'
        }
        action={
          <DojoButton onClick={() => setAdding(true)}>
            <Plus size={16} /> Add student
          </DojoButton>
        }
      />

      {/* Filters */}
      <DojoCard className="mb-4">
        <div className="px-4 py-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: DOJO_COLORS.textMuted }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search students…"
              className="w-full pl-9 pr-3 py-1.5 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            />
          </div>
          <select
            value={beltFilter}
            onChange={(e) => setBeltFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:outline-none"
            style={{
              background: DOJO_COLORS.bgInset,
              color: DOJO_COLORS.textPrimary,
              border: `1px solid ${DOJO_COLORS.divider}`,
            }}
          >
            <option value="">All ranks</option>
            {BELT_SYSTEMS[system].belts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:outline-none"
            style={{
              background: DOJO_COLORS.bgInset,
              color: DOJO_COLORS.textPrimary,
              border: `1px solid ${DOJO_COLORS.divider}`,
            }}
          >
            <option value="">All families</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </DojoCard>

      {/* Roster table */}
      <DojoCard>
        <DojoSectionHeader
          icon={<ShieldCheck size={14} />}
          title="The mat"
          hint={`${filtered.length} shown`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left uppercase tracking-wider"
                style={{ color: DOJO_COLORS.textMuted, fontSize: 11 }}
              >
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Belt</th>
                <th className="px-4 py-3 font-semibold">Time at rank</th>
                <th className="px-4 py-3 font-semibold">Classes since</th>
                <th className="px-4 py-3 font-semibold">Family</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: DOJO_COLORS.textMuted }}
                  >
                    No students match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map(({ s, belt, family }) => {
                  const maxed = atMaxRank(s.tags);
                  return (
                    <tr
                      key={s.id}
                      className="border-t hover:bg-[var(--dojo-bg-panel-hover)] transition-colors"
                      style={{ borderColor: DOJO_COLORS.divider }}
                    >
                      <td className="px-4 py-3">
                        <p
                          className="font-semibold"
                          style={{ color: DOJO_COLORS.textPrimary }}
                        >
                          {s.full_name}
                        </p>
                        {s.email && (
                          <p
                            className="text-xs"
                            style={{ color: DOJO_COLORS.textMuted }}
                          >
                            {s.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BeltChip belt={belt} size="md" />
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: DOJO_COLORS.textSecondary }}
                      >
                        {timeAtRank(s)}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-mono"
                        style={{ color: DOJO_COLORS.textPrimary }}
                      >
                        {s.package_balance ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {family ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                            style={{
                              background: DOJO_COLORS.bgInset,
                              color: DOJO_COLORS.textSecondary,
                              border: `1px solid ${DOJO_COLORS.divider}`,
                            }}
                          >
                            <HeartHandshake size={11} /> {family}
                          </span>
                        ) : (
                          <span style={{ color: DOJO_COLORS.textMuted, fontSize: 12 }}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => promote.mutate(s.id)}
                          disabled={promote.isPending || maxed}
                          title={maxed ? 'Already at the highest rank' : 'Promote to next rank'}
                          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            background: DOJO_COLORS.gold,
                            color: DOJO_COLORS.onGold,
                          }}
                        >
                          <ChevronUp size={12} />
                          {maxed ? 'Top rank' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DojoCard>

      {adding && (
        <AddStudentDrawer
          onClose={() => setAdding(false)}
          system={system}
          existingFamilies={families}
        />
      )}
    </DojoPage>
  );
}

function timeAtRank(s: Client): string {
  // Without a real promotion-history table yet, we approximate "time at
  // rank" by how long the client row has existed. Once promotions are
  // logged to a real table this can be swapped to last_promoted_at.
  const created = s.created_at ? new Date(s.created_at).getTime() : null;
  if (!created) return '—';
  const days = Math.floor((Date.now() - created) / 86400000);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}

function AddStudentDrawer({
  onClose,
  system,
  existingFamilies,
}: {
  onClose: () => void;
  system: BeltSystemId;
  existingFamilies: string[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [beltId, setBeltId] = useState(BELT_SYSTEMS[system].belts[0].id);
  const [family, setFamily] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error('Name is required');
      if (!user) throw new Error('Not signed in');
      const tags: string[] = [`${BELT_TAG_PREFIX}${beltId}`];
      if (family.trim()) tags.push(`family:${family.trim().toLowerCase()}`);
      const { error } = await supabase.from('clients').insert({
        trainer_id: user.id,
        full_name: fullName.trim(),
        email: email.trim() || null,
        status: 'active',
        tags,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dojo-students-all'] });
      qc.invalidateQueries({ queryKey: ['dojo-students'] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-md border"
        style={{
          background: DOJO_COLORS.bgPanel,
          borderColor: DOJO_COLORS.divider,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DojoSectionHeader
          icon={<Plus size={14} />}
          title="Onboard a new student"
        />
        <div className="p-4 space-y-3">
          <Field label="Full name">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            />
          </Field>
          <Field label="Email (optional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            />
          </Field>
          <Field label="Starting belt">
            <select
              value={beltId}
              onChange={(e) => setBeltId(e.target.value)}
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            >
              {BELT_SYSTEMS[system].belts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Family (optional — for sibling memberships)">
            <input
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              list="dojo-families-list"
              placeholder="e.g., Smith"
              className="w-full px-3 py-2 rounded text-sm focus:outline-none"
              style={{
                background: DOJO_COLORS.bgInset,
                color: DOJO_COLORS.textPrimary,
                border: `1px solid ${DOJO_COLORS.divider}`,
              }}
            />
            <datalist id="dojo-families-list">
              {existingFamilies.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>
          {create.error && (
            <p className="text-xs" style={{ color: DOJO_COLORS.danger }}>
              {(create.error as Error).message}
            </p>
          )}
        </div>
        <div
          className="px-4 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: DOJO_COLORS.divider }}
        >
          <DojoButton variant="ghost" onClick={onClose}>
            Cancel
          </DojoButton>
          <DojoButton
            onClick={() => create.mutate()}
            disabled={create.isPending || !fullName.trim()}
          >
            {create.isPending ? 'Saving…' : 'Add student'}
          </DojoButton>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs uppercase tracking-wider font-semibold mb-1"
        style={{ color: DOJO_COLORS.textSecondary }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
