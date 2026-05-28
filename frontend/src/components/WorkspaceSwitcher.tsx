// ── Workspace switcher — flip between a coach's apps ─────────────────
//
// Shown ONLY when a coach owns more than one app (e.g. nutrition +
// martial arts + 1-on-1). A small floating pill in the bottom-left
// corner; clicking it pops up the list of the coach's apps so they can
// jump between them. Styled neutrally with inline styles + a high z-index
// so it sits cleanly on top of every template's very different shell
// (dark dojo, light nutrition, fight-poster boxing, …).

import { useEffect, useRef, useState } from 'react';
import { LayoutGrid, Check, ChevronUp } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const active = workspaces.find((w) => w.key === activeKey) ?? workspaces[0];

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 18,
        left: 18,
        zIndex: 9999,
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Popup list */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            minWidth: 240,
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 14,
            padding: 6,
            boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
          }}
        >
          <p
            style={{
              fontSize: '0.66rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#64748b',
              margin: '6px 10px 8px',
            }}
          >
            Your apps
          </p>
          {workspaces.map((w) => {
            const on = w.key === activeKey;
            return (
              <button
                key={w.key}
                onClick={() => {
                  setOpen(false);
                  if (!on) onSwitch(w.key);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  background: on ? '#1e293b' : 'transparent',
                  border: 'none',
                  borderRadius: 9,
                  padding: '9px 10px',
                  cursor: 'pointer',
                  color: '#f1f5f9',
                }}
              >
                <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{w.emoji}</span>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{w.label}</span>
                {on && <Check size={15} color="#34d399" />}
              </button>
            );
          })}
        </div>
      )}

      {/* The pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          background: '#0f172a',
          color: '#f1f5f9',
          border: '1px solid #1e293b',
          borderRadius: 999,
          padding: '9px 14px 9px 12px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          fontFamily: 'inherit',
        }}
        title="Switch between your apps"
      >
        <LayoutGrid size={16} color="#94a3b8" />
        <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{active?.emoji}</span>
        <span style={{ fontSize: '0.86rem', fontWeight: 700 }}>{active?.label}</span>
        <ChevronUp
          size={15}
          color="#94a3b8"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>
    </div>
  );
}
