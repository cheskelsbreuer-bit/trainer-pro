// ── UnifiedApp — the neutral "all-in-one" shell ─────────────────────
//
// For a coach who does several disciplines AND chose (at signup) to have
// ONE combined app rather than separate apps they switch between. This
// is a brand-new neutral shell — deliberately NOT the dojo's dark
// belt-tracker or the nutrition magazine look. It belongs to no single
// template, so a multi-discipline coach feels at home no matter what
// they do.
//
// It is fully themed by the coach's chosen appearance (the --tp-* CSS
// variables applied app-wide), so their colors + fonts drive it. The
// menu is one combined list and the pages are the shared, discipline-
// agnostic CRM screens (Dashboard, Clients, Sessions, Payments,
// Workouts, Progress, Settings) rendered through the router Outlet.

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Wallet,
  Dumbbell,
  TrendingUp,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { pickTemplateUx } from '../lib/templateUx';
import { workspacesFor } from '../lib/workspaces';
import { useEnabledModules } from '../lib/modules';
import { useLayout, applyNavOrder } from '../lib/layout';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  end?: boolean;
  /** Optional module that gates this tab (core tabs have none). */
  module?: string;
}

export function UnifiedApp({ trainer }: { trainer: Trainer | undefined }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const slugs = trainer?.template_slugs ?? [];
  const ux = pickTemplateUx(slugs);
  const disciplines = workspacesFor(slugs);
  const { isOn } = useEnabledModules(slugs);
  const { layout } = useLayout();

  // Discipline-aware noun for the roster tab (clients / members / students…).
  const people = capitalize(ux.clientNounPlural);

  // One combined menu. Core CRM tabs always show; capability tabs appear
  // when the coach turned that module on (in any of their disciplines).
  const NAV: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clients', label: people, icon: Users },
    { to: '/sessions', label: 'Sessions', icon: CalendarClock, module: 'online-booking' },
    { to: '/payments', label: 'Payments', icon: Wallet },
    { to: '/workouts', label: 'Workouts', icon: Dumbbell, module: 'workout-builder' },
    { to: '/progress', label: 'Progress', icon: TrendingUp },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];
  const visible = applyNavOrder(
    NAV.filter((n) => !n.module || isOn(n.module)),
    layout.navOrder,
  );

  const businessName =
    trainer?.business_name?.trim() || trainer?.full_name?.trim() || 'Your business';

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--tp-bg, #f6f7fb)',
        color: 'var(--tp-ink, #0f172a)',
        fontFamily: 'var(--tp-font-body, system-ui, sans-serif)',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          background: 'var(--tp-surface, #ffffff)',
          borderRight: '1px solid var(--tp-rule, #e5eaf2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Brand + disciplines */}
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--tp-rule, #e5eaf2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--tp-radius, 11px)',
                background:
                  'linear-gradient(135deg, var(--tp-primary, #4f46e5), var(--tp-accent, var(--tp-primary, #4f46e5)))',
                color: '#fff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontFamily: 'var(--tp-font-display, inherit)',
              }}
            >
              {initials(businessName)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--tp-font-display, inherit)',
                }}
                title={businessName}
              >
                {businessName}
              </p>
              <p style={{ margin: 0, fontSize: '0.66rem', color: 'var(--tp-ink-soft, #64748b)' }}>
                All-in-one workspace
              </p>
            </div>
          </div>
          {disciplines.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
              {disciplines.map((d) => (
                <span
                  key={d.key}
                  title={d.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'var(--tp-ink-soft, #475569)',
                    background: 'var(--tp-bg, #f1f5f9)',
                    border: '1px solid var(--tp-rule, #e5eaf2)',
                    borderRadius: 999,
                    padding: '3px 8px',
                  }}
                >
                  <span>{d.emoji}</span>
                  {d.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: 10, overflowY: 'auto' }}>
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 11px',
                  margin: '2px 0',
                  borderRadius: 'var(--tp-radius, 10px)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive ? '#fff' : 'var(--tp-ink-soft, #475569)',
                  background: isActive ? 'var(--tp-primary, #4f46e5)' : 'transparent',
                })}
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: 12, borderTop: '1px solid var(--tp-rule, #e5eaf2)' }}>
          <div style={{ padding: '4px 8px 8px' }}>
            <p style={{ margin: 0, fontSize: '0.66rem', color: 'var(--tp-ink-soft, #94a3b8)' }}>
              Signed in as
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={user?.email ?? ''}
            >
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 11px',
              borderRadius: 'var(--tp-radius, 10px)',
              border: 'none',
              background: 'transparent',
              color: 'var(--tp-ink-soft, #475569)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
