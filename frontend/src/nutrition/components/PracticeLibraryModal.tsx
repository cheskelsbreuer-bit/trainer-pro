// Practice Library — three-column drill-down picker for assigning a
// practice to a client. Inspired by the standard pattern in habit-based
// coaching software: Skill → Practice → Practice option / variant.
//
// Column 1: Skills (grouped by Level 1 / Level 2)
// Column 2: Practices in the chosen skill
// Column 3: Practice options (variants — different cadences / measures)

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import {
  N,
  SERIF_FONT,
  useActiveMethodology,
  type NutritionPractice,
} from '../theme';

interface Option {
  id: string;
  label: string;
  description: string;
  /** Optional override for the measure shown to the client. */
  measure?: string;
}

/** Build "practice options" for a given practice. Each option is a
 *  cadence or intensity variant — e.g. "1x/day", "3x/day", "weekdays".
 *  We auto-generate sensible options based on the practice's measure
 *  string. The coach can also write a custom note (last option). */
function optionsForPractice(p: NutritionPractice): Option[] {
  const meas = (p.measure || '').toLowerCase();
  const out: Option[] = [];
  if (meas.includes('per meal')) {
    out.push(
      { id: 'first-meal', label: 'First meal of the day', description: 'Just one meal per day, every day.' },
      { id: 'two-meals', label: 'Two meals a day', description: 'Pick the two meals where it\'s easiest to start.' },
      { id: 'every-meal', label: 'Every meal', description: 'Aim for every meal, every day.' },
    );
  } else if (meas.includes('per day')) {
    out.push(
      { id: 'weekdays', label: 'Weekdays only', description: 'Mon–Fri. Weekends are free.' },
      { id: 'every-day', label: 'Every day', description: 'Daily, no exceptions.' },
    );
  } else if (meas.includes('per week') || meas.includes('sessions per week')) {
    out.push(
      { id: '3x', label: '3 times a week', description: 'A solid starting cadence.' },
      { id: '5x', label: '5 times a week', description: 'Higher commitment.' },
    );
  } else if (meas.includes('glasses') || meas.includes('litres')) {
    out.push(
      { id: '6-glasses', label: '6 glasses per day', description: 'Roughly 1.5 litres.' },
      { id: '8-glasses', label: '8 glasses per day', description: 'Roughly 2 litres — the typical target.' },
    );
  } else {
    out.push(
      { id: 'standard', label: 'Standard target', description: p.measure },
    );
  }
  out.push({
    id: 'custom',
    label: 'Custom — set my own target',
    description: 'Coach writes a specific measurable cadence for this client.',
  });
  return out;
}

