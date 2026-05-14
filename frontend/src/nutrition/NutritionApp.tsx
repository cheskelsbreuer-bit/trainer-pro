// Nutrition coach app — routes. Mounts under the nutrition_coach
// template fork in App.tsx.

import { Routes, Route, Navigate } from 'react-router-dom';
import type { Trainer } from '../lib/database.types';
import { AppShell } from './components/AppShell';
import { PracticePage } from './pages/PracticePage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { CheckInsPage } from './pages/CheckInsPage';
import { PlansPage } from './pages/PlansPage';
import { HabitsPage } from './pages/HabitsPage';
import { PlatePage } from './pages/PlatePage';
import { PantryPage } from './pages/PantryPage';
import { AskCoachPage } from './pages/AskCoachPage';
import { SessionsPage } from './pages/SessionsPage';
import { RecipesPage } from './pages/RecipesPage';
import { IntakePage } from './pages/IntakePage';

export function NutritionApp({ trainer }: { trainer: Trainer | undefined }) {
  return (
    <Routes>
      <Route element={<AppShell trainer={trainer} />}>
        <Route index element={<PracticePage trainer={trainer} />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="clients/:clientId/intake" element={<IntakePage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="intake" element={<IntakePage />} />
        <Route path="check-ins" element={<CheckInsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="ask" element={<AskCoachPage />} />
        <Route path="plate" element={<PlatePage />} />
        <Route path="pantry" element={<PantryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
