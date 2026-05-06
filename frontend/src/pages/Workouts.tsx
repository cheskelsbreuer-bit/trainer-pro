import { Dumbbell } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function Workouts() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="Workout plans" subtitle="Build templates, assign to clients, and log results." />

      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
        <Dumbbell className="mx-auto text-slate-300 mb-2" size={40} />
        <p className="text-slate-500 mb-2">Coming in Phase 3.</p>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The database and Python AI endpoint are ready. Next up: a builder UI for plans (sets, reps, weights), a logging
          flow during sessions, and progress charts per exercise.
        </p>
      </div>
    </div>
  );
}
