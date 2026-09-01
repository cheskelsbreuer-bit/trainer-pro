import { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { redeemMagicLink } from '../lib/magicLink';

/**
 * "The link sends me to the wrong site."
 *
 * Clicking a sign-in link hands control to Supabase, which then bounces the
 * browser to whatever address it was given — but only if that address is on
 * its allow-list. Anything else quietly falls back to the project's Site
 * URL, and you arrive, signed in, at a completely different website.
 *
 * Every one of those emails also prints the raw URL under "Or paste this
 * URL into your browser". Pasting it here redeems the token in place: no
 * redirect, so nothing can misroute it. Worth having even once the
 * allow-list is right — it's the answer to every "the link didn't work".
 */
export function PasteSignInLink({
  onDone,
  tone = 'slate',
}: {
  /** Runs after a successful sign-in. Default: reload where we stand. */
  onDone?: () => void;
  tone?: 'slate' | 'rose';
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await redeemMagicLink(value);
    if (res.error) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (onDone) onDone();
    else window.location.replace(window.location.pathname);
  }

  const ring = tone === 'rose' ? 'focus:ring-rose-500' : 'focus:ring-slate-500';

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ClipboardPaste size={12} /> The link sends me to the wrong site
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 text-left">
      <p className="text-xs text-slate-600 leading-relaxed">
        In the email, under <em>"Or paste this URL into your browser"</em>, copy the
        whole long address and paste it here. Don't click it — pasting it signs you
        in right here, and nothing can send you somewhere else.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://….supabase.co/auth/v1/verify?token=…"
        rows={3}
        className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 ${ring}`}
      />
      {error && <p className="text-xs text-red-600 leading-relaxed">{error}</p>}
      <button
        type="submit"
        disabled={busy || !value.trim()}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-semibold"
      >
        {busy ? 'Signing you in…' : 'Sign me in with this link'}
      </button>
    </form>
  );
}
