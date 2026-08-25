// Top-level routing for the Babysitting template. Mounted by App.tsx
// when trainer.template_slugs picks the 'babysitting' dashboard variant.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { KidsPage } from './pages/KidsPage';
import { KidDetailPage } from './pages/KidDetailPage';
import { FamiliesPage } from './pages/FamiliesPage';
import { BillingPage } from './pages/BillingPage';
import { MessagesPage } from './pages/MessagesPage';
import { AwayPage } from './pages/AwayPage';
import { FormerPage } from './pages/FormerPage';
import { ReportsPage } from './pages/ReportsPage';
import { LogPage } from './pages/LogPage';
import { SettingsPage } from './pages/SettingsPage';

export function BabysittingApp({ trainer }: { trainer: Trainer | undefined }) {
  return (
    <Routes>
      <Route element={<AppShell trainer={trainer} />}>
        <Route index element={<DashboardPage />} />
        <Route path="kids" element={<KidsPage />} />
        <Route path="kids/:id" element={<KidDetailPage />} />
        <Route path="families" element={<FamiliesPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="away" element={<AwayPage />} />
        <Route path="former" element={<FormerPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
