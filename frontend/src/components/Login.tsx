import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isConfigured } from '../lib/supabase';

type Mode = 'sign-in' | 'sign-up' | 'magic-link';

export function Login() {
  const { signIn, signUp, sendMagicLink } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-lg bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Setup needed</h1>
          <p className="text-slate-700 mb-4">
            This app needs a Supabase project before it can run.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>
              Create a free Supabase project at{' '}
              <a href="https://supabase.com" className="text-blue-600 underline">
                supabase.com
              </a>
              .
            </li>
            <li>In the SQL editor, run the file <code>supabase/01_schema.sql</code>.</li>
            <li>
              Copy <code>frontend/.env.example</code> to <code>frontend/.env.local</code> and fill in your
              project URL and anon key.
            </li>
            <li>
              Run <code>npm run dev</code> again.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else if (mode === 'sign-up') {
        const { error } = await signUp(email, password, fullName || email.split('@')[0]);
        if (error) setError(error);
        else setInfo('Account created. Check your email to confirm, then sign in.');
      } else {
        const { error } = await sendMagicLink(email);
        if (error) setError(error);
        else setInfo("Check your email for a sign-in link.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white items-center justify-center mb-3 shadow-lg shadow-blue-600/30">
            <Dumbbell size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Trainer Pro</h1>
          <p className="text-sm text-slate-500 mt-1">Run your training business in one place.</p>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          {(['sign-in', 'sign-up', 'magic-link'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 text-sm py-2 rounded-md transition ${
                mode === m
                  ? 'bg-white shadow text-slate-900 font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m === 'sign-in' ? 'Sign in' : m === 'sign-up' ? 'Sign up' : 'Magic link'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'sign-up' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Trainer"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          {mode !== 'magic-link' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2.5 rounded-lg transition"
          >
            {busy
              ? 'Working…'
              : mode === 'sign-in'
                ? 'Sign in'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Send magic link'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Your data is private — only you can read it.
        </p>
      </div>
    </div>
  );
}
