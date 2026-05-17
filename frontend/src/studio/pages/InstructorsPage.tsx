// Instructors — who teaches what. Each row: name, contact, the set of
// class types they can teach. Used by the schedule editor's instructor
// dropdown.

import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { useStudioConfig, type Instructor } from '../lib/studioConfig';
import { S, HEADING_FONT } from '../theme';

export function InstructorsPage() {
  const { data: cfg, save } = useStudioConfig();
  const [editing, setEditing] = useState<Partial<Instructor> | null>(null);

  if (!cfg) return <p style={{ color: S.mute }}>Loading…</p>;

  function saveInst(i: Instructor) {
    if (!cfg) return;
    const exists = cfg.instructors.find((x) => x.id === i.id);
    const next = exists
      ? cfg.instructors.map((x) => (x.id === i.id ? i : x))
      : [...cfg.instructors, i];
    save.mutate({ ...cfg, instructors: next });
    setEditing(null);
  }

  function deleteInst(id: string) {
    if (!cfg) return;
    if (!confirm('Remove this instructor? Their assigned schedule slots will become unassigned.')) return;
    save.mutate({
      ...cfg,
      instructors: cfg.instructors.filter((x) => x.id !== id),
      schedule: cfg.schedule.map((s) =>
        s.instructorId === id ? { ...s, instructorId: null } : s,
      ),
    });
    setEditing(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <p style={lbl}>Who teaches</p>
          <h1 style={h1}>Instructors</h1>
        </div>
        <button onClick={() => setEditing({ teaches: [] })} style={primaryBtn}>
          <Plus size={14} /> New instructor
        </button>
      </div>

      {cfg.instructors.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ color: S.mute, margin: 0 }}>No instructors yet.</p>
        </div>
      ) : (
        <div
          style={{
            background: S.card,
            borderRadius: 12,
            border: `1px solid ${S.rule}`,
            overflow: 'hidden',
          }}
        >
          {cfg.instructors.map((i, idx) => {
            const slotCount = cfg.schedule.filter((s) => s.instructorId === i.id).length;
            return (
              <button
                key={i.id}
                onClick={() => setEditing(i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr 140px 100px',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderTop: idx > 0 ? `1px solid ${S.ruleSoft}` : 'none',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: HEADING_FONT,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: S.primarySoft,
                    color: S.primaryDeep,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                  }}
                >
                  {(i.name || '?').split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: S.ink, fontSize: '0.95rem' }}>{i.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: S.mute }}>
                    {i.email || i.phone || 'No contact info'}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: S.mute }}>
                  Teaches {i.teaches.length} type{i.teaches.length === 1 ? '' : 's'}
                </p>
                <p style={{ margin: 0, fontSize: '0.84rem', color: S.mute, textAlign: 'right' }}>
                  {slotCount} slot{slotCount === 1 ? '' : 's'}/wk
                </p>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <InstructorEditor
          instructor={editing}
          classTypes={cfg.classTypes}
          onSave={saveInst}
          onDelete={(id) => deleteInst(id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function InstructorEditor({
  instructor,
  classTypes,
  onSave,
  onDelete,
  onClose,
}: {
  instructor: Partial<Instructor>;
  classTypes: import('../lib/studioConfig').ClassType[];
  onSave: (i: Instructor) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<Instructor>>(instructor);

  function toggleTeach(id: string) {
    const has = (draft.teaches ?? []).includes(id);
    setDraft({
      ...draft,
      teaches: has
        ? (draft.teaches ?? []).filter((t) => t !== id)
        : [...(draft.teaches ?? []), id],
    });
  }

  function save() {
    if (!draft.name?.trim()) return;
    onSave({
      id: draft.id ?? `in-${Date.now()}`,
      name: draft.name.trim(),
      email: draft.email?.trim() || null,
      phone: draft.phone?.trim() || null,
      teaches: draft.teaches ?? [],
    });
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: S.ink }}>
            {instructor.id ? 'Edit instructor' : 'New instructor'}
          </h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <F label="Name">
            <input
              value={draft.name ?? ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              autoFocus
              style={inp}
            />
          </F>
          <div style={{ display: 'flex', gap: 8 }}>
            <F label="Email">
              <input
                value={draft.email ?? ''}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                style={inp}
              />
            </F>
            <F label="Phone">
              <input
                value={draft.phone ?? ''}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                style={inp}
              />
            </F>
          </div>
          <F label="Teaches">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {classTypes.length === 0 ? (
                <p style={{ color: S.mute, fontSize: '0.83rem' }}>
                  No class types yet — add some on the Classes tab.
                </p>
              ) : (
                classTypes.map((ct) => {
                  const on = (draft.teaches ?? []).includes(ct.id);
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => toggleTeach(ct.id)}
                      style={{
                        background: on ? ct.color : ct.color + '22',
                        color: on ? '#fff' : ct.color,
                        border: `1px solid ${ct.color}`,
                        borderRadius: 16,
                        padding: '5px 12px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: HEADING_FONT,
                      }}
                    >
                      {on ? '✓ ' : ''}{ct.name}
                    </button>
                  );
                })
              )}
            </div>
          </F>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} disabled={!draft.name?.trim()} style={primaryBtn}>
              ✓ Save
            </button>
            {instructor.id && (
              <button onClick={() => onDelete(instructor.id!)} style={dangerBtn}>
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button onClick={onClose} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: '0.72rem', color: S.mute, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: 0 };
const h1: React.CSSProperties = { fontSize: '1.6rem', fontWeight: 800, color: S.ink, margin: '4px 0 0', lineHeight: 1.1 };
const emptyCard: React.CSSProperties = { background: S.card, border: `1px dashed ${S.rule}`, borderRadius: 12, padding: 28, textAlign: 'center' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modal: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', fontFamily: HEADING_FONT };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', color: S.mute, cursor: 'pointer' };
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${S.rule}`, borderRadius: 8, fontSize: '0.88rem', fontFamily: HEADING_FONT, outline: 'none' };
const primaryBtn: React.CSSProperties = { background: S.primary, color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 5 };
const ghostBtn: React.CSSProperties = { background: 'transparent', color: S.mute, border: `1px solid ${S.rule}`, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem' };
const dangerBtn: React.CSSProperties = { background: 'transparent', color: S.danger, border: `1px solid ${S.danger}66`, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 4 };

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: S.inkSoft, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