export function PracticeLibraryModal({
  initialPracticeId,
  onSelect,
  onClose,
}: {
  initialPracticeId?: string;
  onSelect: (practiceId: string, optionLabel: string | null) => void;
  onClose: () => void;
}) {
  const [methodology] = useActiveMethodology();
  const initialPractice = initialPracticeId
    ? methodology.practices.find((p) => p.id === initialPracticeId)
    : null;
  const [skillId, setSkillId] = useState<string | null>(
    initialPractice?.skillId ?? methodology.skills[0]?.id ?? null,
  );
  const [practiceId, setPracticeId] = useState<string | null>(initialPracticeId ?? null);
  const [optionId, setOptionId] = useState<string | null>(null);
  const [customMeasure, setCustomMeasure] = useState('');

  const practicesForSkill = useMemo(
    () =>
      methodology.practices
        .filter((p) => p.skillId === skillId)
        .sort((a, b) => a.level - b.level || a.order - b.order),
    [methodology, skillId],
  );
  const selectedPractice = methodology.practices.find((p) => p.id === practiceId);
  const options = selectedPractice ? optionsForPractice(selectedPractice) : [];
  const selectedOption = options.find((o) => o.id === optionId);

  // Group skills by level for the column 1 dividers
  const skillsByLevel = useMemo(() => {
    const byLevel: Record<1 | 2, typeof methodology.skills> = { 1: [], 2: [] };
    for (const s of methodology.skills) {
      const lvls = new Set(
        methodology.practices.filter((p) => p.skillId === s.id).map((p) => p.level),
      );
      if (lvls.has(1)) byLevel[1].push(s);
      if (lvls.has(2)) byLevel[2].push(s);
    }
    return byLevel;
  }, [methodology]);

  function confirm() {
    if (!practiceId) return;
    const measure =
      optionId === 'custom'
        ? customMeasure.trim() || 'Custom target'
        : selectedOption?.label ?? null;
    onSelect(practiceId, measure);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(20,20,30,0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-4xl bg-white sm:rounded-2xl overflow-hidden flex flex-col max-h-screen"
        style={{ border: `1px solid ${N.rule}`, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header
          className="px-6 py-4 border-b flex items-start justify-between"
          style={{ borderColor: N.rule, background: N.inset }}
        >
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.4em] mb-1"
              style={{ color: N.coral, fontFamily: SERIF_FONT }}
            >
              {methodology.shortLabel} — Library
            </p>
            <h2
              className="leading-tight"
              style={{ fontFamily: SERIF_FONT, color: N.ink, fontSize: '1.5rem', fontWeight: 600 }}
            >
              Practice Library
            </h2>
            <p
              className="text-sm italic mt-0.5"
              style={{ color: N.mute, fontFamily: SERIF_FONT }}
            >
              Pick a skill, a practice, and a cadence to assign.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full inline-flex items-center justify-center"
            style={{ color: N.mute }}
          >
            <X size={18} />
          </button>
        </header>

        {/* 3 columns */}
        <div
          className="grid flex-1 overflow-hidden"
          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
        >
          {/* Skills column */}
          <div
            className="overflow-y-auto border-r p-4"
            style={{ borderColor: N.rule }}
          >
            <ColumnHead label="Skills" />
            {(['1', '2'] as const).map((lvl) => {
              const list = skillsByLevel[Number(lvl) as 1 | 2];
              if (list.length === 0) return null;
              return (
                <div key={lvl} className="mb-3">
                  <p
                    className="text-[9px] uppercase tracking-[0.4em] mb-1.5"
                    style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
                  >
                    {lvl === '1' ? 'Level 1 — Foundations' : 'Level 2 — Refinement'}
                  </p>
                  {list.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSkillId(s.id);
                        setPracticeId(null);
                        setOptionId(null);
                      }}
                      className="w-full text-left px-2.5 py-1.5 mb-0.5 rounded-md text-sm"
                      style={{
                        background: skillId === s.id ? `${s.color}1F` : 'transparent',
                        color: skillId === s.id ? s.color : N.ink,
                        fontWeight: skillId === s.id ? 600 : 500,
                        fontFamily: SERIF_FONT,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Practices column */}
          <div
            className="overflow-y-auto border-r p-4"
            style={{ borderColor: N.rule }}
          >
            <ColumnHead label="Practices" />
            {practicesForSkill.length === 0 ? (
              <p className="text-xs italic" style={{ color: N.muteFaint }}>
                Pick a skill on the left.
              </p>
            ) : (
              practicesForSkill.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPracticeId(p.id);
                    setOptionId(null);
                  }}
                  className="w-full text-left p-2.5 mb-1.5 rounded-md"
                  style={{
                    background: practiceId === p.id ? '#fff7f2' : 'transparent',
                    border: `1px solid ${practiceId === p.id ? N.coral : 'transparent'}`,
                  }}
                >
                  <span
                    className="text-[9px] uppercase tracking-[0.25em] block mb-0.5"
                    style={{ color: p.level === 1 ? '#D87456' : '#6B8E5A' }}
                  >
                    Level {p.level}
                  </span>
                  <span
                    className="block leading-tight mb-0.5"
                    style={{ fontFamily: SERIF_FONT, color: N.ink, fontWeight: 600, fontSize: '0.95rem' }}
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
              ))
            )}
          </div>

          {/* Practice options column */}
          <div className="overflow-y-auto p-4">
            <ColumnHead label="Practice options" />
            {!selectedPractice ? (
              <p className="text-xs italic" style={{ color: N.muteFaint }}>
                Pick a practice in the middle.
              </p>
            ) : (
              <>
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{ background: '#fff7f2', border: `1px solid ${N.coral}33` }}
                >
                  <p
                    className="text-[10px] uppercase tracking-[0.3em] mb-1"
                    style={{ color: N.coral }}
                  >
                    Why this matters
                  </p>
                  <p className="text-xs italic" style={{ color: N.inkSoft }}>
                    {selectedPractice.rationale}
                  </p>
                </div>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setOptionId(opt.id)}
                    className="w-full text-left p-2.5 mb-1.5 rounded-md"
                    style={{
                      background: optionId === opt.id ? `${N.sage}14` : 'transparent',
                      border: `1px solid ${optionId === opt.id ? N.sage : N.rule}`,
                    }}
                  >
                    <span
                      className="block text-sm"
                      style={{ color: N.ink, fontWeight: 600, fontFamily: SERIF_FONT }}
                    >
                      {opt.label}
                    </span>
                    <span
                      className="block text-xs italic mt-0.5"
                      style={{ color: N.mute, fontFamily: SERIF_FONT }}
                    >
                      {opt.description}
                    </span>
                  </button>
                ))}
                {optionId === 'custom' && (
                  <div className="mt-2">
                    <p className="text-xs mb-1" style={{ color: N.mute }}>
                      What's the target?
                    </p>
                    <input
                      value={customMeasure}
                      onChange={(e) => setCustomMeasure(e.target.value)}
                      placeholder="e.g. 4 days a week, after dinner"
                      autoFocus
                      className="w-full px-3 py-2 text-sm rounded-md"
                      style={{
                        background: N.inset,
                        color: N.ink,
                        border: `1px solid ${N.rule}`,
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer
          className="px-6 py-4 border-t flex items-center justify-end gap-2"
          style={{ borderColor: N.rule, background: N.inset }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-semibold"
            style={{ color: N.mute, background: 'transparent' }}
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!practiceId || !optionId}
            className="px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-40"
            style={{ background: N.coral, color: '#fff' }}
          >
            Assign to client
          </button>
        </footer>
      </div>
    </div>
  );
}

function ColumnHead({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.4em] mb-3 pb-1.5 border-b"
      style={{ color: N.mute, borderColor: N.rule, fontFamily: SERIF_FONT }}
    >
      {label}
    </p>
  );
}
