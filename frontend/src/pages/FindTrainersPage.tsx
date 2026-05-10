import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Dumbbell,
  ArrowRight,
  Sparkles,
  Users,
  Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SPECIALTIES, SPECIALTIES_BY_VAL } from '../lib/specialties';

interface DirectoryTrainer {
  id: string;
  slug: string | null;
  name: string | null;
  full_name: string | null;
  primary_color: string | null;
  logo_url: string | null;
  service_area: string | null;
  specialties: string[] | null;
  headline: string | null;
  photo_url: string | null;
  bio_snippet: string | null;
}

export function FindTrainersPage() {
  const [areaInput, setAreaInput] = useState('');
  const [appliedArea, setAppliedArea] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['directory', appliedArea, specialty],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_directory_trainers', {
        p_area: appliedArea || null,
        p_specialty: specialty,
      });
      if (error) throw error;
      return (data ?? []) as DirectoryTrainer[];
    },
    retry: false,
  });

  const trainers = useMemo(() => data ?? [], [data]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <Dumbbell size={18} strokeWidth={2.5} />
            </div>
            <span className="font-bold">Trainer Pro</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900 hidden sm:inline">
              Are you a trainer?
            </Link>
            <Link
              to="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              List your business
            </Link>
          </div>
        </div>
      </header>

      {/* Hero / search */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 -right-20 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-medium mb-5 shadow-sm">
            <Sparkles size={11} className="text-amber-500" />
            <span className="text-slate-700">Find a personal trainer near you</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Find a trainer who{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              fits your goals.
            </span>
          </h1>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Real personal trainers and small studios — book a free intro session in seconds.
          </p>

          {/* Search bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedArea(areaInput.trim());
            }}
            className="max-w-xl mx-auto flex flex-col sm:flex-row gap-2 mb-4"
          >
            <div className="relative flex-1">
              <MapPin
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                placeholder="City or zip — try Brooklyn, Miami, 10001…"
                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/30"
            >
              <Search size={16} />
              Search
            </button>
          </form>

          {/* Specialty filter pills */}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-1.5 justify-center text-xs text-slate-500 mb-2">
              <Filter size={12} />
              <span>Filter by what they train:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <button
                type="button"
                onClick={() => setSpecialty(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  specialty === null
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                All
              </button>
              {SPECIALTIES.map((info) => (
                <button
                  key={info.val}
                  type="button"
                  onClick={() => setSpecialty(info.val === specialty ? null : info.val)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    specialty === info.val
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="mr-1">{info.emoji}</span>
                  {info.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-5 mt-2">
          <p className="text-sm text-slate-500">
            {isLoading
              ? 'Searching…'
              : `${trainers.length} trainer${trainers.length === 1 ? '' : 's'}${
                  appliedArea ? ` in "${appliedArea}"` : ''
                }${specialty ? ` · ${SPECIALTIES_BY_VAL[specialty]?.label ?? specialty}` : ''}`}
          </p>
          {(appliedArea || specialty) && (
            <button
              type="button"
              onClick={() => {
                setAreaInput('');
                setAppliedArea('');
                setSpecialty(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : error ? (
          <ErrorState message={(error as Error).message} />
        ) : trainers.length === 0 ? (
          <EmptyState appliedArea={appliedArea} hasSpecialty={!!specialty} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trainers.map((t) => (
              <TrainerCard key={t.id} trainer={t} />
            ))}
          </div>
        )}
      </section>

      {/* Footer / CTA for trainers */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 py-14">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <Users size={32} className="mx-auto mb-3 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Are you a personal trainer?
          </h2>
          <p className="text-blue-100 mb-6 max-w-md mx-auto">
            List your business here for free. We send you new client leads — no commission,
            no per-lead fees.
          </p>
          <Link
            to="/?mode=sign-up"
            className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-amber-50 px-6 py-3 rounded-xl font-semibold transition"
          >
            List my training business <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── Trainer card ─────────────── */
function TrainerCard({ trainer }: { trainer: DirectoryTrainer }) {
  const initials = getInitials(trainer.name || trainer.full_name || 'T');
  const brand = trainer.primary_color || '#2563eb';
  const profileUrl = trainer.slug ? `/p/${trainer.slug}` : '#';

  return (
    <Link
      to={profileUrl}
      className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col"
    >
      {/* Hero band */}
      <div
        className="h-20 relative flex items-end"
        style={{
          background: `linear-gradient(135deg, ${brand} 0%, ${shade(brand, -25)} 100%)`,
        }}
      >
        {trainer.photo_url ? (
          <img
            src={trainer.photo_url}
            alt={trainer.name ?? ''}
            className="w-16 h-16 rounded-2xl border-4 border-white shadow-md object-cover -mb-8 ml-5"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white font-bold text-xl -mb-8 ml-5"
            style={{
              background: `linear-gradient(135deg, ${shade(brand, -20)} 0%, ${shade(brand, -40)} 100%)`,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      <div className="p-5 pt-10 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-900 text-lg leading-tight">
          {trainer.name || trainer.full_name}
        </h3>
        {trainer.headline && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{trainer.headline}</p>
        )}
        {trainer.service_area && (
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <MapPin size={10} /> {trainer.service_area}
          </p>
        )}

        {trainer.bio_snippet && (
          <p className="text-sm text-slate-600 mt-3 line-clamp-3 flex-1">
            {trainer.bio_snippet}
          </p>
        )}

        {trainer.specialties && trainer.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {trainer.specialties.slice(0, 3).map((s) => {
              const info = SPECIALTIES_BY_VAL[s];
              return (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium"
                >
                  {info ? `${info.emoji} ${info.label}` : s}
                </span>
              );
            })}
            {trainer.specialties.length > 3 && (
              <span className="text-[10px] text-slate-500">
                +{trainer.specialties.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
          View profile & book <ArrowRight size={11} />
        </div>
      </div>
    </Link>
  );
}

function ErrorState({ message }: { message: string }) {
  // Detect the two common back-end failure modes so the user knows it's a
  // 30-sec SQL fix, not a "the page is broken" mystery.
  const missingRpc = /function .* does not exist|404|not found/i.test(message);
  const sqlBug = /missing FROM-clause|column .* does not exist|relation/i.test(message);
  return (
    <div className="text-center py-14 bg-rose-50 rounded-2xl border border-dashed border-rose-200">
      <p className="text-rose-800 font-medium mb-2">
        Couldn&rsquo;t load the directory.
      </p>
      <p className="text-sm text-rose-700 max-w-lg mx-auto mb-3">
        {missingRpc
          ? 'The directory backend isn’t live yet. Run supabase/19_directory.sql in the Supabase SQL editor and refresh.'
          : sqlBug
          ? 'The directory SQL function has a bug — re-run the latest supabase/19_directory.sql in the Supabase SQL editor (it’s been patched) and refresh.'
          : message}
      </p>
      <p className="text-xs text-rose-500 font-mono break-all max-w-xl mx-auto">
        {message}
      </p>
    </div>
  );
}

function EmptyState({ appliedArea, hasSpecialty }: { appliedArea: string; hasSpecialty: boolean }) {
  return (
    <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
      <Search className="mx-auto text-slate-300 mb-3" size={36} />
      <p className="text-slate-700 font-medium mb-1">
        {appliedArea || hasSpecialty ? 'No trainers match yet.' : 'Directory is just opening.'}
      </p>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">
        {appliedArea
          ? `We don't have a trainer listed in "${appliedArea}" yet — try a nearby city, or clear the filter.`
          : 'New trainers join every week. Check back soon, or invite a trainer you know.'}
      </p>
    </div>
  );
}

/* ─────────────── Helpers ─────────────── */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'T';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shade(hex: string, percent: number): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n + (n * percent) / 100)))
      .toString(16)
      .padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
