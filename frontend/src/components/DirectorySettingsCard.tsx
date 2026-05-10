import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Trainer } from '../lib/database.types';
import { SPECIALTIES } from '../lib/specialties';

/**
 * Settings card: control whether the trainer appears in the public
 * trainerpro.coach/find-trainers directory, what city/region they cover,
 * AND which specialties power their directory listing + dashboard toolkit.
 *
 * Specialties drive two things:
 *   1. Filter pills on /find-trainers so the right clients find them
 *   2. The "Your toolkit" widget on Dashboard — different mini-apps surface
 *      based on what they coach (group classes → group scheduler, etc.)
 */
export function DirectorySettingsCard({ trainer }: { trainer: Trainer }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [area, setArea] = useState(trainer.service_area ?? '');
  const [listed, setListed] = useState(trainer.directory_listed ?? true);
  const [specialties, setSpecialties] = useState<string[]>(trainer.specialties ?? []);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    setArea(trainer.service_area ?? '');
    setListed(trainer.directory_listed ?? true);
    setSpecialties(trainer.specialties ?? []);
  }, [trainer]);

  const toggleSpecialty = (val: string) => {
    setSpecialties((curr) =>
      curr.includes(val) ? curr.filter((v) => v !== val) : [...curr, val],
    );
  };

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('trainers')
        .update({
          service_area: area.trim() || null,
          directory_listed: listed,
          specialties,
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
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      {/* ── Service area ── */}
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

      {/* ── Specialties ── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
          <Sparkles size={14} className="text-slate-400" /> What you train people for
          <span className="text-slate-400 font-normal">
            {specialties.length > 0 && ` · ${specialties.length} selected`}
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {SPECIALTIES.map((o) => {
            const selected = specialties.includes(o.val);
            return (
              <button
                key={o.val}
                type="button"
                onClick={() => toggleSpecialty(o.val)}
                className={`relative px-2.5 py-2 rounded-lg border text-left text-xs font-medium transition ${
                  selected
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                {selected && (
                  <CheckCircle2
                    size={12}
                    className="absolute top-1 right-1 text-blue-600"
                    fill="white"
                  />
                )}
                <span className="mr-1">{o.emoji}</span>
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Drives both your directory filters and the mini-apps that show on
          your dashboard. Pick "group classes" → you get a group scheduler.
          Pick "nutrition coaching" → you get meal plans. Change anytime.
        </p>
      </div>

      {/* ── Public listing toggle ── */}
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

      {/* ── Save bar ── */}
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
