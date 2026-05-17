// Resources — three-column drill-down: pick a Skill on the left,
// see its practices in the middle, see the mini-lessons attached to
// each practice on the right. Coaches share these with clients during
// check-ins.
//
// All lesson content is original; written for Trainer Pro from
// general nutrition + habit-coaching public knowledge.

import { useState, useMemo } from 'react';
import { N, SERIF_FONT, useActiveMethodology } from '../theme';
import { RESOURCES_BY_PRACTICE } from '../lib/nutritionResources';
import type { Resource } from '../lib/methodologies';

const KIND_META: Record<Resource['kind'], { label: string; color: string; emoji: string }> = {
  lesson: { label: 'Lesson', color: N.coral, emoji: '📖' },
  tip: { label: 'Tip', color: N.sage, emoji: '💡' },
  pitfall: { label: 'Watch out', color: N.honey, emoji: '⚠️' },
};

export function ResourcesPage() {
  const [methodology] = useActiveMethodology();
  const [skillId, setSkillId] = useState<string | null>(methodology.skills[0]?.id ?? null);
  const [practiceId, setPracticeId] = useState<string | null>(null);

  const practicesForSkill = useMemo(
    () =>
      methodology.practices
        .filter((p) => p.skillId === skillId)
        .sort((a, b) => a.level - b.level || a.order - b.order),
    [methodology, skillId],
  );

  const selectedPractice = methodology.practices.find((p) => p.id === practiceId);
  const resources: Resource[] = practiceId ? RESOURCES_BY_PRACTICE[practiceId] ?? [] : [];

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-6xl mx-auto pb-10">
      {/* Masthead */}
      <section className="text-center mb-8">
        <p
          className="text-[10px] uppercase tracking-[0.5em] mb-2"
          style={{ color: N.coral }}
        >
          {methodology.shortLabel} — Library
        </p>
        <h2
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
            fontWeight: 600,
          }}
        >
          Resources
        </h2>
        <p
          className="mt-3 text-sm italic max-w-2xl mx-auto leading-relaxed"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1rem' }}
        >
          Each practice has a small library of coach-written lessons, tips, and
          common-pitfall reminders. Open the practice your client is on to see what
          to share with them this week.
        </p>
      </section>

      {/* 3-column drill-down */}
      <section
        className="rounded-2xl overflow-hidden"
        style={{ background: N.card, border: `1px solid ${N.rule}` }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: '1fr 1.2fr 1.5fr', minHeight: 540 }}
        >
          {/* Skills */}
          <div
            className="overflow-y-auto p-4 border-r"
            style={{ borderColor: N.rule, background: N.inset }}
          >
            <ColumnHead>Skills</ColumnHead>
            {methodology.skills.map((s) => {
              const has = methodology.practices.some((p) => p.skillId === s.id);
              if (!has) return null;
              const active = skillId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSkillId(s.id);
                    setPracticeId(null);
                  }}
                  className="w-full text-left px-3 py-2 mb-1 rounded-md text-sm"
                  style={{
                    background: active ? `${s.color}1F` : 'transparent',
                    color: active ? s.color : N.ink,
                    fontWeight: active ? 600 : 500,
                    fontFamily: SERIF_FONT,
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Practices */}
          <div
            className="overflow-y-auto p-4 border-r"
            style={{ borderColor: N.rule }}
          >
            <ColumnHead>Practices</ColumnHead>
            {practicesForSkill.length === 0 ? (
              <p className="text-xs italic" style={{ color: N.muteFaint }}>
                Pick a skill on the left.
              </p>
            ) : (
              practicesForSkill.map((p) => {
                const active = practiceId === p.id;
                const rcount = (RESOURCES_BY_PRACTICE[p.id] ?? []).length;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPracticeId(p.id)}
                    className="w-full text-left p-2.5 mb-1.5 rounded-md"
                    style={{
                      background: active ? '#fff7f2' : 'transparent',
                      border: `1px solid ${active ? N.coral : 'transparent'}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-[9px] uppercase tracking-[0.25em]"
                        style={{ color: p.level === 1 ? '#D87456' : '#6B8E5A' }}
                      >
                        Level {p.level}
                      </span>
                      {rcount > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: N.coralSoft, color: N.coralDeep, fontWeight: 600 }}
                        >
                          {rcount}
                        </span>
                      )}
                    </div>
                    <span
                      className="block leading-tight mb-0.5"
                      style={{
                        fontFamily: SERIF_FONT,
                        color: N.ink,
                        fontWeight: 600,
                        fontSize: '0.95rem',
                      }}
                    >
                      {p.label}
                    </span>
                    <span
                      className="text-xs italic"
                      style={{ color: N.mute, fontFamily: SERIF_FONT }}
                    >
                      {p.blurb}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Resources */}
          <div className="overflow-y-auto p-5">
            <ColumnHead>{selectedPractice ? 'Mini-library' : 'Resources'}</ColumnHead>
            {!selectedPractice ? (
              <p className="text-xs italic" style={{ color: N.muteFaint }}>
                Pick a practice to see its lessons + tips.
              </p>
            ) : resources.length === 0 ? (
              <div
                className="rounded-xl p-6 text-center"
                style={{ border: `1px dashed ${N.rule}` }}
              >
                <p className="text-sm italic mb-1" style={{ color: N.mute }}>
                  No resources written for this practice yet.
                </p>
                <p className="text-xs" style={{ color: N.muteFaint }}>
                  Coach: send your own message or scribble a note for now.
                </p>
              </div>
            ) : (
              <>
                <div
                  className="rounded-lg p-3 mb-4"
                  style={{ background: '#fff7f2', border: `1px solid ${N.coral}33` }}
                >
                  <p
                    className="text-[10px] uppercase tracking-[0.3em] mb-1"
                    style={{ color: N.coral }}
                  >
                    Coach's note
                  </p>
                  <p className="text-xs italic" style={{ color: N.inkSoft }}>
                    {selectedPractice.rationale}
                  </p>
                </div>
                <ul className="space-y-3">
                  {resources.map((r) => {
                    const meta = KIND_META[r.kind];
                    return (
                      <li
                        key={r.id}
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: N.card,
                          border: `1px solid ${N.rule}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          className="px-4 py-3 border-b"
                          style={{
                            borderColor: N.rule,
                            background: `${meta.color}0E`,
                          }}
                        >
                          <p
                            className="text-[10px] uppercase tracking-[0.3em] mb-0.5"
                            style={{ color: meta.color }}
                          >
                            {meta.emoji} {meta.label}
                          </p>
                          <h4
                            className="leading-tight"
                            style={{
                              fontFamily: SERIF_FONT,
                              color: N.ink,
                              fontSize: '1.05rem',
                              fontWeight: 600,
                            }}
                          >
                            {r.title}
                          </h4>
                        </div>
                        <div className="px-4 py-3">
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
                          >
                            {r.body}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ColumnHead({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.4em] mb-3 pb-1.5 border-b"
      style={{ color: N.mute, borderColor: N.rule, fontFamily: SERIF_FONT }}
    >
      {children}
    </p>
  );
}
