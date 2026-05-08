import { useState } from 'react';
import { Send, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type Category = 'bug' | 'feature' | 'general' | 'other';

const CATEGORIES: { val: Category; label: string; emoji: string }[] = [
  { val: 'bug', label: 'Something is broken', emoji: '🐛' },
  { val: 'feature', label: 'I want a new feature', emoji: '✨' },
  { val: 'general', label: 'General feedback', emoji: '💬' },
  { val: 'other', label: 'Something else', emoji: '🤷' },
];

/** Discreet feedback form for the Settings page — submits to public.feedback. */
export function FeedbackCard() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [sentAt, setSentAt] = useState<Date | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('feedback').insert({
        trainer_id: user!.id,
        trainer_email: user?.email ?? null,
        category,
        message: message.trim(),
        user_agent: navigator.userAgent,
        url: window.location.href,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSentAt(new Date());
      setMessage('');
      setCategory('general');
    },
  });

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">Send feedback</h2>
          <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
            Hit a bug? Want a feature? Tell us — every message goes straight to the
            person building this app.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!message.trim()) return;
          submit.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            What's this about?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.val}
                type="button"
                onClick={() => setCategory(c.val)}
                className={`text-left px-3 py-2 rounded-lg border-2 text-xs transition ${
                  category === c.val
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-base mb-0.5">{c.emoji}</div>
                <div className="font-medium text-slate-800 leading-tight">{c.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what's going on…"
            rows={4}
            maxLength={5000}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>We'll see your email + browser info attached automatically.</span>
            <span>{message.length}/5000</span>
          </div>
        </div>

        {submit.error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>Couldn't send: {(submit.error as Error).message}</span>
          </div>
        )}

        {sentAt && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
            <CheckCircle2 size={14} />
            <span>
              Thanks — got it. We'll read every message.{' '}
              <button
                type="button"
                onClick={() => setSentAt(null)}
                className="underline hover:no-underline"
              >
                Send another
              </button>
            </span>
          </div>
        )}

        {!sentAt && (
          <button
            type="submit"
            disabled={submit.isPending || !message.trim()}
            className="bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
          >
            <Send size={14} />
            {submit.isPending ? 'Sending…' : 'Send feedback'}
          </button>
        )}
      </form>
    </section>
  );
}
