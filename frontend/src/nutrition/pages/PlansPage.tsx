// The Practices Library — PN's curriculum, organized by skill. The
// nutrition coach scans this page to pick which 2-week practice to
// assign next, then opens a client to set it. (This page is read-only;
// assignment happens on the client page in V2 — for now, the seed sets
// active practices and this library is the reference.)
//
// Also hosts the canonical PN Hand Portions reference panel at the top
// of the page so coaches can show it to a new client.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  N,
  SERIF_FONT,
  NUTRITION_SKILLS,
  NUTRITION_PRACTICES,
  HAND_PORTIONS,
  PRACTICE_WINDOW_DAYS,
  type NutritionSkill,
} from '../theme';

export function PlansPage() {
  const navigate = useNavigate();
  const [openSkill, setOpenSkill] = useState<string>(NUTRITION_SKILLS[0].id);

  return (
    <div className="px-6 sm:px-12 pt-10 max-w-6xl mx-auto pb-10">
      {/* Masthead — magazine cover style */}
      <section className="text-center mb-10">
        <p
          className="text-[10px] uppercase tracking-[0.5em] mb-2"
          style={{ color: N.coral }}
        >
          The PN Curriculum
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
          The Practices Library
        </h2>
        <p
          className="mt-3 text-sm italic max-w-2xl mx-auto leading-relaxed"
          style={{ color: N.mute, fontFamily: SERIF_FONT, fontSize: '1rem' }}
        >
          Coaches assign <em>one</em> practice at a time. The client works it
          for {PRACTICE_WINDOW_DAYS} days. When the client can do it at
          9-or-10-of-10 confidence, the next practice is layered in.
          <br />
          <span style={{ color: N.muteFaint, fontStyle: 'italic' }}>
            — adapted from Precision Nutrition's coaching framework
          </span>
        </p>
      </section>

      {/* Hand portions reference — PN's signature visual */}
      <HandPortionsPanel />

      {/* The library — skill-by-skill */}
      <section className="mt-12">
        <SectionHead
          title="Skills & practices"
          subtitle="The five PN skills, each broken into daily practices in sequence"
        />

        {/* Skill-row tabs */}
        <div
          className="flex flex-wrap items-center gap-2 mb-6 border-b pb-3"
          style={{ borderColor: N.rule }}
        >
          {NUTRITION_SKILLS.map((s) => {
            const active = openSkill === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setOpenSkill(s.id)}
                className="text-[11px] uppercase tracking-[0.25em] px-3 py-1.5 italic rounded-full"
                style={{
                  background: active ? `${s.color}1F` : 'transparent',
                  color: active ? s.color : N.mute,
                  border: `1px solid ${active ? s.color : N.rule}`,
                  fontFamily: SERIF_FONT,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Selected skill — header card + practice list */}
        {NUTRITION_SKILLS.filter((s) => s.id === openSkill).map((s) => (
          <SkillSection key={s.id} skill={s} />
        ))}
      </section>

      {/* CTA to clients page */}
      <section className="mt-12 text-center">
        <p
          className="italic mb-4"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontSize: '1.05rem' }}
        >
          Pick the right practice for the right client. Then go assign it.
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
          PN Signature Tool
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

function SkillSection({ skill }: { skill: NutritionSkill }) {
  const practices = NUTRITION_PRACTICES.filter((p) => p.skillId === skill.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      <header
        className="mb-5 pb-4 border-b"
        style={{ borderColor: N.ruleSoft }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-1"
          style={{ color: skill.color }}
        >
          Skill
        </p>
        <h3
          className="leading-tight mb-1.5"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: '2.25rem',
            fontWeight: 600,
          }}
        >
          {skill.label}
        </h3>
        <p
          className="text-sm italic max-w-2xl"
          style={{ color: N.inkSoft, fontFamily: SERIF_FONT, fontSize: '1rem' }}
        >
          {skill.blurb}
        </p>
      </header>

      <ol>
        {practices.map((p, i) => (
          <li
            key={p.id}
            className="grid grid-cols-[40px_1fr] gap-4 py-5 border-b"
            style={{ borderColor: N.rule }}
          >
            <span
              style={{
                fontFamily: SERIF_FONT,
                color: skill.color,
                fontSize: '2rem',
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 0.9,
              }}
            >
              {String(i + 1).padStart(2, '0')}.
            </span>
            <div>
              <h4
                className="leading-tight mb-1"
                style={{
                  fontFamily: SERIF_FONT,
                  color: N.ink,
                  fontSize: '1.5rem',
                  fontWeight: 600,
                }}
              >
                {p.label}
              </h4>
              <p
                className="italic mb-2"
                style={{
                  color: N.inkSoft,
                  fontFamily: SERIF_FONT,
                  fontSize: '1.05rem',
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
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 text-center">
      <h3
        className="leading-none"
        style={{
          fontFamily: SERIF_FONT,
          color: N.ink,
          fontSize: '2.25rem',
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <p
        className="text-xs italic mt-2"
        style={{ color: N.mute, fontFamily: SERIF_FONT }}
      >
        {subtitle}
      </p>
    </div>
  );
}
