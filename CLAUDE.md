# Trainer Pro — Context for Claude

## What this is

A web app for personal trainers to manage their training business: clients, sessions, payments, workout plans, progress, and (Phase 4) a client portal. Single-tenant per deploy — each trainer gets their own Supabase + Vercel + Render setup.

This is a **separate, new project** from the user's other app (an exercise-group payment tracker for their mom's gym, which is a single-file HTML app at `C:/Users/chaya/Downloads/index.html`). Don't conflate them. This one is "real" — proper React frontend, proper Python backend, real auth, real database.

## Where things live

```
C:/Users/chaya/Downloads/trainer-pro/
├── frontend/    React 19 + Vite + TS + Tailwind v4 + TanStack Query + react-router v7
├── backend/     Python 3.12 + FastAPI + Supabase + ReportLab + Anthropic + Twilio
├── supabase/    SQL schema (run once in Supabase SQL editor)
└── README.md    Full setup + deploy instructions
```

## Architectural rules

- **CRUD goes frontend → Supabase directly.** No backend hop for "list clients", "insert payment", etc. RLS handles auth.
- **Python backend is for the smart stuff:** PDF reports, AI workout generation, SMS, scheduled jobs, complex analytics. Don't recreate Supabase CRUD as Python endpoints — that just adds latency.
- **Frontend talks to backend via JWT bearer tokens** from Supabase auth. `app/auth.py` verifies them.
- **Server-side Supabase clients use the SERVICE ROLE key**, which bypasses RLS. ALWAYS scope queries by `trainer_id = current_user.user_id`. The user-scoped client (`supabase_user(jwt)`) is preferred when possible.
- **Single file in `supabase/01_schema.sql` is the source of truth for the database.** Idempotent. Run as a whole on schema changes.

## User preferences (carried over from the prior project)

- **Plain English, not jargon.** "Cloud sync is a backup that follows you between devices" beats "PostgreSQL replication via PostgREST".
- **Diagnose before changing code.** When a bug is reported: read the actual code, trace it, identify root cause, then fix. Don't guess. If unsure, ask for one piece of diagnostic info (console output, repro steps).
- **Tables, comparison summaries land well.** Markdown tables for choices/trade-offs.
- **No shortcuts.** User said this directly for this project: "make it the best app, no shortcuts."

## Constraints in the user's environment

- **Node.js v24.15.0 (LTS) is installed via winget — as a portable package, not a system installer.** Lives at `C:\Users\chaya\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.15.0-win-x64`. That folder IS in the user PATH, so any freshly-opened terminal sees `npm` and `node` fine. But if a process inherits PATH from before the winget install completed, prepend the folder: `$env:Path = "<that folder>;$env:Path"`. (An earlier session assumed npm.org was blocked by a content filter — that was wrong. Real issue was just process-PATH inheritance. `npm install` works.)
- **Python 3.12 + 3.14 are installed.** Use `py -3.12` if version matters.
- **PowerShell ExecutionPolicy was set to RemoteSigned** so `npm` works.

## Phase plan

| Phase | Status | What |
|---|---|---|
| 1 | ✅ Scaffold complete | Auth, Clients, ClientDetail (sessions/payments inline), Sessions, Payments, Settings, Dashboard. Backend has health, reports (PDF), AI workouts, reminders, analytics. |
| 2 | Next | Build calendar UI on Sessions page. Wire up actual SMS sending. Add Render cron for daily reminders. Add email transactional sending (Resend or Postmark). |
| 3 | After | Workout plan builder UI + logger flow during sessions. Progress entries with photo upload to Supabase Storage. Recharts dashboards. |
| 4 | Last | Client-side auth (clients sign up via invite link from trainer). Client portal (limited UI showing only their data). Trainer ↔ client messaging via Supabase Realtime. |

## When the user says "go work" or "do it"

They mean: pick the right approach, explain trade-offs briefly, then execute. Don't over-ask. They've explicitly said "you decide, do it" — but DO surface meaningful decisions (architecture changes, scope changes, anything that costs money). Use TodoWrite to track multi-step work.
