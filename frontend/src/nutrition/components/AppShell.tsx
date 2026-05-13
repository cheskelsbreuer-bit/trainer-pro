// Nutrition coach app shell — masthead + page outlet. Theme class
// sits here so every page reads the active nutrition palette.

import { Outlet } from 'react-router-dom';
import { Masthead } from './Masthead';
import { N, BODY_FONT, useNutritionTheme } from '../theme';
import type { Trainer } from '../../lib/database.types';

export function AppShell({ trainer }: { trainer: Trainer | undefined }) {
  const [mode] = useNutritionTheme();
  return (
    <div
      className={`nutrition-theme-${mode} min-h-screen flex flex-col`}
      style={{
        background: N.paper,
        color: N.ink,
        fontFamily: BODY_FONT,
      }}
    >
      <Masthead trainer={trainer} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      {/* Tiny footer rule — magazine colophon vibe */}
      <footer
        className="px-6 sm:px-12 py-5 border-t mt-12 text-center text-[10px] uppercase tracking-[0.4em]"
        style={{ borderColor: N.rule, color: N.muteFaint, fontFamily: 'serif', fontStyle: 'italic' }}
      >
        Tend well · Eat well · Move well
      </footer>
    </div>
  );
}
