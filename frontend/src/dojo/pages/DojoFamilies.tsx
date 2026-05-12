// Families — sibling/parent memberships. Most dojos have multiple kids
// from one family enrolled; the sensei wants to see the family unit, who
// trains, what belts they hold, and the combined tuition.
//
// Families are derived from clients.tags entries like `family:smith`.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { HeartHandshake, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Client } from '../../lib/database.types';
import {
  DOJO_COLORS,
  readBeltFromTags,
  readFamilyFromTags,
  useActiveBeltSystem,
} from '../theme';
import {
  DojoPage,
  DojoPageHeader,
  DojoCard,
  DojoSectionHeader,
} from '../components/DojoUI';
import { BeltChip } from '../components/BeltChip';

export function DojoFamilies() {
  const { user } = useAuth();
  const [system] = useActiveBeltSystem();

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
    const map = new Map<string, Client[]>();
    (students ?? []).forEach((s) => {
      const f = readFamilyFromTags(s.tags);
      if (!f) return;
      if (!map.has(f)) map.set(f, []);
      map.get(f)!.push(s);
    });
    return Array.from(map.entries())
      .map(([name, members]) => ({ name, members }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  const studentsWithoutFamily = useMemo(
    () => (students ?? []).filter((s) => !readFamilyFromTags(s.tags)),
    [students],
  );

  return (
    <DojoPage>
      <DojoPageHeader
        eyebrow="Family memberships"
        title="Families"
        subtitle="Parents + siblings train together. Group their accounts and share tuition."
      />

      {families.length === 0 ? (
        <DojoCard>
          <DojoSectionHeader
            icon={<HeartHandshake size={14} />}
            title="No families yet"
          />
          <div
            className="px-4 py-8 text-sm text-center"
            style={{ color: DOJO_COLORS.textMuted }}
          >
            Tag any student with a family name on the Students page (the
            "Family" field on the add-student drawer) and they'll appear here
            grouped together. Useful for sibling discounts and bulk billing.
          </div>
        </DojoCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {families.map(({ name, members }) => (
            <DojoCard key={name} accent="brand">
              <DojoSectionHeader
                icon={<HeartHandshake size={14} />}
                title={`${capitalize(name)} family`}
                hint={`${members.length} member${members.length === 1 ? '' : 's'}`}
              />
              <ul
                className="divide-y"
                style={{ borderColor: DOJO_COLORS.divider }}
              >
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/students/${m.id}`}
                        className="font-semibold hover:underline truncate block"
                        style={{ color: DOJO_COLORS.textPrimary }}
                      >
                        {m.full_name}
                      </Link>
                    </div>
                    <BeltChip
                      belt={readBeltFromTags(m.tags, system)}
                      size="sm"
                      showLabel
                    />
                  </li>
                ))}
              </ul>
            </DojoCard>
          ))}
        </div>
      )}

      <DojoCard>
        <DojoSectionHeader
          icon={<Users size={14} />}
          title="Solo students (no family tag)"
          hint={`${studentsWithoutFamily.length} student${studentsWithoutFamily.length === 1 ? '' : 's'}`}
        />
        {studentsWithoutFamily.length === 0 ? (
          <p
            className="px-4 py-6 text-sm text-center"
            style={{ color: DOJO_COLORS.textMuted }}
          >
            Every student is grouped into a family.
          </p>
        ) : (
          <ul
            className="divide-y"
            style={{ borderColor: DOJO_COLORS.divider }}
          >
            {studentsWithoutFamily.map((s) => (
              <li
                key={s.id}
                className="px-4 py-2 flex items-center gap-3 text-sm"
              >
                <Link
                  to={`/students/${s.id}`}
                  className="flex-1 truncate hover:underline"
                  style={{ color: DOJO_COLORS.textPrimary }}
                >
                  {s.full_name}
                </Link>
                <BeltChip
                  belt={readBeltFromTags(s.tags, system)}
                  size="sm"
                  showLabel={false}
                />
              </li>
            ))}
          </ul>
        )}
      </DojoCard>
    </DojoPage>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
