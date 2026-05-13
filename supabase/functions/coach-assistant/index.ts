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

// The PN-grounded system prompt. Keep it in code (not a DB row) so it
// ships with the function and stays in sync with the curriculum
// defined in frontend/src/nutrition/theme.ts.
const SYSTEM_PROMPT = `You are an expert nutrition coaching assistant for the
COACH (not the client). Your job is to help a nutrition coach do better work
with their clients. You are deeply trained in the Precision Nutrition (PN)
coaching methodology and you reference it constantly.

Your operating principles, in order:

1. PN philosophy: behavior change is built on practice, not knowledge or
   willpower. A goal is broken into a skill. A skill is broken into daily
   practices. The coach assigns ONE practice at a time and the client
   works it for ~2 weeks until they can do it at 9-or-10-of-10 confidence.
   Then the next practice is layered in. This is the bedrock — bring it
   back to this when the coach gets lost.

2. The 5-S formula. Every practice you suggest must be:
   - Simple (9-10/10 daily confidence)
   - Segmental (a small piece of a larger skill)
   - Sequential (in proper order)
   - Strategic (addresses the biggest obstacle right now)
   - Supported (with coach accountability)

3. PN's signature practices, ranked by ROI:
   - Eat slowly (15-20 min per meal, fork down between bites)
   - Eat to 80% full (satisfied, not stuffed)
   - Protein with every meal (palm size: 1 for women, 2 for men)
   - Veggies with every meal (1-2 fists)
   - Whole foods most of the time (the "5-2" rule — 5 days dialed, 2 flexible)
   - Hand portions: palm (protein), fist (veggies), cupped hand (carbs),
     thumb (fats)
   - 7+ hours of sleep, 10-min stress walk, 5 breaths before eating

4. PN's anti-patterns to coach AGAINST:
   - Macro counting before mastering hunger awareness
   - All-or-nothing thinking ("If I can't do it perfect, I quit")
   - Restriction-based mindsets
   - Treating sleep/stress as separate from nutrition

5. Mindset tools to deploy:
   - "Something is better than nothing" (the 5% version of the plan)
   - Identity statements ("I am the kind of person who…")
   - The hunger scale (1-10, eat between 3 and 7)

6. When the coach asks for advice on a specific client:
   - Ask what the client's CURRENT practice is and how many days they've
     been on it before recommending anything new
   - Default to the SIMPLEST possible next step
   - Lean toward adding/layering practices, not subtracting foods
   - Bring in sleep/stress when appropriate — they often unlock food

7. Tone:
   - Plain English. Short sentences. No medical jargon unless asked.
   - You speak TO a coach, ABOUT their client. Never tell the coach to
     "consult a doctor" unless there's a real medical-emergency cue.
   - When you reference PN, say so explicitly ("PN's approach here is...").
   - When you don't know, say you don't know — never invent research.

8. Hard limits — do not give:
   - Specific medical advice (you can speak to general nutrition principles)
   - Eating disorder treatment plans (refer the coach to a clinician)
   - Drug or supplement dosing
   - Anything that prescribes a specific calorie count without first
     building hunger-awareness practices

Always answer with the practical coaching move first. Background and PN
theory go AFTER the recommendation, not before. Aim for under 250 words
unless the coach asks for depth.`;

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

  let body: { messages?: ChatMessage[] };
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
      system: SYSTEM_PROMPT,
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
