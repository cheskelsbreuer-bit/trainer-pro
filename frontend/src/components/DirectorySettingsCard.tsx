import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';

/**
 * Settings card: control whether the trainer appears in the public
 * trainerpro.coach/find-trainers directory and what city/region they cover.
 */
export function DirectorySettingsCard({ trainer }: { trainer: Trainer }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [area, setArea] = useState(trainer.service_area ?? '');
  const [listed, setListed] = useState(trainer.directory_listed ?? true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setArea(trainer.service_area ?? '');
    setListed(trainer.directory_listed ?? true);
  }, [trainer]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('trainers')
        .update({
          service_area: area.trim() || null,
          directory_listed: listed,
        })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', user?.id] });
      setSavedAt(new Date());
      setTimeout(() => setSavedAt(null), 2500);
    },
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-400" /> Service area
        </label>
        <input
          type="text"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="e.g. Brooklyn, NY  ·  Miami, FL  ·  Greater Los Angeles"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-slate-500 mt-1.5">
          Free-form. Clients searching the directory can find you by typing any part of this.
        </p>
      </div>

      <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
        <input
          type="checkbox"
          checked={listed}
          onChange={(e) => setListed(e.target.checked)}
          className="w-4 h-4 mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            {listed ? (
              <Eye size={14} className="text-emerald-600" />
            ) : (
              <EyeOff size={14} className="text-slate-400" />
            )}
            <p className="text-sm font-medium text-slate-900">
              {listed ? 'Listed in the public directory' : 'Hidden from the public directory'}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            When listed, your card appears at{' '}
            <a
              href="/find-trainers"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              trainerpro.coach/find-trainers
            </a>{' '}
            so anyone looking for a trainer in your area can find you. Uncheck if you only
            want existing clients to find you.
          </p>
        </div>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {save.isPending ? 'Saving…' : 'Save directory settings'}
        </button>
        {savedAt && (
          <span className="text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={14} /> Saved
          </span>
        )}
        {save.error && (
          <span className="text-sm text-red-600">
            {(save.error as Error).message}
          </span>
        )}
      </div>
    </section>
  );
}
