# Google Calendar two-way sync — setup guide

This walks you through turning on Google Calendar sync so:

- Sessions you create in Trainer Pro automatically appear on your Google Calendar.
- Busy blocks you create in Google Calendar (haircuts, meetings, dentist) automatically block off your booking page so clients can't book over them.

**Prerequisites:** the rest of Trainer Pro must be working locally and the schema additions in `supabase/06_google_calendar.sql` must already be applied.

---

## What you're doing

You're creating a **Google Cloud project** that gives Trainer Pro permission to read and write *your* calendar (and only yours). Google calls this an "OAuth client." Free, takes about 15 minutes.

---

## Step 1 — Create the Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Top bar → project picker → **New Project**.
3. Name: `trainer-pro` (or whatever). Skip the org. Click Create.

## Step 2 — Enable the Calendar API

1. With your new project selected, go to **APIs & Services → Library**.
2. Search "Google Calendar API". Click it. Click **Enable**.

## Step 3 — Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen.**
2. User type: **External**. Click Create.
3. App name: `Trainer Pro`. User support email: your email.
4. Scopes: skip — you'll add them at the next step.
5. Test users: add your own email (and any other trainer's email if multi-user).
6. Save → return to dashboard.

## Step 4 — Create the OAuth client ID

1. **APIs & Services → Credentials → + Create credentials → OAuth client ID.**
2. Application type: **Web application**.
3. Name: `Trainer Pro Web`.
4. **Authorized JavaScript origins:** add both
   - `http://localhost:5173` (local dev)
   - `https://your-vercel-domain.vercel.app` (once deployed — add later)
5. **Authorized redirect URIs:** add both
   - `http://localhost:8000/google/oauth/callback`
   - `https://your-render-domain.onrender.com/google/oauth/callback` (once deployed)
6. Click **Create**. A modal pops up with your **Client ID** and **Client secret** — copy both.

## Step 5 — Add the scopes

Back at **OAuth consent screen → Edit App → Scopes → Add or Remove Scopes**:

- `https://www.googleapis.com/auth/calendar.events` — read + write events
- `https://www.googleapis.com/auth/calendar.readonly` — read calendar list

Save.

## Step 6 — Plug the credentials into Trainer Pro

Add these to your `backend/.env`:

```
GOOGLE_OAUTH_CLIENT_ID=<the client id from step 4>
GOOGLE_OAUTH_CLIENT_SECRET=<the client secret from step 4>
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/google/oauth/callback
```

## Step 7 — Enable in the app

1. Restart the backend (`uvicorn app.main:app --reload`).
2. Open Trainer Pro → Settings → "Google Calendar sync" card.
3. Click **Connect Google Calendar**.
4. Authorize. You'll be redirected back. The card now shows your connected calendar.

That's it.

---

## What's still TODO before this works end-to-end

This setup guide is published, but the **backend code that talks to Google has not been written yet.** It's stubbed in the schema (`google_refresh_token`, `google_calendar_id`, `google_sync_enabled` columns + `google_calendar_sync` table). To finish:

- [ ] Backend router `app/routers/google_calendar.py` with `/google/oauth/start`, `/google/oauth/callback`, `/google/calendar/list`, `/google/sync` endpoints.
- [ ] Cron job that calls `google_sync` every 15 min (Render scheduled job).
- [ ] Push: on session insert/update/delete, write to Google Calendar; record the event id in `google_calendar_sync`.
- [ ] Pull: every 15 min, read upcoming events from the chosen Google Calendar; create matching "busy" blocks in `sessions` with `status='confirmed'` and a special tag so the public booking page treats them as unavailable.

When you're ready, ping Claude and say "wire up Google Calendar" — the schema + this doc are already in place; the remaining work is well-scoped.
