// Ask the Coach — a chat with a PN-trained assistant for the nutrition
// COACH (not the client). When the coach isn't sure what a term means,
// what practice to assign next, or how to handle a stuck client, they
// can ask here and get PN-grounded guidance.
//
// Wired to a Supabase Edge Function at /functions/v1/coach-assistant
// which proxies to Claude with the PN system prompt. See
// supabase/functions/coach-assistant/index.ts.

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RotateCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { N, SERIF_FONT, BODY_FONT } from '../theme';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// The canonical PN system prompt — sent from the frontend so we can
// iterate on the bot's behavior without re-deploying the edge function.
// The edge function uses its own default if this is omitted.
const SYSTEM_PROMPT = `You are a PN-trained nutrition coaching assistant for
the COACH (not the client).

ANSWER STYLE — STRICT:
- Lead with the direct answer in 1–4 sentences. That's the whole reply for
  simple questions.
- If the question is complex, after the direct answer add ONE short
  paragraph (2–3 sentences) starting with "Why this:" that explains the
  reasoning.
- No preamble, no hedging, no "great question." Just the move.
- Plain English. Short sentences. Stay under 120 words total unless the
  coach explicitly asks for depth.

CORE PN METHOD (use this as the lens):
- Goal → Skill → Practice. Assign ONE daily practice at a time, ~2 weeks
  per practice, 9-or-10/10 confidence, then layer the next.
- 5-S: every practice must be Simple, Segmental, Sequential, Strategic,
  Supported.
- Signature practices by ROI: eat slowly · eat to 80% full · protein with
  every meal (palm) · veggies with every meal (fist) · whole foods 5 of 7
  days · hand portions (palm/fist/cupped/thumb) · 7+h sleep · 5 breaths
  before eating · 10-min stress walk · "something not nothing".
- Anti-patterns to coach against: macro counting before hunger awareness,
  all-or-nothing thinking, restriction, ignoring sleep/stress.
- When asked about a specific client, ask what their CURRENT practice is
  + how many days in BEFORE recommending. Default to the simplest next
  step. Lean toward adding, not subtracting.

HARD LIMITS:
- No medical advice, no ED treatment, no supplement dosing.
- No calorie prescriptions before hunger-awareness practices.
- If you don't know, say so. Never invent research.`;

// Prompt suggestions surfaced when the chat is empty — gives the coach
// an idea of what they can ask. All are real PN-shaped questions.
const SUGGESTIONS = [
  "What's the difference between adherence and compliance in PN?",
  'My client lost 2 lb in week 1 then stalled. What now?',
  'When should I move from "eat slowly" to "eat to 80% full"?',
  "Client says they hate vegetables. What's a PN-shaped move?",
  "How do I coach someone with all-or-nothing thinking?",
  'How do hand portions work for a tall, lean male athlete?',
];

export function AskCoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('coach-assistant', {
        body: { messages: next, system: SYSTEM_PROMPT },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const reply = (data?.reply as string) ?? '';
      if (!reply) throw new Error('Empty reply from the coach.');
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]);
    setError(null);
    setInput('');
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-3xl mx-auto pb-12">
      {/* App-style header, left-aligned */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} style={{ color: N.coral }} />
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: N.coral }}>
            PN-trained assistant
          </p>
        </div>
        <h1
          className="leading-tight"
          style={{
            fontFamily: SERIF_FONT,
            color: N.ink,
            fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          Ask the Coach
        </h1>
        <p
          className="mt-1.5 text-sm leading-relaxed"
          style={{ color: N.mute }}
        >
          Stuck on a client? Ask about a practice, a stalled scale, or
          all-or-nothing thinking. Short answers, PN-shaped.
        </p>
      </section>

      {/* Conversation */}
      <div
        className="rounded-xl p-5 sm:p-6 min-h-[260px]"
        style={{
          background: N.card,
          border: `1px solid ${N.rule}`,
        }}
      >
        {messages.length === 0 && !sending ? (
          <div>
            <p
              className="text-sm font-medium mb-4"
              style={{ color: N.mute }}
            >
              Try one of these, or ask anything:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => send(s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-[var(--nut-inset)] transition-colors leading-snug"
                    style={{
                      background: 'transparent',
                      color: N.ink,
                      border: `1px solid ${N.rule}`,
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((m, i) => (
              <Message key={i} msg={m} />
            ))}
            {sending && <ThinkingBubble />}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div
          className="mt-3 p-3 rounded-lg text-sm italic"
          style={{
            background: N.coralSoft,
            color: N.coralDeep,
            border: `1px solid ${N.coral}55`,
            fontFamily: SERIF_FONT,
          }}
        >
          {error}
          {error.toLowerCase().includes('not configured') && (
            <div
              className="mt-2 text-xs italic"
              style={{ color: N.ink, fontFamily: SERIF_FONT }}
            >
              The edge function isn't deployed yet. See setup instructions —
              run <code>supabase secrets set ANTHROPIC_API_KEY=…</code> then{' '}
              <code>supabase functions deploy coach-assistant</code>.
            </div>
          )}
        </div>
      )}

      {/* Composer */}
      <div
        className="mt-3 rounded-xl p-2 flex items-end gap-2"
        style={{
          background: N.card,
          border: `1px solid ${N.rule}`,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="What's on your mind, coach?"
          rows={1}
          className="flex-1 px-3 py-2 text-sm focus:outline-none resize-none"
          style={{
            background: 'transparent',
            color: N.ink,
            fontSize: '0.9375rem',
            minHeight: 38,
            maxHeight: 160,
          }}
        />
        {messages.length > 0 && (
          <button
            onClick={reset}
            title="Start over"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--nut-inset)] transition-colors"
            style={{ color: N.mute }}
          >
            <RotateCw size={14} />
          </button>
        )}
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-opacity hover:opacity-95"
          style={{ background: N.coral, color: '#FFF' }}
        >
          <Send size={14} /> {sending ? 'Asking…' : 'Ask'}
        </button>
      </div>

      <p
        className="text-xs mt-4 text-center"
        style={{ color: N.muteFaint }}
      >
        Powered by Claude, trained on the PN approach. Not clinical advice.
      </p>
    </div>
  );
}

function Message({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <li className="flex">
        <div
          className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5"
          style={{ background: N.coral, color: '#FFF' }}
        >
          <p
            className="leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: BODY_FONT, fontSize: '0.9375rem' }}
          >
            {msg.content}
          </p>
        </div>
      </li>
    );
  }
  return (
    <li className="flex">
      <div
        className="max-w-[90%] rounded-2xl rounded-tl-md px-4 py-3"
        style={{
          background: N.inset,
          color: N.ink,
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-1.5 inline-flex items-center gap-1.5"
          style={{ color: N.coral }}
        >
          <Sparkles size={11} /> PN Coach
        </p>
        <p
          className="leading-relaxed whitespace-pre-wrap"
          style={{
            fontFamily: BODY_FONT,
            fontSize: '0.9375rem',
            color: N.ink,
          }}
        >
          {msg.content}
        </p>
      </div>
    </li>
  );
}

function ThinkingBubble() {
  return (
    <li className="flex">
      <div
        className="max-w-[60%] rounded-2xl rounded-tl-md px-4 py-2.5 text-sm"
        style={{
          background: N.inset,
          color: N.mute,
        }}
      >
        Thinking…
      </div>
    </li>
  );
}
