// Boxing app shell. Dark theme by default, with theme toggle. Sidebar
// uses a red-corner brand strip and the GYM gloves emoji. Mobile gets
// a horizontal scrolling nav strip.

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Dumbbell,
  Trophy,
  Layers,
  Wallet,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { BOXING_COLORS, useBoxingTheme } from '../theme';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';

interface BoxingLayoutProps {
  trainer: Trainer | undefined;
}

const NAV: { to: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { to: '/', label: 'Gym', icon: Home },
  { to: '/fighters', label: 'Fighters', icon: Users },
  { to: '/training', label: 'Training', icon: Dumbbell },
  { to: '/fights', label: 'Fights', icon: Trophy },
  { to: '/tiers', label: 'Tiers', icon: Layers },
  { to: '/billing', label: 'Billing', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BoxingLayout({ trainer }: BoxingLayoutProps) {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useBoxingTheme();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  const gymName = trainer?.business_name || trainer?.full_name || 'Your Gym';

  return (
    <div
      className={`boxing-theme-${theme} min-h-screen flex`}
      style={{
        background: BOXING_COLORS.bgPage,
        color: BOXING_COLORS.textPrimary,
        fontFamily:
          "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-60 shrink-0 border-r"
        style={{
          background: BOXING_COLORS.bgPanel,
          borderColor: BOXING_COLORS.divider,
        }}
      >
        {/* Brand strip with red corner accent on top */}
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(to right, ${BOXING_COLORS.red} 0%, ${BOXING_COLORS.red} 50%, ${BOXING_COLORS.blue} 50%, ${BOXING_COLORS.blue} 100%)`,
          }}
          aria-hidden
        />
        <div
          className="px-5 py-5 border-b flex items-center gap-3"
          style={{ borderColor: BOXING_COLORS.divider }}
        >
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center text-white text-xl font-black shrink-0"
            style={{
              background: BOXING_COLORS.red,
              boxShadow: `0 0 0 3px ${BOXING_COLORS.redRing}`,
            }}
            aria-hidden
          >
            🥊
          </div>
          <div className="min-w-0">
            <p
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: BOXING_COLORS.gold }}
            >
              Boxing Pro
            </p>
            <p
              className="text-sm font-bold truncate"
              style={{ color: BOXING_COLORS.textPrimary }}
              title={gymName}
            >
              {gymName}
            </p>
          </div>
        </div>

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
                    isActive ? 'font-semibold' : 'border-transparent'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? BOXING_COLORS.textPrimary : BOXING_COLORS.textSecondary,
                  background: isActive ? BOXING_COLORS.bgPanelHover : 'transparent',
                  borderLeftColor: isActive ? BOXING_COLORS.red : 'transparent',
                })}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div
          className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: BOXING_COLORS.divider }}
        >
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs uppercase tracking-wider hover:opacity-100 opacity-70 transition-opacity"
            style={{ color: BOXING_COLORS.textSecondary }}
          >
            <LogOut size={14} /> Sign out
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{
              background: BOXING_COLORS.bgInset,
              border: `1px solid ${BOXING_COLORS.divider}`,
              color: BOXING_COLORS.textSecondary,
            }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 border-b"
        style={{
          background: BOXING_COLORS.bgPanel,
          borderColor: BOXING_COLORS.divider,
        }}
      >
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <div
            className="shrink-0 w-7 h-7 rounded flex items-center justify-center text-white text-base font-black"
            style={{ background: BOXING_COLORS.red }}
            aria-hidden
          >
            🥊
          </div>
          <button
            onClick={toggleTheme}
            className="shrink-0 w-7 h-7 rounded flex items-center justify-center"
            style={{
              background: BOXING_COLORS.bgInset,
              border: `1px solid ${BOXING_COLORS.divider}`,
              color: BOXING_COLORS.textSecondary,
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs ${isActive ? 'font-semibold' : ''}`
                }
                style={({ isActive }) => ({
                  background: isActive ? BOXING_COLORS.bgPanelHover : 'transparent',
                  color: isActive ? BOXING_COLORS.textPrimary : BOXING_COLORS.textSecondary,
                  borderBottom: isActive ? `2px solid ${BOXING_COLORS.red}` : 'none',
                })}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-12">
        <Outlet />
      </main>
    </div>
  );
}
