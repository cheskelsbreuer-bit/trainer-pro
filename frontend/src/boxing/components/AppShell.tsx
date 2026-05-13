// The boxing app shell — TopNav at the top + Outlet below. Theme class
// lives here so every page renders against the active palette. Themed
// background is the BIG black sheet that defines the whole experience.

import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { C, useBoxingTheme } from '../theme';
import type { Trainer } from '../../lib/database.types';

export function AppShell({ trainer }: { trainer: Trainer | undefined }) {
  const [theme] = useBoxingTheme();
  return (
    <div
      className={`boxing-theme-${theme} min-h-screen flex flex-col`}
      style={{
        background: C.ink,
        color: C.text,
        fontFamily:
          "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <TopNav trainer={trainer} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
