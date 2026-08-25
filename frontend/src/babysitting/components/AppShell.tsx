// Babysitting app shell — the frame every page lives in.
//
// Design: a warm linen page with a floating rounded "canopy" header:
// brand block on the left, pill navigation in the middle, quiet
// secondary links + edit switch on the right. No heavy color bars —
// the warmth comes from the palette and the soft shapes.

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';
import { B } from '../theme';

// ── Edit mode — a deliberate switch so day-to-day browsing can't
//    accidentally change money. Shared across pages via localStorage +
//    a CustomEvent (multi-tab safe enough for one sitter). ────────────
const EDIT_KEY = 'babysitting-edit-mode';
const EDIT_EVENT = 'babysitting-edit-mode-change';

export function useEditMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(EDIT_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const sync = () => {
      try {
        setOn(window.localStorage.getItem(EDIT_KEY) === '1');
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(EDIT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EDIT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const set = (v: boolean) => {
    try {
      window.localStorage.setItem(EDIT_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(EDIT_EVENT));
    setOn(v);
  };
  return [on, set];
}

const NAV: Array<{ to: string; label: string; emoji: string; end?: boolean }> = [
  { to: '/', label: 'Home', emoji: '🏡', end: true },
  { to: '/kids', label: 'Kids', emoji: '🧸' },
  { to: '/families', label: 'Families', emoji: '👨‍👩‍👧' },
  { to: '/billing', label: 'Billing', emoji: '💛' },
  { to: '/messages', label: 'Messages', emoji: '✉️' },
  { to: '/reports', label: 'Reports', emoji: '📈' },
  { to: '/settings', label: 'Settings', emoji: '⚙️' },
];

const QUIET_NAV: Array<{ to: string; label: string }> = [
  { to: '/away', label: 'Away' },
  { to: '/former', label: 'Former' },
  { to: '/log', label: 'Log' },
];

export function AppShell({ trainer }: { trainer: Trainer | undefined }) {
  const [editMode, setEditMode] = useEditMode();
  const navigate = useNavigate();
  const name = trainer?.business_name || trainer?.full_name || 'Babysitting';

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: B.bg, fontFamily: B.fontBody, color: B.ink }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, padding: '14px 16px 6px' }}>
        <div
          style={{
            maxWidth: 1140,
            margin: '0 auto',
            background: 'color-mix(in srgb, var(--tp-surface, #ffffff) 92%, transparent)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${B.rule}`,
            borderRadius: B.radiusLg,
            boxShadow: B.shadowSoft,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: B.primarySoft,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              🧸
            </div>
            <div>
              <div style={{ fontFamily: B.fontDisplay, fontWeight: 800, fontSize: '1.02rem', lineHeight: 1.15 }}>
                {name}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: B.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Babysitting
              </div>
            </div>
          </div>

          {/* Primary nav */}
          <nav style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                style={({ isActive }) => ({
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: B.pill,
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  fontFamily: B.fontDisplay,
                  color: isActive ? '#fff' : B.inkSoft,
                  background: isActive ? B.primary : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                })}
              >
                <span style={{ marginRight: 6 }}>{n.emoji}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Quiet links + edit switch + sign out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {QUIET_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                style={({ isActive }) => ({
                  textDecoration: 'none',
                  fontSize: '0.73rem',
                  fontWeight: 800,
                  color: isActive ? B.primaryDeep : B.mute,
                  padding: '5px 8px',
                  borderRadius: B.pill,
                  background: isActive ? B.primarySoft : 'transparent',
                })}
              >
                {n.label}
              </NavLink>
            ))}
            <button
              onClick={() => setEditMode(!editMode)}
              title={editMode ? 'Editing is ON — changes allowed' : 'Editing is OFF — browsing is safe'}
              style={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: B.pill,
                padding: '7px 13px',
                fontSize: '0.75rem',
                fontWeight: 800,
                fontFamily: B.fontDisplay,
                background: editMode ? B.accent : '#f2ede4',
                color: editMode ? '#fff' : B.inkSoft,
                transition: 'background 0.15s',
              }}
            >
              {editMode ? '✏️ Editing' : '🔒 View only'}
            </button>
            <button
              onClick={signOut}
              title="Sign out"
              style={{
                border: `1.5px solid ${B.rule}`,
                background: 'transparent',
                color: B.mute,
                cursor: 'pointer',
                borderRadius: B.pill,
                padding: '6px 11px',
                fontSize: '0.73rem',
                fontWeight: 800,
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '18px 16px 70px' }}>
        <Outlet context={{ editMode }} />
      </main>
    </div>
  );
}
