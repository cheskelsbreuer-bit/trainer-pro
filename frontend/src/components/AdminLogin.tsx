import { useState } from 'react';
import { Mail, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          // Land back on /admin with a marker the AdminShell will pick up.
          emailRedirectTo: `${window.location.origin}/admin?verified=1`,
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
            We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to
            enter the admin panel.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            The link expires in an hour. If you don't see it, check spam.
          </p>
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
        <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
          For security, every new tab requires a fresh sign-in. No stored admin sessions.
        </p>
      </div>
    </div>
  );
}
