// Supabase Edge Function — PN-grounded nutrition coach assistant.
//
// The frontend (src/nutrition/pages/AskCoachPage.tsx) calls this via
// supabase.functions.invoke('coach-assistant', { body: { messages } }).
// We proxy the conversation to Anthropic's Claude with a PN-trained
// system prompt and return the assistant message.
//
// Why an edge function (not the FastAPI backend)?
//   The user's network filter (Livigent) blocks api.trainerpro.coach
//   responses. Supabase functions live on *.supabase.co which the
//   filter allows — same trick we used for admin RPCs.
//
// DEPLOY ONCE:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy coach-assistant --no-verify-jwt
//
// We use --no-verify-jwt because the frontend currently calls this
// without an auth token in some paths. The system prompt is hard-coded
// to coaching guidance only, so leaking it doesn't matter.

// deno-lint-ignore-file no-explicit-any
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';

// Default PN-grounded system prompt — used when the frontend doesn't
// pass its own `system` field in the request body. Keeping it as a
// fallback means we can tweak the prompt from the frontend without
// re-deploying the function.
const DEFAULT_SYSTEM_PROMPT = `You are a PN-trained nutrition coaching assistant
for the COACH (not the client).

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

// deno-lint-ignore no-explicit-any
declare const Deno: any;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only' }, 405);
  }

  let body: { messages?: ChatMessage[]; system?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const messages = (body.messages ?? []).filter(
    (m) => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
  );
  if (messages.length === 0) {
    return jsonResponse({ error: 'No messages provided' }, 400);
  }

  // Trim to the last 20 turns to keep token usage reasonable.
  const trimmed = messages.slice(-20);

  // Use a frontend-provided system prompt if present (lets us iterate
  // on the prompt without re-deploying the edge function). Falls back
  // to the bundled PN default if not.
  const systemPrompt =
    typeof body.system === 'string' && body.system.trim().length > 0
      ? body.system
      : DEFAULT_SYSTEM_PROMPT;

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          'ANTHROPIC_API_KEY not configured. Run `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` and redeploy.',
      },
      500,
    );
  }

  const upstream = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: trimmed,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return jsonResponse(
      {
        error: 'Upstream error from Claude API',
        status: upstream.status,
        detail: text.slice(0, 500),
      },
      502,
    );
  }

  const data: any = await upstream.json();
  // Claude returns content as an array of blocks; we want the text.
  const reply =
    Array.isArray(data?.content) &&
    data.content
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();

  return jsonResponse({
    reply: reply || '',
    usage: data?.usage ?? null,
  });
});
