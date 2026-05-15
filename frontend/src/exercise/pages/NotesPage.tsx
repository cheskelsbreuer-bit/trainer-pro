// Notes — full combo/folder/category note system. Combos have a title,
// a category, and a stack of "sections" (heading + body). Folders group
// combos within a category. Saved to Supabase under
// trainers.public_profile.exercise.combos / .folders / .categories.

import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, FolderPlus, Trash2, ArrowLeft } from 'lucide-react';
import { useEditMode } from '../components/AppShell';
import {
  useExerciseConfig,
  appendLog,
  DEFAULT_CATEGORIES,
  type Combo,
  type NoteFolder,
  type Category,
} from '../lib/exerciseConfig';
import { E } from '../theme';

type View = 'list' | 'detail';

export function NotesPage() {
  const { data: cfg, save, isPending } = useExerciseConfig();
  const [editMode] = useEditMode();
  const [q, setQ] = useState('');
  const [view, setView] = useState<View>('list');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [openComboId, setOpenComboId] = useState<string | null>(null);

  const config = cfg ?? null;
  const categories: Category[] = config?.categories ?? DEFAULT_CATEGORIES;
  const folders: NoteFolder[] = config?.folders ?? [];
  const combos: Combo[] = config?.combos ?? [];

  const filteredCombos = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = combos.slice();
    if (activeCategory) list = list.filter((c) => c.category === activeCategory);
    if (activeFolderId) list = list.filter((c) => c.folderId === activeFolderId);
    if (needle) {
      list = list.filter((c) => {
        if (c.title.toLowerCase().includes(needle)) return true;
        for (const s of c.sections)
          if (s.heading.toLowerCase().includes(needle) || s.body.toLowerCase().includes(needle))
            return true;
        return false;
      });
    }
    list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return list;
  }, [combos, q, activeCategory, activeFolderId]);

  const subFolders = useMemo(
    () => folders.filter((f) => !activeCategory || f.category === activeCategory),
    [folders, activeCategory],
  );

  function newCombo() {
    if (!config) return;
    const id = `cb-${Date.now()}`;
    const newC: Combo = {
      id,
      title: 'New note',
      category: activeCategory || 'misc',
      folderId: activeFolderId,
      sections: [{ heading: '', body: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    save.mutate(appendLog({ ...config, combos: [newC, ...config.combos] }, 'note', `Created note "${newC.title}"`));
    setOpenComboId(id);
    setView('detail');
  }

  function newFolder() {
    if (!config) return;
    const name = prompt('Folder name?')?.trim();
    if (!name) return;
    const f: NoteFolder = {
      id: `fd-${Date.now()}`,
      name,
      category: activeCategory || 'misc',
    };
    save.mutate({ ...config, folders: [...config.folders, f] });
  }

  function deleteCombo(id: string) {
    if (!config) return;
    if (!confirm('Delete this note?')) return;
    const target = config.combos.find((c) => c.id === id);
    save.mutate(
      appendLog(
        { ...config, combos: config.combos.filter((c) => c.id !== id) },
        'note',
        `Deleted note "${target?.title ?? id}"`,
      ),
    );
    setView('list');
    setOpenComboId(null);
  }

  function updateCombo(id: string, patch: Partial<Combo>) {
    if (!config) return;
    const nextCombos = config.combos.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    );
    save.mutate({ ...config, combos: nextCombos });
  }

  // ── Detail view ──────────────────────────────────────────────────────
  if (view === 'detail' && openComboId) {
    const combo = combos.find((c) => c.id === openComboId);
    if (!combo) {
      setView('list');
      return null;
    }
    return (
      <ComboDetail
        combo={combo}
        categories={categories}
        folders={folders.filter((f) => f.category === combo.category)}
        editMode={editMode}
        onChange={(patch) => updateCombo(combo.id, patch)}
        onDelete={() => deleteCombo(combo.id)}
        onBack={() => {
          setView('list');
          setOpenComboId(null);
        }}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────
  return (
    <div>
      <div
        style={{
          background: '#fff9e6',
          border: '1px solid #f0c878',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: '0.86rem',
          color: '#6b4d00',
          marginBottom: 14,
        }}
      >
        📝 Your notes — workout combos, choreography, class plans, anything. Folder them by category.
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 13,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: E.mute }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes…"
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              border: '1px solid #ccc',
              borderRadius: 8,
              fontSize: '0.88rem',
              outline: 'none',
              fontFamily: 'Arial, sans-serif',
            }}
          />
        </div>
        {editMode && (
          <>
            <button onClick={newCombo} style={btnGreen}>
              <Plus size={14} /> New note
            </button>
            <button onClick={newFolder} style={btnOrange}>
              <FolderPlus size={14} /> Folder
            </button>
          </>
        )}
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <CatChip
          icon=""
          label="All"
          active={!activeCategory}
          onClick={() => {
            setActiveCategory('');
            setActiveFolderId(null);
          }}
        />
        {categories.map((c) => (
          <CatChip
            key={c.id}
            icon={c.icon}
            label={c.name}
            active={activeCategory === c.id}
            onClick={() => {
              setActiveCategory(c.id);
              setActiveFolderId(null);
            }}
          />
        ))}
      </div>

      {/* Folder bar */}
      {activeCategory && subFolders.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <FolderChip
            label="🗂 All in this category"
            active={!activeFolderId}
            onClick={() => setActiveFolderId(null)}
          />
          {subFolders.map((f) => (
            <FolderChip
              key={f.id}
              label={`📁 ${f.name}`}
              active={activeFolderId === f.id}
              onClick={() => setActiveFolderId(f.id)}
            />
          ))}
        </div>
      )}

      {/* Combo cards */}
      {!config ? (
        <p style={{ color: E.mute }}>Loading…</p>
      ) : filteredCombos.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: `1px dashed ${E.rule}`,
            borderRadius: 12,
            padding: '40px 20px',
            textAlign: 'center',
            color: E.mute,
          }}
        >
          {combos.length === 0 ? (
            <>
              <p style={{ marginBottom: 8 }}>No notes yet.</p>
              {editMode && (
                <button onClick={newCombo} style={btnGreen}>
                  <Plus size={14} /> Create your first note
                </button>
              )}
            </>
          ) : (
            <p>No notes match this filter.</p>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 12,
          }}
        >
          {filteredCombos.map((c) => {
            const cat = categories.find((x) => x.id === c.category);
            const folder = folders.find((f) => f.id === c.folderId);
            const preview = c.sections
              .map((s) => `${s.heading} ${s.body}`)
              .join(' ')
              .slice(0, 100);
            return (
              <button
                key={c.id}
                onClick={() => {
                  setOpenComboId(c.id);
                  setView('detail');
                }}
                style={{
                  background: '#fff',
                  border: `1px solid ${E.rule}`,
                  borderRadius: 10,
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'Arial, sans-serif',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: E.mute,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    marginBottom: 4,
                  }}
                >
                  {cat?.icon ?? '⭐'} {cat?.name ?? c.category}
                  {folder && <span> · 📁 {folder.name}</span>}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: E.primaryDeep, marginBottom: 4 }}>
                  {c.title || '(untitled)'}
                </div>
                <div
                  style={{
                    fontSize: '0.83rem',
                    color: E.inkSoft,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {preview || <span style={{ color: E.muteFaint }}>(empty)</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isPending && (
        <p style={{ color: E.muteFaint, fontSize: '0.78rem', marginTop: 8 }}>Saving…</p>
      )}
    </div>
  );
}

// ── Detail view ────────────────────────────────────────────────────────

function ComboDetail({
  combo,
  categories,
  folders,
  editMode,
  onChange,
  onDelete,
  onBack,
}: {
  combo: Combo;
  categories: Category[];
  folders: NoteFolder[];
  editMode: boolean;
  onChange: (patch: Partial<Combo>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  // Local state for snappy typing, syncs back on blur
  const [title, setTitle] = useState(combo.title);
  const [sections, setSections] = useState(combo.sections);
  useEffect(() => setTitle(combo.title), [combo.id, combo.title]);
  useEffect(() => setSections(combo.sections), [combo.id, combo.sections]);

  const cat = categories.find((c) => c.id === combo.category);

  function commitTitle() {
    if (title !== combo.title) onChange({ title });
  }
  function commitSections(next: typeof sections) {
    setSections(next);
    onChange({ sections: next });
  }

  function addSection() {
    commitSections([...sections, { heading: '', body: '' }]);
  }
  function delSection(i: number) {
    commitSections(sections.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: E.gray,
          color: '#fff',
          border: 'none',
          padding: '7px 13px',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.85rem',
          marginBottom: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <ArrowLeft size={14} /> All notes
      </button>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        placeholder="Note title"
        disabled={!editMode}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: E.primaryDeep,
          background: editMode ? '#fff' : '#f5f8fc',
          border: `1px solid ${E.rule}`,
          borderRadius: 10,
          outline: 'none',
          marginBottom: 10,
          fontFamily: 'Arial, sans-serif',
        }}
      />

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <label
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
        >
          <span style={{ color: E.mute }}>Category:</span>
          <select
            value={combo.category}
            onChange={(e) => onChange({ category: e.target.value, folderId: null })}
            disabled={!editMode}
            style={selStyle}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
        >
          <span style={{ color: E.mute }}>Folder:</span>
          <select
            value={combo.folderId ?? ''}
            onChange={(e) =>
              onChange({ folderId: e.target.value ? e.target.value : null })
            }
            disabled={!editMode || folders.length === 0}
            style={selStyle}
          >
            <option value="">— none —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>
        </label>
        {editMode && (
          <button
            onClick={onDelete}
            style={{
              background: 'transparent',
              color: E.redDeep,
              border: `1px solid ${E.red}`,
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.83rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 'auto',
            }}
          >
            <Trash2 size={13} /> Delete note
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: E.muteFaint, marginBottom: 16 }}>
        Last updated {new Date(combo.updatedAt).toLocaleString()}
        {cat ? ` · in ${cat.name}` : ''}
      </p>

      {sections.map((s, i) => (
        <div
          key={i}
          style={{
            background: '#fff',
            border: `1px solid ${E.rule}`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              value={s.heading}
              onChange={(e) => {
                const next = sections.slice();
                next[i] = { ...next[i], heading: e.target.value };
                setSections(next);
              }}
              onBlur={() => commitSections(sections)}
              placeholder="Section heading"
              disabled={!editMode}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '1rem',
                fontWeight: 700,
                color: E.primaryDeep,
                background: editMode ? '#fff' : 'transparent',
                border: `1px solid ${editMode ? '#ccc' : 'transparent'}`,
                borderRadius: 6,
                outline: 'none',
                fontFamily: 'Arial, sans-serif',
              }}
            />
            {editMode && (
              <button
                onClick={() => delSection(i)}
                style={{
                  background: 'transparent',
                  color: E.redDeep,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                }}
                aria-label="Delete section"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <textarea
            value={s.body}
            onChange={(e) => {
              const next = sections.slice();
              next[i] = { ...next[i], body: e.target.value };
              setSections(next);
            }}
            onBlur={() => commitSections(sections)}
            placeholder="Type here…"
            disabled={!editMode}
            rows={Math.max(3, s.body.split('\n').length + 1)}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: '0.95rem',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.5,
              color: E.ink,
              background: editMode ? '#fffef4' : '#fbfbfb',
              border: `1px solid ${E.rule}`,
              borderRadius: 6,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      ))}

      {editMode && (
        <button onClick={addSection} style={{ ...btnGreen, marginTop: 4 }}>
          <Plus size={14} /> Add section
        </button>
      )}
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────

function CatChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? E.primary : '#fff',
        color: active ? '#fff' : E.ink,
        border: `1px solid ${active ? E.primary : E.rule}`,
        padding: '6px 12px',
        borderRadius: 20,
        fontSize: '0.83rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {icon} {label}
    </button>
  );
}

function FolderChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#f0a500' : '#fff',
        color: active ? '#fff' : E.ink,
        border: `1px solid ${active ? '#f0a500' : E.rule}`,
        padding: '5px 10px',
        borderRadius: 6,
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  fontSize: '0.85rem',
  fontFamily: 'Arial, sans-serif',
};

const btnGreen: React.CSSProperties = {
  background: E.green,
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
const btnOrange: React.CSSProperties = {
  background: '#f0a500',
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.85rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};
