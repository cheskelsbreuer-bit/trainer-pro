# Trainer Pro

A real, deployable web app for personal trainers — lets a trainer manage clients, schedule sessions, track payments, build workout plans, monitor progress, and (eventually) give clients their own portal.

> Single-tenant per deploy: each trainer gets their own copy of the app + their own Supabase project. No multi-tenant complexity, no shared user pool. To onboard a second trainer, you fork the repo and they create their own Supabase + Vercel + Render projects.

## Stack

| Piece | Tech |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| State / data | TanStack Query + Supabase JS client |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Python 3.12 + FastAPI |
| Database / Auth / Storage | Supabase (Postgres + Auth + Storage) |
| Frontend hosting | Vercel (free) |
| Backend hosting | Render (free tier) |

## Folder layout

```
trainer-pro/
├── frontend/           # React app (Vite)
│   ├── src/
│   │   ├── components/ # Layout, Login, modals, primitives
│   │   ├── hooks/      # useAuth
│   │   ├── lib/        # supabase client, types, formatters
│   │   ├── pages/      # Dashboard, Clients, ClientDetail, Sessions, …
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── backend/            # FastAPI app
│   ├── app/
│   │   ├── routers/    # health, reports, workouts_ai, reminders, analytics
│   │   ├── auth.py     # Supabase JWT verification
│   │   ├── config.py   # Env-driven settings
│   │   ├── db.py       # Supabase clients (admin / per-user)
│   │   └── main.py     # FastAPI entry
│   └── requirements.txt
├── supabase/
│   └── 01_schema.sql   # All tables + RLS policies + triggers
└── README.md
```

## Setup (one-time)

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, paste and run **`supabase/01_schema.sql`**.
3. In **Authentication → Providers**, enable **Email** (with or without "Confirm email").
4. (Optional) In **Storage**, create two buckets: `progress-photos` and `client-files` (private).
5. Copy from **Project Settings → API**:
   - Project URL
   - `anon` public key
   - `service_role` key (server-side only — never put this in the frontend)
   - JWT secret (Settings → API → JWT Settings)

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key
npm install
npm run dev
```

Open http://localhost:5173. Sign up — your trainer record is created automatically.

### 3. Backend

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase keys
uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs.

## Deploy (free)

### Frontend → Vercel

1. Push to GitHub.
2. Go to [vercel.com](https://vercel.com), import the repo.
3. **Root directory**: `frontend`
4. **Framework preset**: Vite (auto-detected)
5. **Environment variables**: copy from `.env.example`, fill in real values.
6. Deploy. Push to `main` → auto-redeploy.

### Backend → Render

1. [render.com](https://render.com) → New → Web Service → connect repo.
2. **Root directory**: `backend`
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. **Environment variables**: copy `.env.example` keys.
6. Deploy. Add the Render URL to your frontend's `VITE_API_URL`.

## Phases

This is built to ship and iterate.

| Phase | Status | What's in it |
|---|---|---|
| 1 | ✅ Built | Trainer auth, clients, sessions, payments, dashboard, settings |
| 2 | ⏳ Next | Calendar UI, SMS/email reminders (Twilio wired, needs scheduler) |
| 3 | 🔜 | Workout plan builder + logger, progress charts + photo upload |
| 4 | 🔜 | Client portal (clients log in, see schedule + progress + chat) |

## Architecture decisions

**Why Supabase + Python instead of just Supabase?**
The bulk of CRUD goes from the React frontend straight to Supabase — no backend hop. Row Level Security (RLS) handles authorization on every query. Python is reserved for things it's *better at* than JavaScript:

- Server-side PDF generation (ReportLab)
- AI workout generation (Claude API key stays on the server)
- SMS sending (Twilio)
- Cron-style scheduled jobs (daily reminder runs)
- Heavy analytics aggregations

This keeps the backend small and lets the frontend stay snappy.

**Why single-tenant per deploy?**
Multi-tenant is a different product (handles billing, user isolation, plan limits, customer support, etc.). For solo trainers, "your data is in your project" is simpler, more private, and lets each trainer pick their own plan/region. Each Supabase project is free up to 500MB; that's years of data for a typical trainer.

**Why React 19 + Tailwind v4?**
React Server Components weren't useful for this app (it's all interactive). Plain client-side React with TanStack Query is the simplest path. Tailwind v4 ships its own Vite plugin and is faster than v3 — no PostCSS config needed.

## Daily commands

```bash
# Frontend dev server
cd frontend && npm run dev

# Backend dev server
cd backend && uvicorn app.main:app --reload

# Type check the frontend
cd frontend && npm run typecheck

# Format Python
cd backend && python -m ruff format app/

# Push DB schema changes
# (After editing supabase/01_schema.sql, paste it into Supabase SQL editor.)
```

## License

Private. Adapt freely for your own training business.
