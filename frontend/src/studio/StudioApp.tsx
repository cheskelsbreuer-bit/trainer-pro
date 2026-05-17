// Top-level routing for the group_studio template. Mounted by
// App.tsx's ProtectedShell when dashboardVariant === 'studio_classes'.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { ClassesPage } from './pages/ClassesPage';
import { InstructorsPage } from './pages/InstructorsPage';
import { MembersPage } from './pages/MembersPage';
import { BookingsPage } from './pages/BookingsPage';
import { SettingsPage } from './pages/SettingsPage';

export function StudioApp({ trainer }: { trainer: Trainer | undefined }) {
  return (
    <Routes>
      <Route element={<AppShell trainer={trainer} />}>
        <Route index element={<DashboardPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="instructors" element={<InstructorsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="settings" element={<SettingsPage trainer={trainer} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
