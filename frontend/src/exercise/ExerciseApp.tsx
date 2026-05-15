// Top-level routing for the Exercise Group template. Mounted by
// App.tsx when trainer.template_slugs picks the 'exercise' dashboard
// variant. Mirrors the tab layout of the legacy single-file app.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { GroupsPage } from './pages/GroupsPage';
import { PausedPage } from './pages/PausedPage';
import { ArchivedPage } from './pages/ArchivedPage';
import { LookupPage } from './pages/LookupPage';
import { NotesPage } from './pages/NotesPage';
import { ReportsPage } from './pages/ReportsPage';
import { LogPage } from './pages/LogPage';
import { SettingsPage } from './pages/SettingsPage';

export function ExerciseApp({ trainer }: { trainer: Trainer | undefined }) {
  return (
    <Routes>
      <Route element={<AppShell trainer={trainer} />}>
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="paused" element={<PausedPage />} />
        <Route path="archived" element={<ArchivedPage />} />
        <Route path="lookup" element={<LookupPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="log" element={<LogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
