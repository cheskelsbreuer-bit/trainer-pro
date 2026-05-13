// Boxing app routes. The entire app mounts here when the trainer's
// primary template is boxing_gym. Each page composes its OWN JSX —
// no shared "BoxingPage" wrapper, no shared header/card/stat-tile
// primitives. The shell (TopNav) is what unifies them visually.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { AppShell } from './components/AppShell';
import { HomePage } from './pages/HomePage';
import { StablePage } from './pages/StablePage';
import { WorkPage } from './pages/WorkPage';
import { FightNightPage } from './pages/FightNightPage';
import { ClimbPage } from './pages/ClimbPage';
import { BooksPage } from './pages/BooksPage';
import { CornerPage } from './pages/CornerPage';

export function BoxingApp({ trainer }: { trainer: Trainer | undefined }) {
  return (
    <Routes>
      <Route element={<AppShell trainer={trainer} />}>
        <Route index element={<HomePage trainer={trainer} />} />
        <Route path="stable" element={<StablePage />} />
        <Route path="work" element={<WorkPage />} />
        <Route path="fight-night" element={<FightNightPage />} />
        <Route path="climb" element={<ClimbPage />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="corner" element={<CornerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
