// The dojo app. Mounted by App.tsx whenever the trainer's primary
// template is martial_arts, completely replacing the standard Trainer
// Pro layout + page set.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { DojoLayout } from './components/DojoLayout';
import { DojoHome } from './pages/DojoHome';
import { DojoStudents } from './pages/DojoStudents';
import { DojoBelts } from './pages/DojoBelts';
import { DojoClasses } from './pages/DojoClasses';
import { DojoTournaments } from './pages/DojoTournaments';
import { DojoFamilies } from './pages/DojoFamilies';
import { DojoBilling } from './pages/DojoBilling';
import { DojoSettings } from './pages/DojoSettings';

interface DojoAppProps {
  trainer: Trainer | undefined;
}

/** Top-level dojo router. Owns ALL the trainer-facing URLs while a martial
 *  arts dojo is active — index renders DojoHome, /students renders the
 *  roster, /belts renders the promotion tracker, etc. */
export function DojoApp({ trainer }: DojoAppProps) {
  return (
    <Routes>
      <Route element={<DojoLayout trainer={trainer} />}>
        <Route index element={<DojoHome trainer={trainer} />} />
        <Route path="students" element={<DojoStudents />} />
        {/* For now student detail re-uses the standard ClientDetail page
            (it lives outside the dojo module). We'll build a dojo-flavored
            student detail page in a follow-up. */}
        <Route path="students/:id" element={<DojoStudents />} />
        <Route path="belts" element={<DojoBelts />} />
        <Route path="classes" element={<DojoClasses />} />
        <Route path="tournaments" element={<DojoTournaments />} />
        <Route path="families" element={<DojoFamilies />} />
        <Route path="billing" element={<DojoBilling />} />
        <Route path="settings" element={<DojoSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
