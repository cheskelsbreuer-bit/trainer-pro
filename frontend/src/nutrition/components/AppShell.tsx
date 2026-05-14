// App shell — sidebar (desktop) or top bar (mobile) + scrollable main
// content area. The two-column layout every leading coaching app uses.

import { Outlet } from 'react-router-dom';
import { Masthead, MobileTopBar } from './Masthead';
import { N, BODY_FONT, useNutritionTheme } from '../theme';
import type { Trainer } from '../../lib/database.types';

export function AppShell({ trainer }: { trainer: Trainer | undefined }) {
  const [mode] = useNutritionTheme();
  return (
    <div
      className={`nutrition-theme-${mode} min-h-screen flex`}
      style={{
        background: N.paper,
        color: N.ink,
        fontFamily: BODY_FONT,
      }}
    >
      <Masthead trainer={trainer} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar trainer={trainer} />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
