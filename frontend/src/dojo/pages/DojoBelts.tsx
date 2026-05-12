// Belts & Promotions — the central organizing concept of a dojo, given
// its own page. Students grouped by current rank in a vertical "honor
// wall" stack (lowest rank at top, black belt at the bottom — the
// traditional dojo wall order on the belt rack).
//
// Each rank row shows:
//   - the belt visual
//   - count of students currently at that rank
//   - students with progress bars toward next promotion
//   - a "Promote" button per student
//
// Eligible students (>= threshold classes since last promotion) get a
// gold "READY" badge.

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronUp, ShieldCheck, Award } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  DOJO_COLORS,
  DEFAULT_BELT_SYSTEM,
  BELT_SYSTEMS,
  readBeltFromTags,
  BELT_TAG_PREFIX,
  type BeltSystemId,
  type Belt,
} from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
  DojoStatTile,
} from '../components/DojoUI';
import { BeltChip } from '../components/BeltChip';

const CLASSES_FOR_PROMOTION = 30;

export function DojoBelts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [system] = useState<BeltSystemId>(DEFAULT_BELT_SYSTEM);

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

  // Group students by rank id; preserve the system's natural order.
  const ranks = useMemo(() => {
    const belts = BELT_SYSTEMS[system].belts;
    const byBelt = new Map<string, Client[]>();
    belts.forEach((b) => byBelt.set(b.id, []));
    const unranked: Client[] = [];
    (students ?? []).forEach((s) => {
      const b = readBeltFromTags(s.tags, system);
      if (b) {
        byBelt.get(b.id)!.push(s);
      } else {
        unranked.push(s);
      }
    });
    return { belts, byBelt, unranked };
  }, [students, system]);

  const eligibleCount = useMemo(() => {
    return (students ?? []).filter(
      (s) => Number(s.package_balance ?? 0) >= CLASSES_FOR_PROMOTION,
    ).length;
  }, [students]);

  const promote = useMutation({
    mutationFn: async (studentId: string) => {
      const student = (students ?? []).find((s) => s.id === studentId);
      if (!student) throw new Error('Student not found');
      const currentBelt = readBeltFromTags(student.tags, system);
      const belts = BELT_SYSTEMS[system].belts;
      const idx = currentBelt ? belts.findIndex((b) => b.id === currentBelt.id) : -1;
      const nextBelt = belts[idx + 1];
      if (!nextBelt) throw new Error('Already at highest rank in this system');
      const newTags = (student.tags ?? []).filter(
        (t) => !t.startsWith(BELT_TAG_PREFIX),
      );
      newTags.push(`${BELT_TAG_PREFIX}${nextBelt.id}`);
      const { error } = await supabase
        .from('clients')
        .update({ tags: newTags, package_balance: 0 })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dojo-students-all'] }),
  });

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="The path"
        title="Belts & Promotions"
        subtitle={`${BELT_SYSTEMS[system].label} system — students grouped by current rank.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <DojoStatTile
          label="Active students"
          value={(students ?? []).length}
          sublabel="across all ranks"
        />
        <DojoStatTile
          label="Ready for promotion"
          value={eligibleCount}
          emphasis="gold"
          sublabel={`≥ ${CLASSES_FOR_PROMOTION} classes since last belt`}
        />
        <DojoStatTile
          label="Black-belt students"
          value={(students ?? []).filter((s) => {
            const b = readBeltFromTags(s.tags, system);
            return b?.dan;
          }).length}
          emphasis="brand"
          sublabel="dan ranks and above"
        />
      </div>

      {/* Belt-rank stack — lowest first. Each rank gets its own card with
          the student list inside. */}
      <div className="space-y-4">
        {ranks.belts.map((belt) => {
          const list = ranks.byBelt.get(belt.id)!;
          return (
            <RankSection
              key={belt.id}
              belt={belt}
              students={list}
              onPromote={(id) => promote.mutate(id)}
              promoting={promote.isPending}
            />
          );
        })}

        {ranks.unranked.length > 0 && (
          <DojoCard>
            <DojoSectionHeader
              icon={<Award size={14} />}
              title="Not yet ranked"
              hint={`${ranks.unranked.length} student${ranks.unranked.length === 1 ? '' : 's'}`}
            />
            <div className="px-4 py-3 text-xs" style={{ color: DOJO_COLORS.textMuted }}>
              Set a starting belt for each student on the Students page or via
              their profile.
            </div>
            <ul
              className="divide-y"
              style={{ borderColor: DOJO_COLORS.divider }}
            >
              {ranks.unranked.map((s) => (
                <li
                  key={s.id}
                  className="px-4 py-2 flex items-center"
                  style={{ color: DOJO_COLORS.textPrimary }}
                >
                  {s.full_name}
                </li>
              ))}
            </ul>
          </DojoCard>
        )}
      </div>
    </DojoPage>
  );
}

function RankSection({
  belt,
  students,
  onPromote,
  promoting,
}: {
  belt: Belt;
  students: Client[];
  onPromote: (id: string) => void;
  promoting: boolean;
}) {
  if (students.length === 0) {
    // Render an empty placeholder strip so the sensei sees the rank exists
    // in the system, just nobody's there yet. Helps with mental layout
    // continuity when scrolling the dojo's path.
    return (
      <div
        className="flex items-center gap-4 px-4 py-2 rounded-md opacity-50"
        style={{
          background: DOJO_COLORS.bgPanel,
          border: `1px solid ${DOJO_COLORS.divider}`,
        }}
      >
        <BeltChip belt={belt} size="md" />
        <span
          className="text-xs italic"
          style={{ color: DOJO_COLORS.textMuted }}
        >
          0 students
        </span>
      </div>
    );
  }

  return (
    <DojoCard accent={belt.dan ? 'gold' : 'none'}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: DOJO_COLORS.divider }}
      >
        <div className="flex items-center gap-3">
          <BeltChip belt={belt} size="lg" />
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: DOJO_COLORS.textMuted }}
          >
            {students.length} student{students.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <ul
        className="divide-y"
        style={{ borderColor: DOJO_COLORS.divider }}
      >
        {students.map((s) => {
          const classes = Number(s.package_balance ?? 0);
          const progress = Math.min(1, classes / CLASSES_FOR_PROMOTION);
          const eligible = progress >= 1;
          return (
            <li
              key={s.id}
              className="px-4 py-3 flex items-center gap-4 hover:bg-[#1F1F25] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p
                  className="font-semibold mb-1"
                  style={{ color: DOJO_COLORS.textPrimary }}
                >
                  {s.full_name}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 max-w-md h-1.5 rounded-full overflow-hidden"
                    style={{ background: DOJO_COLORS.bgInset }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(progress * 100)}%`,
                        background: eligible
                          ? DOJO_COLORS.gold
                          : DOJO_COLORS.brand,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs whitespace-nowrap"
                    style={{
                      color: eligible
                        ? DOJO_COLORS.gold
                        : DOJO_COLORS.textSecondary,
                    }}
                  >
                    {classes} / {CLASSES_FOR_PROMOTION}
                  </span>
                </div>
              </div>
              {eligible && (
                <span
                  className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded"
                  style={{
                    background: DOJO_COLORS.gold,
                    color: '#1A1208',
                  }}
                >
                  Ready
                </span>
              )}
              <button
                onClick={() => onPromote(s.id)}
                disabled={promoting}
                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded disabled:opacity-40 hover:opacity-90 transition-opacity"
                style={{
                  background: DOJO_COLORS.brand,
                  color: '#FFF',
                }}
              >
                <ChevronUp size={12} /> Promote
              </button>
            </li>
          );
        })}
      </ul>
    </DojoCard>
  );
}

/** Eyebrow icon for empty unranked state. Kept here so DojoBelts is
 * self-contained. */
export { ShieldCheck };
