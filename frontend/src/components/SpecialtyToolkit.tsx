import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Settings as SettingsIcon } from 'lucide-react';
import type { Trainer } from '../lib/database.types';
import { toolsForSpecialties, SPECIALTIES_BY_VAL } from '../lib/specialties';

/**
 * Dashboard widget that surfaces the mini-apps relevant to whatever the
 * trainer said they coach. A martial-arts trainer sees belt progression and
 * fight log; a nutrition coach sees meal plans; etc. Live tools link to the
 * real page; everything else shows up as a "coming next for you" hint so the
 * dashboard feels personalized even before we ship them all.
 *
 * No specialties picked yet → CTA back to Settings instead of an empty card.
 */
export function SpecialtyToolkit({ trainer }: { trainer: Trainer }) {
  const slugs = trainer.specialties ?? [];
  const tools = toolsForSpecialties(slugs);

  if (slugs.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white text-blue-600 flex items-center justify-center shadow-sm">
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">
              Customize your dashboard
            </h3>
            <p className="text-sm text-slate-600 mt-0.5 mb-3">
              Tell us what you train people for and we'll surface the right
              tools — meal plans, group scheduler, belt tracker, and more.
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-900"
            >
              <SettingsIcon size={14} /> Pick your specialties
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const liveTools = tools.filter((t) => t.status === 'live');
  const soonTools = tools.filter((t) => t.status === 'soon');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Sparkles size={15} className="text-amber-500" /> Your toolkit
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Built around what you coach:{' '}
            <span className="text-slate-700 font-medium">
              {slugs
                .map((s) => SPECIALTIES_BY_VAL[s]?.label ?? s)
                .slice(0, 4)
                .join(' · ')}
              {slugs.length > 4 && ` · +${slugs.length - 4}`}
            </span>
          </p>
        </div>
        <Link
          to="/settings"
          className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap"
        >
          <SettingsIcon size={11} /> Edit
        </Link>
      </div>

      {liveTools.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Available now
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {liveTools.map((t) => (
              <Link
                key={t.id}
                to={t.href ?? '/settings'}
                className="group flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition"
              >
                <span className="text-xl">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700">
                    {t.title}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {t.blurb}
                  </p>
                </div>
                <ArrowRight
                  size={13}
                  className="text-slate-300 group-hover:text-blue-500 mt-1.5 flex-shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {soonTools.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Coming next for you
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {soonTools.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-dashed border-slate-200"
              >
                <span className="text-xl opacity-70">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    {t.title}
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                      Soon
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {t.blurb}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
