// ── The live logger — the screen that wins trainers ──────────────────
//
// One exercise at a time. Last-time numbers always in view. A set is
// 1-3 taps: adjust weight if needed, tap the big check. Rest timer
// starts itself. Works one-handed between sets, and the SAME component
// runs the client's solo days — coach and client log into the same
// history, so "last time" is always true.

import { useEffect, useMemo, useRef, useState } from 'react';
import { FLOOR as F, TYPE, RADII, HIT } from '../theme';
import { summarizeActual, type CoachBlock, type ActualBlock, type SetActual } from '../lib/workouts';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

function Check({ size = 22, color = F.goodInk }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.5 L10 18 L19.5 6.5"></path>
    </svg>
  );
}

interface SetState extends SetActual {
  done: boolean;
}

export function LoggerCore({
  title,
  subtitle,
  blocks,
  lastByName,
  finishLabel,
  onFinish,
  saving,
}: {
  title: string;
  subtitle?: string;
  blocks: CoachBlock[];
  lastByName: Map<string, ActualBlock>;
  finishLabel: string;
  onFinish: (actuals: ActualBlock[], note: string) => void;
  saving?: boolean;
}) {
  // Per-exercise set state, seeded from the plan (weight from last time
  // when we have it — the numbers are already right when the set starts).
  const [state, setState] = useState<SetState[][]>(() =>
    blocks.map((b) => {
      const last = lastByName.get(b.name.trim().toLowerCase());
      const lastWeight = last?.set_actuals?.find((s) => s.weight != null)?.weight ?? b.weight ?? null;
      const targetReps = typeof b.reps === 'number' ? b.reps : null;
      return Array.from({ length: Math.max(1, b.sets) }, () => ({
        weight: lastWeight,
        reps: targetReps,
        done: false,
      }));
    }),
  );
  const [active, setActive] = useState(0);
  const [note, setNote] = useState('');

  // Rest timer — starts on set completion, counts down, dismissible.
  const [rest, setRest] = useState<{ total: number; left: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!rest) return;
    timerRef.current = setInterval(() => {
      setRest((r) => {
        if (!r) return null;
        if (r.left <= 1) return null;
        return { ...r, left: r.left - 1 };
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [rest?.total]);

  const block = blocks[active];
  const sets = state[active] ?? [];
  const last = block ? lastByName.get(block.name.trim().toLowerCase()) : undefined;
  const allDone = useMemo(
    () => state.every((ex) => ex.every((s) => s.done)) && state.length > 0,
    [state],
  );

  function patchSet(si: number, patch: Partial<SetState>) {
    setState((st) =>
      st.map((ex, ei) => (ei === active ? ex.map((s, i) => (i === si ? { ...s, ...patch } : s)) : ex)),
    );
  }

  function completeSet(si: number) {
    const s = sets[si];
    patchSet(si, { done: !s.done });
    if (!s.done) {
      setRest({ total: block?.rest_sec ?? 75, left: block?.rest_sec ?? 75 });
      // Auto-advance to the next exercise when this one's sets are done.
      const willAllBeDone = sets.every((x, i) => (i === si ? true : x.done));
      if (willAllBeDone && active < blocks.length - 1) {
        setTimeout(() => setActive((a) => Math.min(a + 1, blocks.length - 1)), 350);
      }
    }
  }

  function finish() {
    const actuals: ActualBlock[] = blocks.map((b, ei) => ({
      ...b,
      set_actuals: (state[ei] ?? [])
        .filter((s) => s.done)
        .map((s) => ({ weight: s.weight, reps: s.reps })),
    }));
    onFinish(actuals, note.trim());
  }

  const groupLabel = block?.group ? `${block.group}${(blocks.slice(0, active + 1).filter((b) => b.group === block.group).length)}` : null;

  if (!block) {
    return <div style={{ color: F.mute, padding: 30, textAlign: 'center' }}>This plan has no exercises yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
          {subtitle ?? 'Live session'}
        </div>
        <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 26, textTransform: 'uppercase', lineHeight: 1.15 }}>{title}</div>
      </div>

      {/* Current exercise */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        {groupLabel && (
          <span style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 15, color: F.accent, letterSpacing: '0.05em' }}>{groupLabel}</span>
        )}
        <span style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 23, textTransform: 'uppercase' }}>{block.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: F.mute, ...num }}>
          {active + 1} of {blocks.length}
        </span>
      </div>

      {/* Last time — always visible */}
      <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.sm, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: F.mute, fontWeight: 600 }}>Last time</span>
        <span style={{ ...num, fontWeight: 700, fontSize: 14 }}>{last ? summarizeActual(last) : 'first time — set the tone'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: F.mute, ...num }}>
          Target {block.sets} × {block.reps}
        </span>
      </div>

      {/* Sets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sets.map((s, si) => (
          <div
            key={si}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: s.done ? F.goodSoft : F.card,
              border: `1.5px solid ${s.done ? '#3c5a48' : si === sets.findIndex((x) => !x.done) ? F.accent : F.edge}`,
              borderRadius: RADII.md, padding: '10px 12px', opacity: !s.done && sets.slice(0, si).some((x) => !x.done) ? 0.55 : 1,
            }}
          >
            <span style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 13, color: s.done ? F.goodSoftInk : F.mute, width: 40 }}>
              SET {si + 1}
            </span>
            <button
              onClick={() => patchSet(si, { weight: Math.max(0, (s.weight ?? 0) - 2.5) })}
              style={{ width: HIT, height: HIT, borderRadius: 13, border: 'none', background: F.edgeSoft, color: F.ink, fontWeight: 800, fontSize: 19, cursor: 'pointer' }}
            >
              −
            </button>
            <span style={{ ...num, fontWeight: 800, fontSize: 21, minWidth: 58, textAlign: 'center' }}>
              {s.weight ?? '—'}
            </span>
            <button
              onClick={() => patchSet(si, { weight: (s.weight ?? 0) + 2.5 })}
              style={{ width: HIT, height: HIT, borderRadius: 13, border: 'none', background: F.edgeSoft, color: F.ink, fontWeight: 800, fontSize: 19, cursor: 'pointer' }}
            >
              +
            </button>
            <button
              onClick={() => patchSet(si, { reps: Math.max(0, (s.reps ?? 0) - 1) })}
              style={{ width: 36, height: HIT, borderRadius: 13, border: 'none', background: 'transparent', color: F.mute, fontWeight: 800, fontSize: 17, cursor: 'pointer' }}
            >
              −
            </button>
            <span style={{ ...num, fontWeight: 800, fontSize: 21, minWidth: 30, textAlign: 'center' }}>{s.reps ?? '—'}</span>
            <button
              onClick={() => patchSet(si, { reps: (s.reps ?? 0) + 1 })}
              style={{ width: 36, height: HIT, borderRadius: 13, border: 'none', background: 'transparent', color: F.mute, fontWeight: 800, fontSize: 17, cursor: 'pointer' }}
            >
              +
            </button>
            <button
              onClick={() => completeSet(si)}
              aria-label={s.done ? 'Undo set' : 'Complete set'}
              style={{
                marginLeft: 'auto', width: 52, height: 52, borderRadius: 15, border: 'none', cursor: 'pointer',
                background: s.done ? F.good : F.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Check color={s.done ? F.goodInk : F.accentInk} />
            </button>
          </div>
        ))}
      </div>

      {/* Rest timer */}
      {rest && (
        <div style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 7, borderRadius: 4, background: F.edgeSoft, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((rest.left / rest.total) * 100)}%`, height: '100%', background: F.accent, transition: 'width 1s linear' }}></div>
          </div>
          <span style={{ ...num, fontWeight: 800, fontSize: 19 }}>
            {Math.floor(rest.left / 60)}:{String(rest.left % 60).padStart(2, '0')}
          </span>
          <button onClick={() => setRest(null)} style={{ border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, borderRadius: RADII.pill, padding: '7px 13px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: TYPE.body }}>
            Skip rest
          </button>
        </div>
      )}

      {/* Exercise rail */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {blocks.map((b, i) => {
          const doneAll = (state[i] ?? []).every((s) => s.done);
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                border: 'none', cursor: 'pointer', borderRadius: RADII.pill, padding: '8px 14px',
                fontSize: 12.5, fontWeight: 700, fontFamily: TYPE.body, minHeight: 38,
                background: i === active ? F.ink : doneAll ? F.goodSoft : F.edgeSoft,
                color: i === active ? F.bg : doneAll ? F.goodSoftInk : F.inkSoft,
              }}
            >
              {b.group ? `${b.group} · ` : ''}{b.name}
            </button>
          );
        })}
      </div>

      {/* Session note */}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Quick note — “shoulder pinchy, switched to DB”"
        style={{
          height: HIT, background: F.card, border: `1.5px dashed ${F.edge}`, borderRadius: RADII.sm,
          color: F.ink, padding: '0 14px', fontSize: 14, fontFamily: TYPE.body, outline: 'none',
        }}
      />

      {/* Finish */}
      <button
        onClick={finish}
        disabled={saving}
        style={{
          height: 54, borderRadius: RADII.md, border: 'none', cursor: 'pointer',
          background: allDone ? F.good : F.ink, color: allDone ? F.goodInk : F.bg,
          fontWeight: 800, fontSize: 15.5, fontFamily: TYPE.body, opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Saving…' : finishLabel}
      </button>
    </div>
  );
}
