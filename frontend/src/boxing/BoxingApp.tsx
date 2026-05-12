// Boxing app — the entire app shell trainers see when their primary
// template is boxing_gym. Mirrors the structure of src/dojo/ but with
// boxing pages, theme, and vocabulary.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { BoxingLayout } from './components/BoxingLayout';
import { BoxingHome } from './pages/BoxingHome';
import { BoxingFighters } from './pages/BoxingFighters';
import { BoxingTraining } from './pages/BoxingTraining';
import { BoxingFights } from './pages/BoxingFights';
import { BoxingTiers } from './pages/BoxingTiers';
import { BoxingBilling } from './pages/BoxingBilling';
import { BoxingSettings } from './pages/BoxingSettings';

interface BoxingAppProps {
  trainer: Trainer | undefined;
}

export function BoxingApp({ trainer }: BoxingAppProps) {
  return (
    <Routes>
      <Route element={<BoxingLayout trainer={trainer} />}>
        <Route index element={<BoxingHome trainer={trainer} />} />
        <Route path="fighters" element={<BoxingFighters />} />
        <Route path="training" element={<BoxingTraining />} />
        <Route path="fights" element={<BoxingFights />} />
        <Route path="tiers" element={<BoxingTiers />} />
        <Route path="billing" element={<BoxingBilling />} />
        <Route path="settings" element={<BoxingSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
