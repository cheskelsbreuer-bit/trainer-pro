// Boxing app top nav. Horizontal — deliberately NOT a sidebar (the
// dojo's pattern). Logo on the left, section pills in the center,
// gym ops on the right. On mobile this stays horizontal too — boxing
// gyms are phone-in-hand environments and a top strip stays touchable
// when the keyboard's up.

import { NavLink, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut } from 'lucide-react';
import { C, DISPLAY_FONT, useBoxingTheme } from '../theme';
import { supabase } from '../../lib/supabase';
import type { Trainer } from '../../lib/database.types';

const SECTIONS: { to: string; label: string }[] = [
  { to: '/', label: 'The Card' },
  { to: '/stable', label: 'Stable' },
  { to: '/work', label: 'The Work' },
  { to: '/fight-night', label: 'Fight Night' },
  { to: '/climb', label: 'The Climb' },
  { to: '/books', label: 'Books' },
  { to: '/corner', label: 'Corner' },
];

export function TopNav({ trainer }: { trainer: Trainer | undefined }) {
  const navigate = useNavigate();
  const [theme, toggleTheme] = useBoxingTheme();
  const gymName = trainer?.business_name || trainer?.full_name || 'Your Gym';

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: C.ink,
        borderColor: C.rule,
      }}
    >
      {/* The ribbon — a thin red bleed at the top edge, like the printed
          band of a fight poster. */}
      <div className="h-[2px] w-full" style={{ background: C.red }} aria-hidden />

      <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
        {/* Brand block — gym name in display sans, all-caps */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            aria-hidden
            className="text-2xl leading-none select-none"
            style={{ filter: theme === 'dark' ? 'none' : 'grayscale(0.1)' }}
          >
            🥊
          </span>
          <div className="leading-none">
            <p
              className="text-[10px] uppercase tracking-[0.3em] font-semibold"
              style={{ color: C.red }}
            >
              Boxing Pro
            </p>
            <p
              className="text-base font-black uppercase tracking-wider truncate max-w-[180px] sm:max-w-none"
              style={{
                fontFamily: DISPLAY_FONT,
                color: C.text,
                letterSpacing: '0.05em',
                marginTop: 2,
              }}
              title={gymName}
            >
              {gymName}
            </p>
          </div>
        </div>

        {/* Section pills — scrollable on mobile */}
        <nav className="flex-1 min-w-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin -mx-1 px-1">
            {SECTIONS.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                end={s.to === '/'}
                className={({ isActive }) =>
                  `shrink-0 px-3 py-1.5 text-xs uppercase tracking-widest font-bold transition-colors border ${
                    isActive ? '' : 'hover:opacity-90'
                  }`
                }
                style={({ isActive }) => ({
                  fontFamily: DISPLAY_FONT,
                  letterSpacing: '0.15em',
                  background: isActive ? C.red : 'transparent',
                  color: isActive ? '#FFFFFF' : C.textDim,
                  borderColor: isActive ? C.red : C.rule,
                })}
              >
                {s.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 flex items-center justify-center transition-colors hover:opacity-80"
            style={{
              background: 'transparent',
              color: C.textDim,
              border: `1px solid ${C.rule}`,
            }}
            title={theme === 'dark' ? 'Switch to paper mode' : 'Switch to night mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="w-8 h-8 flex items-center justify-center transition-colors hover:opacity-80"
            style={{
              background: 'transparent',
              color: C.textDim,
              border: `1px solid ${C.rule}`,
            }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
