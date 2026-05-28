// ── The Customize Studio — ONE tool for everything ──────────────────
//
// A single place where the coach controls their whole app:
//   • Features — which capabilities are on (modules)
//   • Design   — colors, fonts, light/dark, corners, layout
//   • Layout   — drag the menu into the order they want
//
// Reachable from inside Settings in every template. Meta-UI, styled
// neutrally, takes an accent so it feels native.

import { useState } from 'react';
import { Blocks, Palette, LayoutList, GripVertical } from 'lucide-react';
import { ModuleSwitchboard } from './ModuleSwitchboard';
import { AppearanceEditor } from './AppearanceEditor';
import { useLayout, applyNavOrder } from '../lib/layout';

type Tab = 'features' | 'design' | 'layout';

export interface CustomizeNavItem {
  to: string;
  label: string;
}

export function CustomizeStudio({
  templateSlugs,
  navItems,
  accent = '#7C3AED',
}: {
  /** Every discipline the coach does — features combine across all of them. */
  templateSlugs: string[] | undefined;
  /** The template's current visible menu, for the Layout tab to reorder. */
  navItems: CustomizeNavItem[];
  accent?: string;
}) {
  const [tab, setTab] = useState<Tab>('features');

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'features', label: 'Features', icon: Blocks },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'layout', label: 'Layout', icon: LayoutList },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: 'inline-flex',
          background: '#f1f5f9',
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          gap: 2,
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 9,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.86rem',
                fontWeight: 700,
                fontFamily: 'inherit',
                background: on ? '#fff' : 'transparent',
                color: on ? accent : '#64748b',
                boxShadow: on ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'features' && <ModuleSwitchboard templateSlugs={templateSlugs} accent={accent} />}
      {tab === 'design' && <AppearanceEditor templateSlug={templateSlugs?.[0]} />}
      {tab === 'layout' && <LayoutReorder navItems={navItems} accent={accent} />}
    </div>
  );
}

// ── Layout tab — drag the menu into the order you want ──────────────
function LayoutReorder({
  navItems,
  accent,
}: {
  navItems: CustomizeNavItem[];
  accent: string;
}) {
  const { layout, save } = useLayout();
  // Working order: saved order applied to the current menu.
  const [order, setOrder] = useState<CustomizeNavItem[]>(
    applyNavOrder(navItems, layout.navOrder),
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function commit(next: CustomizeNavItem[]) {
    setOrder(next);
    save.mutate({ ...layout, navOrder: next.map((n) => n.to) });
  }

  function onDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = order.slice();
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDragIdx(null);
    commit(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    const next = order.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    commit(next);
  }

  return (
    <div>
      <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: 14 }}>
        Drag your menu items into the order you want. The arrows work too. This is the order
        they'll appear in your app's menu.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 }}>
        {order.map((item, i) => (
          <div
            key={item.to}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 13px',
              background: dragIdx === i ? accent + '14' : '#fff',
              border: `1px solid ${dragIdx === i ? accent : '#e5eaf2'}`,
              borderRadius: 10,
              cursor: 'grab',
            }}
          >
            <GripVertical size={16} color="#94a3b8" />
            <span style={{ flex: 1, fontSize: '0.92rem', fontWeight: 600, color: '#0f172a' }}>
              {item.label}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
              {item.to}
            </span>
            <span style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                style={arrowBtn(i === 0)}
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === order.length - 1}
                aria-label="Move down"
                style={arrowBtn(i === order.length - 1)}
              >
                ↓
              </button>
            </span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 12 }}>
        {save.isPending ? 'Saving…' : 'Saved automatically. More drag-to-place options coming for the dashboard itself.'}
      </p>
    </div>
  );
}

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1px solid #e5eaf2',
    background: disabled ? '#f8fafc' : '#fff',
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'default' : 'pointer',
    fontSize: '0.8rem',
    fontWeight: 700,
  };
}
