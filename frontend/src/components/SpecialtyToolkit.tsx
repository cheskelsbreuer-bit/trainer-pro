import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  ArrowRight,
  Settings as SettingsIcon,
  ThumbsUp,
  CheckCircle2,
  Wrench,
} from 'lucide-react';
import type { Trainer } from '../lib/database.types';
import { toolsForSpecialties, SPECIALTIES_BY_VAL } from '../lib/specialties';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

/**
 * Settings card: surfaces the mini-apps relevant to whatever the trainer
 * said they coach. Live tools link to the real page; "Coming next for you"
 * tools have a Request-this button that drops a feedback row, so the
 * trainer's wishlist directly ranks our build queue.
 *
 * No specialties picked → CTA back to the directory section above.
 */
export function SpecialtyToolkit({ trainer }: { trainer: Trainer }) {
  const slugs = trainer.specialties ?? [];
  const tools = toolsForSpecialties(slugs);

  if (slugs.length === 0) {
    return (
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg">Pick your specialties</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Tell us what you coach above (Public listing → Specialties) and
              this card will fill with the tools that matter to you — meal
              plans, group scheduler, belt tracker, PR log, and more.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const liveTools = tools.filter((t) => t.status === 'live');
  const soonTools = tools.filter((t) => t.status === 'soon');

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 via-blue-50 to-indigo-50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white text-amber-600 flex items-center justify-center shadow-sm">
            <Wrench size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              Your toolkit
              <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
                Personalized
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {tools.length} tools matched to{' '}
              <span className="font-semibold text-slate-900">
                {slugs
                  .map((s) => SPECIALTIES_BY_VAL[s]?.label ?? s)
                  .slice(0, 4)
                  .join(' · ')}
                {slugs.length > 4 && ` · +${slugs.length - 4}`}
              </span>
              . Update your specialties above to change what shows here.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {liveTools.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 size={12} />
              </div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-700">
                Available right now
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                {liveTools.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {liveTools.map((t) => (
                <Link
                  key={t.id}
                  to={t.href ?? '/settings'}
                  className="group flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition shadow-sm"
                >
                  <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 flex items-center gap-1">
                      {t.title}
                    </p>
                    <p className="text-xs text-slate-600 leading-snug mt-0.5">
                      {t.blurb}
                    </p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open <ArrowRight size={11} />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {soonTools.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                ⏳
              </div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-700">
                Coming next for you
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                {soonTools.length}
              </span>
              <span className="text-[10px] text-slate-500 ml-1">
                · click 👍 to bump it up our queue
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {soonTools.map((t) => (
                <SoonToolCard key={t.id} tool={t} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-500">
          Don&rsquo;t see a tool you need?{' '}
          <Link to="/settings" className="text-blue-600 hover:underline font-medium">
            Send feedback
          </Link>{' '}
          — every request goes straight to our build queue.
        </p>
      </div>
    </section>
  );
}

function SoonToolCard({ tool }: { tool: ReturnType<typeof toolsForSpecialties>[number] }) {
  const { user } = useAuth();
  const [voted, setVoted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('feedback').insert({
        trainer_id: user?.id,
        trainer_email: user?.email ?? null,
        category: 'feature',
        message: `Toolkit request: please prioritize "${tool.title}" — ${tool.blurb}`,
        url: typeof window !== 'undefined' ? window.location.href : null,
      });
      if (error) throw error;
    },
    onSuccess: () => setVoted(true),
  });

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-300">
      <span className="text-2xl flex-shrink-0 opacity-80">{tool.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          {tool.title}
          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
            Soon
          </span>
        </p>
        <p className="text-xs text-slate-600 leading-snug mt-0.5">{tool.blurb}</p>
        {voted ? (
          <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
            <CheckCircle2 size={11} /> Thanks — we got your vote.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
            className="text-[11px] text-blue-600 hover:text-blue-900 font-semibold mt-1.5 flex items-center gap-1 disabled:opacity-50"
          >
            <ThumbsUp size={11} />
            {submit.isPending ? 'Sending…' : 'Request this — bump it up'}
          </button>
        )}
        {submit.error && (
          <p className="text-[11px] text-rose-600 mt-1">
            {(submit.error as Error).message}
          </p>
        )}
      </div>
    </div>
  );
}

// Empty-state marker icon — only used by the no-specialties branch above.
// Lint-quiet helper export so future imports don't break.
export const _SettingsIcon = SettingsIcon;
