// Schedule — weekly grid view. Columns = days of the week, rows =
// hours. Each scheduled class shows as a colored block sized to its
// duration. Click to edit / delete. "+ Add slot" opens a form.

import { useMemo, useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import {
  useStudioConfig,
  type ScheduledClass,
} from '../lib/studioConfig';
import { S, WEEKDAYS, fmtTime, timeToMinutes, HEADING_FONT } from '../theme';

const HOUR_START = 6;
const HOUR_END = 22;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const PX_PER_MIN = 1.1;

export function SchedulePage() {
  const { data: cfg, save } = useStudioConfig();
  const [editing, setEditing] = useState<Partial<ScheduledClass> | null>(null);

  const slotsByDay = useMemo(() => {
    const map = new Map<number, ScheduledClass[]>();
    if (!cfg) return map;
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const sc of cfg.schedule) {
      map.get(sc.dayOfWeek)!.push(sc);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [cfg]);

  if (!cfg) return <p style={{ color: S.mute }}>Loading…</p>;

  function saveSlot(slot: ScheduledClass) {
    if (!cfg) return;
    const exists = cfg.schedule.find((s) => s.id === slot.id);
    const next = exists
      ? cfg.schedule.map((s) => (s.id === slot.id ? slot : s))
      : [...cfg.schedule, slot];
    save.mutate({ ...cfg, schedule: next });
    setEditing(null);
  }

  function deleteSlot(id: string) {
    if (!cfg) return;
    if (!confirm('Delete this class slot from the schedule?')) return;
    save.mutate({ ...cfg, schedule: cfg.schedule.filter((s) => s.id !== id) });
    setEditing(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <p style={lbl}>Weekly schedule</p>
          <h1 style={h1}>Class times</h1>
        </div>
        <button
          onClick={() =>
            setEditing({
              dayOfWeek: 1,
              startTime: '07:00',
              capacity: 15,
              classTypeId: cfg.classTypes[0]?.id ?? '',
              instructorId: cfg.instructors[0]?.id ?? null,
            })
          }
          style={primaryBtn}
        >
          <Plus size={14} /> Add class slot
        </button>
      </div>

      {cfg.classTypes.length === 0 ? (
        <div style={emptyCard}>
          <p style={{ margin: 0, color: S.mute }}>
            Add at least one <strong>class type</strong> on the Classes tab before scheduling.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: S.card,
            border: `1px solid ${S.rule}`,
            borderRadius: 12,
            overflow: 'auto',
          }}
        >
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: `1px solid ${S.rule}` }}>
            <div />
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                style={{
                  padding: '10px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: S.inkSoft,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                  borderLeft: `1px solid ${S.ruleSoft}`,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '60px repeat(7, 1fr)',
              position: 'relative',
              minHeight: (HOUR_END - HOUR_START) * 60 * PX_PER_MIN,
            }}
          >
            {/* Hour rows */}
            <div>
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    height: 60 * PX_PER_MIN,
                    fontSize: '0.7rem',
                    color: S.muteFaint,
                    padding: '2px 8px 0',
                    fontWeight: 600,
                    textAlign: 'right',
                  }}
                >
                  {fmtTime(`${h}:00`)}
                </div>
              ))}
            </div>
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
              <div
                key={dow}
                style={{
                  position: 'relative',
                  borderLeft: `1px solid ${S.ruleSoft}`,
                  background:
                    new Date().getDay() === dow ? `${S.primary}06` : 'transparent',
                }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      height: 60 * PX_PER_MIN,
                      borderTop: `1px solid ${S.ruleSoft}`,
                    }}
                  />
                ))}
                {(slotsByDay.get(dow) ?? []).map((sc) => {
                  const type = cfg.classTypes.find((t) => t.id === sc.classTypeId);
                  const startM = timeToMinutes(sc.startTime);
                  const top = (startM - HOUR_START * 60) * PX_PER_MIN;
                  const height = Math.max(36, (type?.durationMin ?? 60) * PX_PER_MIN);
                  const color = type?.color ?? S.primary;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => setEditing(sc)}
                      style={{
                        position: 'absolute',
                        left: 4,
                        right: 4,
                        top,
                        height,
                        background: color + '15',
                        border: `1px solid ${color}`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 6,
                        padding: '4px 6px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: HEADING_FONT,
                        overflow: 'hidden',
                      }}
                    >
                      <p style={{ fontSize: '0.72rem', color, fontWeight: 700, margin: 0 }}>
                        {fmtTime(sc.startTime)}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: S.ink, fontWeight: 600, margin: '2px 0 0', lineHeight: 1.2 }}>
                        {type?.name ?? 'Class'}
                      </p>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <SlotEditor
          slot={editing}
          classTypes={cfg.classTypes}
          instructors={cfg.instructors}
          onSave={(s) => saveSlot(s)}
          onDelete={(id) => deleteSlot(id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SlotEditor({
  slot,
  classTypes,
  instructors,
  onSave,
  onDelete,
  onClose,
}: {
  slot: Partial<ScheduledClass>;
  classTypes: import('../lib/studioConfig').ClassType[];
  instructors: import('../lib/studioConfig').Instructor[];
  onSave: (s: ScheduledClass) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ScheduledClass>>(slot);

  function save() {
    const id = draft.id ?? `sc-${Date.now()}`;
    onSave({
      id,
      classTypeId: draft.classTypeId!,
      instructorId: draft.instructorId ?? null,
      dayOfWeek: (draft.dayOfWeek ?? 1) as ScheduledClass['dayOfWeek'],
      startTime: draft.startTime!,
      capacity: draft.capacity ?? 15,
      room: draft.room,
      startsOn: draft.startsOn,
      endsOn: draft.endsOn,
    });
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: S.ink }}>
            {slot.id ? 'Edit class slot' : 'Add class slot'}
          </h2>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <F label="Class type">
            <select
              value={draft.classTypeId ?? ''}
              onChange={(e) => setDraft({ ...draft, classTypeId: e.target.value })}
              style={inp}
            >
              {classTypes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </F>
          <F label="Instructor">
            <select
              value={draft.instructorId ?? ''}
              onChange={(e) => setDraft({ ...draft, instructorId: e.target.value || null })}
              style={inp}
            >
              <option value="">— unassigned —</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </F>
          <div style={{ display: 'flex', gap: 8 }}>
            <F label="Day">
              <select
                value={String(draft.dayOfWeek ?? 1)}
                onChange={(e) => setDraft({ ...draft, dayOfWeek: Number(e.target.value) as ScheduledClass['dayOfWeek'] })}
                style={inp}
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={String(i)}>{d}</option>
                ))}
              </select>
            </F>
            <F label="Start time">
              <input
                type="time"
                value={draft.startTime ?? '07:00'}
                onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                style={inp}
              />
            </F>
            <F label="Capacity">
              <input
                type="number"
                min="1"
                value={draft.capacity ?? 15}
                onChange={(e) => setDraft({ ...draft, capacity: parseInt(e.target.value) || 0 })}
                style={inp}
              />
            </F>
          </div>
          <F label="Room (optional)">
            <input
              value={draft.room ?? ''}
              onChange={(e) => setDraft({ ...draft, room: e.target.value })}
              placeholder="e.g. Studio A"
              style={inp}
            />
          </F>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={save} disabled={!draft.classTypeId} style={primaryBtn}>
              ✓ Save slot
            </button>
            {slot.id && (
              <button onClick={() => onDelete(slot.id!)} style={dangerBtn}>
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
