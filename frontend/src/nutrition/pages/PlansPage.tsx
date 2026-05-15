// The Habit Library — the active methodology's curriculum, organized
// as Level 1 → Level 2. Inside each level the practices are grouped
// by skill. The coach scans this page to pick which 2-week practice
// to assign next, then opens the client to set it.
//
// Reads the active methodology via useActiveMethodology() — content
// swaps automatically when the coach picks a different methodology
// in Settings.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  N,
  SERIF_FONT,
  HAND_PORTIONS,
  PRACTICE_WINDOW_DAYS,
  useActiveMethodology,
  type NutritionSkill,
  type NutritionLevel,
  type Methodology,
} from '../theme';

export function PlansPage() {
  const navigate = useNavigate();
  const [methodology] = useActiveMethodology();
  const [openLevel, setOpenLevel] = useState<1 | 2>(1);

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-6xl mx-auto pb-10">
      {/* Masthead */}
      <section className="text-center mb-10">
        <p
          className="text-[10px] uppercase tracking-[0.5em] mb-2"
          style={{ color: methodology.color }}
        >
          {methodology.shortLabel} · The Curriculum
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
          The Habit Library
        </h2>
        <p
          className="mt-3 text-sm italic max-w-2xl mx-auto leading-relaxed"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1rem' }}
        >
          {methodology.philosophy}
          <br />
          <span style={{ color: N.muteFaint, fontStyle: 'italic' }}>
            Coaches assign <em>one</em> {methodology.practiceWord} at a time
            for ~{PRACTICE_WINDOW_DAYS} days, then layer in the next.
          </span>
        </p>
      </section>

      {/* Hand portions reference — only for methodologies that use it */}
      {methodology.usesHandPortions && <HandPortionsPanel />}

      {/* Empty-library prompt for the Custom methodology */}
      {methodology.practices.length === 0 && (
        <div
          className="rounded-2xl px-6 py-10 text-center"
          style={{ background: N.card, border: `1px dashed ${N.rule}` }}
        >
          <h3
            className="mb-2"
            style={{
              fontFamily: SERIF_FONT,
              color: N.ink,
              fontSize: '1.5rem',
              fontWeight: 600,
            }}
          >
            Your custom library is empty
          </h3>
          <p className="text-sm italic max-w-md mx-auto" style={{ color: N.mute }}>
            The Custom methodology lets you build your own habit library.
            Habit-creation UI is coming next — for now, switch to one of the
            ready-made methodologies in Settings → Coaching methodology.
          </p>
        </div>
      )}

      {/* Level 1 / Level 2 toggle */}
      {methodology.practices.length > 0 && (
        <section className={methodology.usesHandPortions ? 'mt-12' : 'mt-2'}>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-7">
            {methodology.levels.map((lvl) => {
              const active = openLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setOpenLevel(lvl.id)}
                  className="flex-1 text-left rounded-2xl px-5 py-4 transition-all"
                  style={{
                    background: active ? `${lvl.color}14` : N.card,
                    border: `2px solid ${active ? lvl.color : N.rule}`,
                  }}
                >
                  <p
                    className="text-[10px] uppercase tracking-[0.4em] mb-1.5"
                    style={{ color: lvl.color, fontFamily: SERIF_FONT }}
                  >
                    Level {lvl.id}
                  </p>
                  <h3
                    className="leading-tight mb-1"
                    style={{
                      fontFamily: SERIF_FONT,
                      color: N.ink,
                      fontSize: '1.375rem',
                      fontWeight: 600,
                    }}
                  >
                    {stripLevelPrefix(lvl.label)}
                  </h3>
                  <p
                    className="text-xs italic"
                    style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
                  >
                    {lvl.tagline}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected level — header + skills + practices */}
          {methodology.levels
            .filter((l) => l.id === openLevel)
            .map((lvl) => (
              <LevelSection key={lvl.id} level={lvl} methodology={methodology} />
            ))}
        </section>
      )}

      {/* CTA to clients page */}
      <section className="mt-12 text-center">
        <p
          className="italic mb-4"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
        >
          Pick the right {methodology.practiceWord} for the right client.
          Then go assign it.
        </p>
        <button
          onClick={() => navigate('/clients')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[11px] uppercase tracking-[0.3em] italic"
          style={{ background: N.sage, color: '#FFF', fontFamily: SERIF_FONT }}
        >
          Open the roster →
        </button>
      </section>
    </div>
  );
}

function stripLevelPrefix(label: string): string {
  // "Level 1 — Foundational Habits" → "Foundational Habits"
  // "Phase 1 — Rebuild trust" → "Rebuild trust"
  return label.replace(/^(Level|Phase)\s+\d+\s*[—–-]\s*/, '');
}

function LevelSection({
  level,
  methodology,
}: {
  level: NutritionLevel;
  methodology: Methodology;
}) {
  // Pull the skills that have at least one practice at this level,
  // and within each skill list the level-N practices in order.
  const skillsWithPractices = methodology.skills
    .map((s) => ({
      skill: s,
      practices: methodology.practices
        .filter((p) => p.skillId === s.id && p.level === level.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((x) => x.practices.length > 0);

  return (
    <div>
      {/* Level intro card */}
      <header
        className="rounded-2xl px-6 py-5 mb-7"
        style={{
          background: `${level.color}0F`,
          border: `1px solid ${level.color}40`,
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-2"
          style={{ color: level.color, fontFamily: SERIF_FONT }}
        >
          {level.tagline}
        </p>
        <h3
          className="leading-tight mb-2"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.875rem',
            fontWeight: 600,
          }}
        >
          {stripLevelPrefix(level.label)}
        </h3>
        <p
          className="text-sm italic max-w-3xl"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontSize: '1rem' }}
        >
          {level.blurb}
        </p>
      </header>

      {/* Each skill as its own card with its practices */}
      <div className="space-y-8">
        {skillsWithPractices.map(({ skill, practices }) => (
          <SkillCard key={skill.id} skill={skill} practices={practices} />
        ))}
      </div>
    </div>
  );
}

function SkillCard({
  skill,
  practices,
}: {
  skill: NutritionSkill;
  practices: Methodology['practices'];
}) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: N.card, border: `1px solid ${N.rule}` }}
    >
      <header
        className="px-6 py-4 border-b"
        style={{ borderColor: N.rule, background: N.inset }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-1"
          style={{ color: skill.color }}
        >
          Skill
        </p>
        <h4
          className="leading-tight mb-1"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.5rem',
            fontWeight: 600,
          }}
        >
          {skill.label}
        </h4>
        <p
          className="text-sm italic"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
        >
          {skill.blurb}
        </p>
      </header>

      <ol>
        {practices.map((p, i) => (
          <li
            key={p.id}
            className="grid grid-cols-[40px_1fr] gap-4 px-6 py-5 border-b last:border-b-0"
            style={{ borderColor: N.ruleSoft }}
          >
            <span
              style={{
                fontFamily: SERIF_FONT,
                color: skill.color,
                fontSize: '1.75rem',
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 0.9,
              }}
            >
              {String(i + 1).padStart(2, '0')}.
            </span>
            <div>
              <h5
                className="leading-tight mb-1"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                }}
              >
                {p.label}
              </h5>
              <p
                className="italic mb-2"
                style={{
                  color: N.inkSoft,
                  fontFamily: SERIF_FONT,
                  fontSize: '1rem',
                  lineHeight: 1.5,
                }}
              >
                {p.blurb}
              </p>
              <p
                className="text-sm"
                style={{ color: N.mute, fontFamily: SERIF_FONT, fontStyle: 'italic' }}
              >
                <span style={{ color: skill.color }}>Why this matters:</span>{' '}
                {p.rationale}
              </p>
              <p
                className="text-[10px] uppercase tracking-[0.2em] mt-2 italic"
                style={{ color: N.muteFaint, fontFamily: SERIF_FONT }}
              >
                How clients log it · {p.measure}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HandPortionsPanel() {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: N.card, border: `1px solid ${N.rule}` }}
    >
      <header
        className="px-6 py-4 border-b text-center"
        style={{ borderColor: N.rule, background: N.inset }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-1"
          style={{ color: N.coral }}
        >
          Signature Tool
        </p>
        <h3
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '1.875rem',
            fontWeight: 600,
          }}
        >
          The Hand Portions System
        </h3>
        <p
          className="mt-1 text-sm italic"
          style={{ color: N.mute, fontFamily: SERIF_FONT }}
        >
          Calorie control without weighing food — portion sizes scale with body size
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: N.rule }}>
        {HAND_PORTIONS.map((h) => (
          <div
            key={h.id}
            className="p-5"
            style={{ background: N.card }}
          >
            <div className="flex items-baseline gap-2 mb-2">
              <span
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: h.color }}
              >
                {h.macroLabel}
              </span>
            </div>
            <h4
              className="leading-tight mb-2"
              style={{
                fontFamily: SERIF_FONT,
                color: N.ink,
                fontSize: '1.625rem',
                fontWeight: 600,
              }}
            >
              {h.label}
            </h4>
            <p
              className="text-sm italic mb-2 leading-relaxed"
              style={{ color: N.inkSoft, fontFamily: SERIF_FONT }}
            >
              {h.blurb}
            </p>
            <p
              className="text-[11px] uppercase tracking-[0.2em] italic"
              style={{ color: N.mute, fontFamily: SERIF_FONT }}
            >
              {h.examples}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
