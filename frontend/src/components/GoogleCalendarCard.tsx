import { useState } from 'react';
import { CalendarCheck, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Trainer } from '../lib/database.types';

// Placeholder card — actual OAuth flow + sync engine ships in Phase 2.x.
// See docs/GOOGLE_CALENDAR_SETUP.md.
export function GoogleCalendarCard({ trainer }: { trainer: Trainer }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const connected = !!(trainer as Trainer & { google_refresh_token?: string }).google_refresh_token;

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-3">
        <CalendarCheck size={18} className="text-blue-600 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Google Calendar sync</h3>
            <span className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              Coming soon
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Two-way sync: your sessions appear on Google, your other Google events block your booking page.
          </p>
        </div>
      </div>

      {connected ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={14} /> Connected.
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Not yet connected.</p>
              <p className="text-xs text-amber-800 mt-1">
                Requires a one-time Google Cloud OAuth setup. Takes about 15 minutes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => setShowInstructions(true)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Show setup instructions
            </button>
            <button
              disabled
              className="text-xs px-3 py-1.5 rounded bg-slate-100 text-slate-400 cursor-not-allowed"
              title="Available after Google Cloud OAuth setup"
            >
              Connect Google Calendar
            </button>
          </div>
        </div>
      )}

      {showInstructions && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setShowInstructions(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-semibold text-slate-900 mb-2">Setting up Google Calendar sync</h4>
            <p className="text-sm text-slate-600 mb-4">
              The full step-by-step lives in <code className="bg-slate-100 px-1 rounded text-xs">docs/GOOGLE_CALENDAR_SETUP.md</code>.
              The short version:
            </p>
            <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside mb-4">
              <li>Create a Google Cloud project + enable the Calendar API.</li>
              <li>Configure OAuth consent screen + create a Web OAuth client.</li>
              <li>Add the redirect URI <code className="bg-slate-100 px-1 rounded text-xs">http://localhost:8000/google/oauth/callback</code>.</li>
              <li>Paste the client id + secret into <code className="bg-slate-100 px-1 rounded text-xs">backend/.env</code>.</li>
              <li>Run <code className="bg-slate-100 px-1 rounded text-xs">supabase/06_google_calendar.sql</code> if you haven't.</li>
              <li>Restart the backend, come back here, click Connect.</li>
            </ol>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                Open Google Cloud Console <ExternalLink size={12} />
              </a>
              <button
                onClick={() => setShowInstructions(false)}
                className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
