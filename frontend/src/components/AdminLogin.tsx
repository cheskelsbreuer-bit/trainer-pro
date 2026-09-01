import { useState } from 'react';
import { Mail, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PasteSignInLink } from './PasteSignInLink';
import { writeAdminVerified } from '../lib/adminSession';

/**
 * Admin sign-in: magic-link / email-OTP only.
 *
 * Why a separate component instead of reusing Login.tsx — admin access
 * intentionally requires a fresh email round-trip every browser tab. The
 * regular app stays logged in across tabs via Supabase's persisted session;
 * /admin gates additionally on a sessionStorage flag set after a fresh
 * magic-link sign-in. Closing the tab clears the flag and forces re-auth.
 */
export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pasteBox = (
    <div className="mt-5">
      <PasteSignInLink
        tone="rose"
        onDone={() => {
          // Same thing the ?verified=1 round-trip does, minus the round trip.
          writeAdminVerified();
          window.location.replace(window.location.pathname);
        }}
      />
    </div>
  );


  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          // Land back on /chesky with a marker the AdminShell will pick up.
          // (Renamed from /admin to bypass Livigent URL filtering.)
          // Come back to the same door they started at (/chesky or /hq).
          emailRedirectTo: `${window.location.origin}${window.location.pathname}?verified=1`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md text-center shadow-xl">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 items-center justify-center mb-4">
            <Mail size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-600 text-sm">
            We sent a sign-in link to <strong>{email}</strong>. Click it as soon as
            it arrives.
          </p>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
            <p className="text-xs font-semibold text-amber-900 mb-1">
              ⚠ Click fast — once only
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              The link is single-use and expires within an hour. Gmail / Outlook
              anti-spam can pre-click links and use them up before you do — if
              that happens, just request a new one.
            </p>
          </div>
          {pasteBox}

          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          >
            <RefreshCw size={11} /> Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-xl">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white items-center justify-center shadow-md shadow-rose-600/30 mb-3">
            <ShieldCheck size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Admin sign-in</h1>
          <p className="text-sm text-slate-500 mt-1">We'll email you a sign-in link.</p>
        </div>

        <form onSubmit={send} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={busy}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
            autoFocus
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email}
            className="w-full bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >
            {busy ? 'Sending…' : <>Send sign-in link <ArrowRight size={14} /></>}
          </button>
        </form>
        {pasteBox}

        <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
          For security, every new tab requires a fresh sign-in. No stored admin sessions.
        </p>
      </div>
    </div>
  );
}
