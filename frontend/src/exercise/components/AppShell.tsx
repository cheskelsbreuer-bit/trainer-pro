// AppShell — header + top nav + edit-mode toggle. Mirrors the original
// app's header strip (dark navy gradient, blue accent active tab) so
// users moving over from the legacy single-file app feel at home.

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import type { Trainer } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { E } from '../theme';

interface Tab {
  to: string;
  label: string;
  emoji: string;
  end?: boolean;
  corner?: boolean;
  editOnly?: boolean;
}

const TABS: Tab[] = [
  { to: '/', label: 'Dashboard', emoji: '📊', end: true },
  { to: '/members', label: 'Members', emoji: '👥' },
  { to: '/payments', label: 'Payments', emoji: '💰' },
  { to: '/groups', label: 'Groups', emoji: '🗂' },
  { to: '/notes', label: 'Notes', emoji: '📝' },
  { to: '/paused', label: 'Paused', emoji: '⏸', corner: true },
  { to: '/archived', label: 'Former', emoji: '🗃', corner: true },
  { to: '/lookup', label: 'Lookup', emoji: '🔍', corner: true },
  { to: '/settings', label: 'Settings', emoji: '⚙', corner: true, editOnly: true },
];

const EDIT_KEY = 'exercise-edit-mode';

export function useEditMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(EDIT_KEY) === '1';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EDIT_KEY, on ? '1' : '0');
      window.dispatchEvent(new CustomEvent('exercise-edit-mode-changed', { detail: on }));
    }
  }, [on]);
  useEffect(() => {
    function onChg(e: Event) {
      const v = (e as CustomEvent).detail;
      if (typeof v === 'boolean') setOn(v);
    }
    window.addEventListener('exercise-edit-mode-changed', onChg as EventListener);
    return () => window.removeEventListener('exercise-edit-mode-changed', onChg as EventListener);
  }, []);
  return [on, setOn];
}

export function AppShell({ trainer }: { trainer: Trainer | undefined }) {
  const [editMode, setEditMode] = useEditMode();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const groupName = trainer?.business_name || trainer?.full_name || 'Exercise Group';

  return (
    <div style={{ minHeight: '100vh', background: E.bg, color: E.ink, fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${E.primaryDeep}, ${E.primary})`,
          color: '#fff',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
            💪 {groupName}
          </h1>
          <p style={{ fontSize: '0.82rem', opacity: 0.75, margin: 0 }}>
            Payment manager
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Edit-mode toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 30,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Edit
              {editMode && (
                <span
                  style={{
                    background: E.orange,
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 20,
                    marginLeft: 8,
                  }}
                >
                  ON
                </span>
              )}
            </span>
            <span
              style={{
                position: 'relative',
                width: 46,
                height: 24,
                display: 'inline-block',
                background: editMode ? E.green : 'rgba(255,255,255,0.3)',
                borderRadius: 24,
                transition: '0.25s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: editMode ? 25 : 3,
                  width: 18,
                  height: 18,
                  background: '#fff',
                  borderRadius: '50%',
                  transition: '0.25s',
                }}
              />
            </span>
            <input
              type="checkbox"
              checked={editMode}
              onChange={(e) => setEditMode(e.target.checked)}
              style={{ display: 'none' }}
            />
          </label>
          {/* Sign out */}
          <button
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#fff',
              padding: '8px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.82rem',
            }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      {editMode && (
        <div
          style={{
            background: '#fff3cd',
            borderBottom: '2px solid #ffc107',
            padding: '8px 20px',
            fontSize: '0.84rem',
            color: '#856404',
            textAlign: 'center',
          }}
        >
          ✏️ <strong>Edit Mode ON</strong> — You can record payments, edit members, and manage data.
        </div>
      )}

      {/* Nav */}
      <nav
        style={{
          background: E.primaryDeep,
          borderBottom: `3px solid ${E.primary}`,
          display: 'flex',
          overflowX: 'auto',
        }}
      >
        {TABS.map((t) => {
          if (t.editOnly && !editMode) return null;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              style={({ isActive }) => ({
                background: isActive ? E.primary : 'transparent',
                color: isActive ? '#fff' : 'rgba(200,220,240,0.8)',
                borderBottom: `3px solid ${isActive ? E.accent : 'transparent'}`,
                padding: '11px 18px',
                fontSize: t.corner ? '0.82rem' : '0.88rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s',
                textDecoration: 'none',
                marginLeft: t.corner && t.to === '/paused' ? 'auto' : 0,
                opacity: t.corner ? (isActive ? 1 : 0.7) : 1,
              })}
            >
              {t.emoji} {t.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Tab content */}
      <main style={{ padding: '18px 22px', maxWidth: 1200, margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
