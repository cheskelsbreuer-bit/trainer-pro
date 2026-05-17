// Top-nav shell for the Studio app. Looks clean and modern — slate
// surface, violet primary, plenty of negative space. Sticky topbar
// with the brand block on the left and account chip on the right.

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Calendar,
  Sparkles,
  UserCircle,
  Users,
  CalendarDays,
  Settings,
  LogOut,
} from 'lucide-react';
import type { Trainer } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { S, HEADING_FONT } from '../theme';

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
}

const TABS: Tab[] = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/schedule', label: 'Schedule', icon: Calendar },
  { to: '/classes', label: 'Classes', icon: Sparkles },
  { to: '/instructors', label: 'Instructors', icon: UserCircle },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ trainer }: { trainer: Trainer | undefined }) {
  const navigate = useNavigate();
  const studioName = trainer?.business_name || trainer?.full_name || 'Your Studio';

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.ink, fontFamily: HEADING_FONT }}>
      {/* Topbar */}
      <header
        style={{
          background: '#fff',
          borderBottom: `1px solid ${S.rule}`,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${S.primary}, ${S.accent})`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
            }}
          >
            🌀
          </div>
          <div>
            <p
              style={{
                fontSize: '0.65rem',
                color: S.mute,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 700,
              }}
            >
              Studio
            </p>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: S.ink, margin: 0, lineHeight: 1.1 }}>
              {studioName}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                style={({ isActive }) => ({
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: isActive ? S.primary : S.mute,
                  background: isActive ? S.primarySoft : 'transparent',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.12s',
                })}
              >
                <Icon size={14} />
                {t.label}
              </NavLink>
            );
          })}
          <button
            onClick={signOut}
            title="Sign out"
            aria-label="Sign out"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: S.mute,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.86rem',
              fontFamily: HEADING_FONT,
            }}
          >
            <LogOut size={14} />
          </button>
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
