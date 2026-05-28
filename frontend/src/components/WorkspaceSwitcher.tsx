// ── Workspace switcher — flip between a coach's apps ─────────────────
//
// Shown ONLY when a coach owns more than one app (e.g. nutrition +
// martial arts + 1-on-1). A prominent floating bar pinned to the
// top-center of the screen that shows every app the coach has as a
// clickable tab — one tap jumps between them. Styled with inline styles
// + a high z-index so it sits cleanly on top of every template's very
// different shell (dark dojo, light nutrition, fight-poster boxing, …).

import { LayoutGrid } from 'lucide-react';
import type { AppKey, Workspace } from '../lib/workspaces';

export function WorkspaceSwitcher({
  workspaces,
  activeKey,
  onSwitch,
}: {
  workspaces: Workspace[];
  activeKey: AppKey;
  onSwitch: (key: AppKey) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: 'calc(100vw - 24px)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 999,
        padding: '6px 8px 6px 12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        overflowX: 'auto',
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#94a3b8',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <LayoutGrid size={14} />
        My apps
      </span>

      {workspaces.map((w) => {
        const on = w.key === activeKey;
        return (
          <button
            key={w.key}
            onClick={() => {
              if (!on) onSwitch(w.key);
            }}
            title={on ? `You're in ${w.label}` : `Switch to ${w.label}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              flexShrink: 0,
              background: on ? '#fff' : 'transparent',
              color: on ? '#0f172a' : '#e2e8f0',
              border: on ? 'none' : '1px solid #475569',
              borderRadius: 999,
              padding: '6px 13px',
              cursor: on ? 'default' : 'pointer',
              fontSize: '0.84rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{w.emoji}</span>
            {w.label}
          </button>
        );
      })}
    </div>
  );
}
