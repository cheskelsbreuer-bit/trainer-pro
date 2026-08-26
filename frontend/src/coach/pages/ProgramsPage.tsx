// ── Programs — the plan builder ──────────────────────────────────────
//
// Templates are the coach's library ("Lower A"); assigning one copies
// it onto a client so their version can drift (loads bump, exercises
// swap) without touching the original. The editor is built for thumbs:
// steppers for sets, a cycling A/B/C chip for supersets, move/remove
// on every row.

import { useMemo, useState } from 'react';
import type { WorkoutPlan } from '../../lib/database.types';
import { FLOOR as F, TYPE, RADII, HIT, initialsOf } from '../theme';
import { useCoachClients } from '../lib/roster';
import { usePlans, useSavePlan, useDeletePlan, useAssignPlan, type CoachBlock } from '../lib/workouts';

const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const inputStyle: React.CSSProperties = {
  background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: 12,
  color: F.ink, fontSize: 14.5, fontFamily: TYPE.body, outline: 'none', padding: '0 12px', height: HIT,
};

function blankBlock(): CoachBlock {
  return { name: '', sets: 3, reps: 10, weight: null, rest_sec: 75 };
}

const GROUP_CYCLE: (string | undefined)[] = [undefined, 'A', 'B', 'C'];

// ── The editor ────────────────────────────────────────────────────────
function PlanEditor({
  plan,
  clientName,
  onClose,
}: {
  plan: WorkoutPlan | null; // null = new template
  clientName: string | null;
  onClose: () => void;
}) {
  const save = useSavePlan();
  const del = useDeletePlan();
  const [name, setName] = useState(plan?.name ?? '');
  const [blocks, setBlocks] = useState<CoachBlock[]>(() => {
    const ex = (plan?.exercises ?? []) as CoachBlock[];
    return ex.length ? ex.map((b) => ({ ...b })) : [blankBlock()];
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  function patch(i: number, p: Partial<CoachBlock>) {
    setBlocks((bs) => bs.map((b, bi) => (bi === i ? { ...b, ...p } : b)));
  }
  function move(i: number, dir: -1 | 1) {
    setBlocks((bs) => {
      const j = i + dir;
      if (j < 0 || j >= bs.length) return bs;
      const next = bs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function cycleGroup(i: number) {
    const cur = blocks[i]?.group;
    const idx = GROUP_CYCLE.indexOf(cur ?? undefined);
    const nextG = GROUP_CYCLE[(idx + 1) % GROUP_CYCLE.length];
    patch(i, { group: nextG });
  }

  const canSave = name.trim().length > 0 && blocks.some((b) => b.name.trim());

  async function submit() {
    const clean = blocks
      .filter((b) => b.name.trim())
      .map((b) => ({ ...b, name: b.name.trim(), reps: b.reps === '' ? 0 : b.reps }));
    await save.mutateAsync({
      id: plan?.id,
      name: name.trim(),
      client_id: plan?.client_id ?? null,
      exercises: clean,
    });
    onClose();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} aria-label="Back" style={{ width: HIT, height: HIT, borderRadius: 13, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontSize: 19, cursor: 'pointer' }}>
          ←
        </button>
        <div>
          <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
            {clientName ? `${clientName}'s plan` : plan ? 'Template' : 'New template'}
          </div>
          <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 23, textTransform: 'uppercase' }}>
            {plan ? 'Edit workout' : 'Build workout'}
          </div>
        </div>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Workout name — “Lower A”, “Push day”"
        autoFocus={!plan}
        style={{ ...inputStyle, fontWeight: 700, fontSize: 16 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {blocks.map((b, i) => (
          <div key={i} style={{ background: F.card, border: `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => cycleGroup(i)}
                title="Superset group — tap to cycle"
                style={{
                  width: 38, height: 38, borderRadius: 11, border: b.group ? 'none' : `1.5px dashed ${F.edge}`, cursor: 'pointer',
                  background: b.group ? F.accentSoft : 'transparent', color: b.group ? F.accentSoftInk : F.mute,
                  fontFamily: TYPE.display, fontWeight: 700, fontSize: 15, flexShrink: 0,
                }}
              >
                {b.group ?? '·'}
              </button>
              <input
                value={b.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="Exercise name"
                style={{ ...inputStyle, flex: 1, height: 38, fontWeight: 700, minWidth: 0 }}
              />
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" style={{ width: 34, height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: i === 0 ? F.edge : F.mute, fontSize: 15, cursor: 'pointer' }}>↑</button>
              <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down" style={{ width: 34, height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: i === blocks.length - 1 ? F.edge : F.mute, fontSize: 15, cursor: 'pointer' }}>↓</button>
              <button onClick={() => setBlocks((bs) => bs.filter((_, bi) => bi !== i))} aria-label="Remove exercise" style={{ width: 34, height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: F.bad, fontSize: 17, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => patch(i, { sets: Math.max(1, b.sets - 1) })} style={{ width: 34, height: 38, borderRadius: 11, border: 'none', background: F.edgeSoft, color: F.ink, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>−</button>
                <span style={{ ...num, fontWeight: 800, fontSize: 17, minWidth: 42, textAlign: 'center' }}>{b.sets}<span style={{ fontSize: 11, color: F.mute, fontWeight: 600 }}> set{b.sets === 1 ? '' : 's'}</span></span>
                <button onClick={() => patch(i, { sets: b.sets + 1 })} style={{ width: 34, height: 38, borderRadius: 11, border: 'none', background: F.edgeSoft, color: F.ink, fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>+</button>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 10.5, color: F.mute, fontWeight: 600, paddingLeft: 2 }}>reps</span>
                <input
                  value={String(b.reps ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    patch(i, { reps: /^\d+$/.test(v) ? Number(v) : v });
                  }}
                  placeholder="8-12"
                  inputMode="numeric"
                  style={{ ...inputStyle, height: 38, padding: '0 10px', ...num }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 10.5, color: F.mute, fontWeight: 600, paddingLeft: 2 }}>weight lb</span>
                <input
                  value={b.weight ?? ''}
                  onChange={(e) => patch(i, { weight: e.target.value === '' ? null : Number(e.target.value) || 0 })}
                  placeholder="—"
                  inputMode="decimal"
                  style={{ ...inputStyle, height: 38, padding: '0 10px', ...num }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 10.5, color: F.mute, fontWeight: 600, paddingLeft: 2 }}>rest sec</span>
                <input
                  value={b.rest_sec ?? ''}
                  onChange={(e) => patch(i, { rest_sec: e.target.value === '' ? undefined : Number(e.target.value) || 0 })}
                  placeholder="75"
                  inputMode="numeric"
                  style={{ ...inputStyle, height: 38, padding: '0 10px', ...num }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setBlocks((bs) => [...bs, blankBlock()])}
        style={{ height: HIT, borderRadius: RADII.sm, border: `1.5px dashed ${F.edge}`, background: 'transparent', color: F.inkSoft, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: TYPE.body }}
      >
        + Add exercise
      </button>

      {save.isError && (
        <div style={{ fontSize: 13, color: F.bad }}>Couldn't save — check the connection and try again.</div>
      )}

      <button
        onClick={() => void submit()}
        disabled={!canSave || save.isPending}
        style={{
          height: 54, borderRadius: RADII.md, border: 'none', cursor: 'pointer',
          background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 15.5, fontFamily: TYPE.body,
          opacity: !canSave || save.isPending ? 0.5 : 1,
        }}
      >
        {save.isPending ? 'Saving…' : 'Save workout'}
      </button>

      {plan && (
        confirmDelete ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, height: HIT, borderRadius: 12, border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: TYPE.body }}>Keep it</button>
            <button
              onClick={() => { void del.mutateAsync(plan.id).then(onClose); }}
              disabled={del.isPending}
              style={{ flex: 1, height: HIT, borderRadius: 12, border: `1.5px solid ${F.badEdge}`, background: F.badSoft, color: F.bad, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: TYPE.body }}
            >
              {del.isPending ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ height: 40, borderRadius: 12, border: 'none', background: 'transparent', color: F.mute, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: TYPE.body }}>
            Delete this workout
          </button>
        )
      )}
    </div>
  );
}

// ── Assign sheet ──────────────────────────────────────────────────────
function AssignRow({ template, onDone }: { template: WorkoutPlan; onDone: () => void }) {
  const { data: clients } = useCoachClients();
  const assign = useAssignPlan();
  const active = (clients ?? []).filter((c) => c.status === 'active');

  return (
    <div style={{ background: F.cardDeep, border: `1px solid ${F.edge}`, borderRadius: RADII.sm, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: F.mute, fontWeight: 600 }}>Give “{template.name}” to:</div>
      {active.length === 0 ? (
        <div style={{ fontSize: 13, color: F.mute }}>No active clients yet.</div>
      ) : (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {active.map((c) => (
            <button
              key={c.id}
              disabled={assign.isPending}
              onClick={() => { void assign.mutateAsync({ template, client_id: c.id }).then(onDone); }}
              style={{ border: 'none', cursor: 'pointer', borderRadius: RADII.pill, padding: '9px 14px', background: F.edgeSoft, color: F.ink, fontWeight: 700, fontSize: 13, fontFamily: TYPE.body, minHeight: 38 }}
            >
              {c.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export function ProgramsPage() {
  const { data: plans, isLoading } = usePlans();
  const { data: clients } = useCoachClients();
  const [editing, setEditing] = useState<WorkoutPlan | null | 'new'>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const clientName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients ?? []) m.set(c.id, c.full_name);
    return m;
  }, [clients]);

  const templates = useMemo(() => (plans ?? []).filter((p) => p.client_id === null), [plans]);
  const assigned = useMemo(() => {
    const byClient = new Map<string, WorkoutPlan[]>();
    for (const p of plans ?? []) {
      if (!p.client_id || !clientName.has(p.client_id)) continue; // fenced roster only
      const list = byClient.get(p.client_id) ?? [];
      list.push(p);
      byClient.set(p.client_id, list);
    }
    return [...byClient.entries()].sort((a, b) =>
      (clientName.get(a[0]) ?? '').localeCompare(clientName.get(b[0]) ?? ''));
  }, [plans, clientName]);

  if (editing !== null) {
    const plan = editing === 'new' ? null : editing;
    return (
      <PlanEditor
        plan={plan}
        clientName={plan?.client_id ? clientName.get(plan.client_id) ?? null : null}
        onClose={() => setEditing(null)}
      />
    );
  }

  function PlanCard({ p, dashed }: { p: WorkoutPlan; dashed?: boolean }) {
    return (
      <div style={{ background: F.card, border: dashed ? `1.5px dashed ${F.edge}` : `1px solid ${F.edge}`, borderRadius: RADII.md, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => setEditing(p)} style={{ textAlign: 'left', border: 'none', background: 'transparent', color: F.ink, cursor: 'pointer', padding: 0, fontFamily: TYPE.body, display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{p.name}</div>
            <div style={{ fontSize: 12, color: F.mute, marginTop: 1 }}>
              {(p.exercises ?? []).length} exercises
              {(p.exercises ?? []).some((b) => (b as CoachBlock).group) ? ' · supersets' : ''}
            </div>
          </div>
          <span style={{ color: F.mute, fontSize: 15 }}>›</span>
        </button>
        {p.client_id === null && (
          assigning === p.id ? (
            <AssignRow template={p} onDone={() => setAssigning(null)} />
          ) : (
            <button onClick={() => setAssigning(p.id)} style={{ alignSelf: 'flex-start', border: `1.5px solid ${F.edge}`, background: 'transparent', color: F.inkSoft, borderRadius: RADII.pill, padding: '7px 13px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: TYPE.body }}>
              Give to a client
            </button>
          )
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 30, textTransform: 'uppercase', lineHeight: 1.1 }}>Programs</div>
        <button
          onClick={() => setEditing('new')}
          style={{ marginLeft: 'auto', height: HIT, padding: '0 18px', borderRadius: 13, border: 'none', cursor: 'pointer', background: F.accent, color: F.accentInk, fontWeight: 800, fontSize: 14, fontFamily: TYPE.body }}
        >
          + New workout
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: F.mute, fontSize: 14 }}>Loading plans…</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
              Your templates
            </div>
            {templates.length === 0 ? (
              <div style={{ background: F.card, border: `1.5px dashed ${F.edge}`, borderRadius: RADII.md, padding: '26px 18px', textAlign: 'center' }}>
                <div style={{ fontFamily: TYPE.display, fontWeight: 700, fontSize: 17, textTransform: 'uppercase' }}>Build your first workout</div>
                <div style={{ fontSize: 13, color: F.mute, marginTop: 5, lineHeight: 1.5 }}>
                  Make it once as a template, then hand it to any client — their copy is theirs to bump and tweak.
                </div>
              </div>
            ) : (
              templates.map((p) => <PlanCard key={p.id} p={p} />)
            )}
          </div>

          {assigned.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ fontFamily: TYPE.display, fontWeight: 600, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: F.mute }}>
                Client plans
              </div>
              {assigned.map(([cid, list]) => (
                <div key={cid} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: F.edge, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TYPE.display, fontWeight: 700, fontSize: 11 }}>
                      {initialsOf(clientName.get(cid) ?? '?')}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{clientName.get(cid)}</span>
                  </div>
                  {list.map((p) => <PlanCard key={p.id} p={p} />)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
