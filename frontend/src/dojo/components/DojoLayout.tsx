// The dojo app shell. Dark theme, condensed bold sans for headers, crimson
// brand bar, gold rank highlights. This Layout replaces Trainer Pro's
// default Layout entirely when a martial-arts dojo is active.

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  ShieldCheck,
  CalendarDays,
  Trophy,
  HeartHandshake,
  Wallet,
  Settings,
  LogOut,
} from 'lucide-react';
import { DOJO_COLORS } from '../theme';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';

interface DojoLayoutProps {
  trainer: Trainer | undefined;
}

const NAV: { to: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { to: '/', label: 'Dojo', icon: Home },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/belts', label: 'Belts & Promotions', icon: ShieldCheck },
  { to: '/classes', label: 'Classes', icon: CalendarDays },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/families', label: 'Families', icon: HeartHandshake },
  { to: '/billing', label: 'Billing', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function DojoLayout({ trainer }: DojoLayoutProps) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const dojoName = trainer?.business_name || trainer?.full_name || 'Your Dojo';

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: DOJO_COLORS.bgPage,
        color: DOJO_COLORS.textPrimary,
        fontFamily:
          "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-60 shrink-0 border-r"
        style={{
          background: DOJO_COLORS.bgPanel,
          borderColor: DOJO_COLORS.divider,
        }}
      >
        {/* Brand */}
        <div
          className="px-5 py-5 border-b flex items-center gap-3"
          style={{ borderColor: DOJO_COLORS.divider }}
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center text-white font-black text-lg shrink-0"
            style={{
              background: DOJO_COLORS.brand,
              boxShadow: `0 0 0 3px ${DOJO_COLORS.brandRing}`,
              fontFamily:
                "'Bebas Neue', 'Oswald', 'Arial Narrow', system-ui, sans-serif",
              letterSpacing: '0.05em',
            }}
            aria-hidden
          >
            道
          </div>
          <div className="min-w-0">
            <p
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: DOJO_COLORS.gold }}
            >
              Dojo Pro
            </p>
            <p
              className="text-sm font-bold truncate"
              style={{ color: DOJO_COLORS.textPrimary }}
              title={dojoName}
            >
              {dojoName}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 ${
                    isActive
                      ? 'font-semibold'
                      : 'border-transparent hover:bg-[#1F1F25]'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? DOJO_COLORS.textPrimary : DOJO_COLORS.textSecondary,
                  background: isActive ? '#1F1F25' : 'transparent',
                  borderLeftColor: isActive ? DOJO_COLORS.brand : 'transparent',
                })}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sign out */}
        <div
          className="px-5 py-3 border-t"
          style={{ borderColor: DOJO_COLORS.divider }}
        >
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs uppercase tracking-wider hover:opacity-100 opacity-70 transition-opacity"
            style={{ color: DOJO_COLORS.textSecondary }}
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar — sidebar collapses to scrollable nav strip */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 border-b"
        style={{
          background: DOJO_COLORS.bgPanel,
          borderColor: DOJO_COLORS.divider,
        }}
      >
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <div
            className="shrink-0 w-7 h-7 rounded flex items-center justify-center text-white font-black"
            style={{ background: DOJO_COLORS.brand }}
            aria-hidden
          >
            道
          </div>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs ${
                    isActive ? 'font-semibold' : ''
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? DOJO_COLORS.bgPanelHover : 'transparent',
                  color: isActive ? DOJO_COLORS.textPrimary : DOJO_COLORS.textSecondary,
                  borderBottom: isActive ? `2px solid ${DOJO_COLORS.brand}` : 'none',
                })}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Page outlet */}
      <main className="flex-1 min-w-0 md:pt-0 pt-12">
        <Outlet />
      </main>
    </div>
  );
}
