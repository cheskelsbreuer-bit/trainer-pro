// Class types catalog — manage the kinds of classes the studio runs
// (Vinyasa, Spin, HIIT, Pilates, Barre, etc.). Each has a name, color,
// duration, and short description.

import { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import {
  useStudioConfig,
  STARTER_CLASS_TYPES,
  type ClassType,
} from '../lib/studioConfig';
import { S, CLASS_TYPE_COLORS, HEADING_FONT } from '../theme';

export function ClassesPage() {
  const { data: cfg, save } = useStudioConfig();
  const [editing, setEditing] = useState<Partial<ClassType> | null>(null);

  if (!cfg) return <p style={{ color: S.mute }}>Loading…</p>;

  function saveType(t: ClassType) {
    if (!cfg) return;
    const exists = cfg.classTypes.find((x) => x.id === t.id);
    const next = exists
      ? cfg.classTypes.map((x) => (x.id === t.id ? t : x))
      : [...cfg.classTypes, t];
    save.mutate({ ...cfg, classTypes: next });
    setEditing(null);
  }

  function deleteType(id: string) {
    if (!cfg) return;
    if (
      !confirm(
        'Delete this class type? Any scheduled slots using it will need a new type assigned.',
      )
    )
      return;
    save.mutate({ ...cfg, classTypes: cfg.classTypes.filter((x) => x.id !== id) });
  }

  function seedStarter() {
    if (!cfg) return;
    if (!confirm('Add starter class types (Yoga, Spin, HIIT, Pilates)?')) return;
    save.mutate({ ...cfg, classTypes: [...cfg.classTypes, ...STARTER_CLASS_TYPES] });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <p style={lbl}>What you teach</p>
          <h1 style={h1}>Class types</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {cfg.classTypes.length === 0 && (
            <button onClick={seedStarter} style={ghostBtn}>
              ✨ Seed 4 starters
            </button>
          )}
          <button
            onClick={() =>
              setEditing({
                color: CLASS_TYPE_COLORS[cfg.classTypes.length % CLASS_TYPE_COLORS.length],
                durationMin: 60,
              })
            }
            style={primaryBtn}
          >
            <Plus size={14} /> New class type
          </button>
        </div>
      </div>

      {cfg.classTypes.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ color: S.mute, margin: 0 }}>
            No class types yet. Add one above — or seed the four starters.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {cfg.classTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => setEditing(t)}
              style={{
                background: S.card,
                borderRadius: 12,
                padding: '16px 18px',
                border: `1px solid ${S.rule}`,
                borderLeft: `4px solid ${t.color}`,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: HEADING_FONT,
              }}
            >
              <p style={{ fontWeight: 700, color: S.ink, margin: 0, fontSize: '1rem' }}>{t.name}</p>
              <p style={{ color: S.mute, fontSize: '0.83rem', margin: '4px 0 0' }}>
                {t.durationMin} min
                {t.description ? ` · ${t.description}` : ''}
              </p>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <TypeEditor
          type={editing}
          onSave={saveType}
          onDelete={(id) => {
            deleteType(id);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TypeEditor({
  type,
  onSave,
  onDelete,
  onClose,
}: {
  type: Partial<ClassType>;
  onSave: (t: ClassType) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ClassType>>(type);

  function save() {
    if (!draft.name?.trim()) return;
    onSave({
      id: draft.id ?? `ct-${Date.now()}`,
      name: draft.name.trim(),
      color: draft.color ?? CLASS_TYPE_COLORS[0],
      durationMin: draft.durationMin ?? 60,
      description: draft.description,
    });
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: S.ink }}>
            {type.id ? 'Edit class type' : 'New class type'}
          </h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <F label="Name">
            <input
              value={draft.name ?? ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Vinyasa Yoga"
              autoFocus
              style={inp}
            />
          </F>
          <F label="Description (optional)">
            <input
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Brief — one sentence members see when browsing."
              style={inp}
            />
          </F>
          <div style={{ display: 'flex', gap: 8 }}>
            <F label="Duration (min)">
              <input
                type="number"
                min="15"
                value={draft.durationMin ?? 60}
                onChange={(e) =>
                  setDraft({ ...draft, durationMin: parseInt(e.target.value) || 60 })
                }
                style={inp}
              />
            </F>
            <F label="Color">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CLASS_TYPE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, color: c })}
                    aria-label={c}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: c,
                      border:
                        draft.color === c ? `3px solid ${S.ink}` : `2px solid #fff`,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </F>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} disabled={!draft.name?.trim()} style={primaryBtn}>
              ✓ Save
            </button>
            {type.id && (
              <button onClick={() => onDelete(type.id!)} style={dangerBtn}>
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
