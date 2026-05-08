"""Seed demo data + capture screenshots in one Playwright session.

The user's network filter blocks direct Python POSTs to Supabase. Routing
through Playwright's Chromium (same network path the regular browser uses)
works fine — supabase-js inside the page handles writes successfully.
"""

from __future__ import annotations

import json
import os
import time
from datetime import date, datetime, timedelta
from pathlib import Path

try:
    import truststore
    truststore.inject_into_ssl()
except Exception:
    pass

import requests
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = "https://pydvcnybqlnpwgehnmwx.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "InB5ZHZjbnlicWxucHdnZWhubXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc2NTgs"
    "ImV4cCI6MjA5MzYwMzY1OH0.HnkFTBnq-KNLDmLtjQJ9xXVjqEUl8ZFqP7AdystrKEI"
)
DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "phase3+1778128810548@trainerpro.demo")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "verify123!")
FRONTEND = "http://localhost:5173"


def login() -> dict:
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    r = requests.post(
        url,
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


SHOTS = [
    ("/p/demo-preview", "01-public-profile-hero.png", False),
    ("/p/demo-preview", "02-public-profile-full.png", True),
    ("/book/demo-preview", "03-booking-page.png", False),
    ("/", "04-dashboard.png", False),
    ("/sessions", "05-calendar.png", False),
    ("/clients", "06-clients-list.png", False),
    ("/clients/__first__", "07-client-detail.png", False),  # placeholder, resolved later
    ("/workouts", "08-workouts.png", False),
    ("/progress", "09-progress.png", False),
    ("/settings", "10-settings.png", False),
]


SEED_JS = """
async () => {
  const sb = (await import('/src/lib/supabase.ts')).supabase;
  const me = (await sb.auth.getUser()).data.user.id;

  // Wipe prior demo rows we might have inserted before
  await sb.from('clients').delete().like('email', '%@studioone.demo').eq('trainer_id', me);

  const today = new Date(); today.setHours(0,0,0,0);
  const at = (dayOff, h, m=0) => {
    const d = new Date(today); d.setDate(d.getDate()+dayOff); d.setHours(h, m, 0, 0); return d.toISOString();
  };
  const days_ago = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return d.toISOString(); };

  const clients = [
    { trainer_id: me, full_name: 'Sarah Mitchell',  email: 'sarah@studioone.demo',  phone: '555-0101', goals: 'Train for first marathon — October 2026',         medical_notes: null,                                                              rate_per_session: 95,  package_balance: 8,  status: 'active', tags: ['morning','marathon-prep'] },
    { trainer_id: me, full_name: 'Marcus Chen',     email: 'marcus@studioone.demo', phone: '555-0102', goals: 'Squat 405, deadlift 500, bench 315 by EOY',        medical_notes: 'Mild left shoulder impingement — avoid overhead press above 135 lbs', rate_per_session: 110, package_balance: 4, status: 'active', tags: ['evening','strength'] },
    { trainer_id: me, full_name: 'Priya Patel',     email: 'priya@studioone.demo',  phone: '555-0103', goals: 'Lose 25 lbs and run a 5K under 30 minutes',        medical_notes: null,                                                              rate_per_session: 80,  package_balance: 0,  status: 'active', tags: ['weight-loss','high-priority'] },
    { trainer_id: me, full_name: "James O'Connor",  email: 'james@studioone.demo',  phone: '555-0104', goals: 'Stay healthy, manage back pain, build core',      medical_notes: 'L4-L5 disc bulge. Cleared for lifting under 60% 1RM.',         rate_per_session: 90,  package_balance: 12, status: 'active', tags: ['lunch','post-rehab'] },
    { trainer_id: me, full_name: 'Lisa Wang',       email: 'lisa@studioone.demo',   phone: '555-0107', goals: 'Recover from ACL repair, return to volleyball',   medical_notes: 'ACL reconstructed Feb 2026. Cleared by PT for resistance training.', rate_per_session: 100, package_balance: 5, status: 'active', tags: ['morning','post-rehab','new-client'] },
    { trainer_id: me, full_name: 'David Thompson',  email: 'david@studioone.demo',  phone: '555-0106', goals: 'Compete in masters powerlifting — meet in August', medical_notes: null,                                                              rate_per_session: 120, package_balance: 10, status: 'active', tags: ['weekend','strength'] },
  ];

  const { data: insertedClients, error: ec } = await sb.from('clients').insert(clients).select('id,email');
  if (ec) throw new Error('clients: '+ec.message);
  const byEmail = Object.fromEntries(insertedClients.map(c => [c.email, c.id]));

  const sessions = [
    // past
    [byEmail['sarah@studioone.demo'],  -15,  6, 'completed', '5-mile tempo run',                95],
    [byEmail['sarah@studioone.demo'],  -13,  6, 'completed', 'Strength + hip mobility',         95],
    [byEmail['sarah@studioone.demo'],  -11,  6, 'completed', 'Hill repeats',                    95],
    [byEmail['sarah@studioone.demo'],   -8,  6, 'completed', 'Lower body strength',             95],
    [byEmail['sarah@studioone.demo'],   -6,  6, 'completed', '8-mile long run',                 95],
    [byEmail['sarah@studioone.demo'],   -4,  6, 'completed', 'Recovery + foam rolling',         95],
    [byEmail['marcus@studioone.demo'], -14, 18, 'cancelled', 'Cancelled — work conflict',       null],
    [byEmail['marcus@studioone.demo'], -12, 18, 'completed', 'Squat 365x3',                     110],
    [byEmail['marcus@studioone.demo'],  -7, 18, 'completed', 'Deadlift 455x1 PR',               110],
    [byEmail['marcus@studioone.demo'],  -5, 18, 'completed', 'Bench + accessories',             110],
    [byEmail['priya@studioone.demo'],  -15, 17, 'no_show',   'Followed up. Coming back strong.', null],
    [byEmail['priya@studioone.demo'],  -13, 17, 'completed', 'Full body circuit',               80],
    [byEmail['priya@studioone.demo'],   -8, 17, 'completed', 'Lower body + intervals',          80],
    [byEmail['priya@studioone.demo'],   -6, 17, 'completed', 'Upper body push; weight down',    80],
    [byEmail['james@studioone.demo'],  -13, 12, 'completed', 'Core + RDL light',                90],
    [byEmail['james@studioone.demo'],   -6, 12, 'completed', 'Mobility + light squats',         90],
    [byEmail['david@studioone.demo'],  -10,  9, 'completed', 'Squat day — 405x3 working set',  120],
    [byEmail['david@studioone.demo'],   -3,  9, 'completed', 'Deadlift day — 495x2',           120],
    [byEmail['lisa@studioone.demo'],    -7,  7, 'completed', 'Quad strengthening; no impact',  100],
    // future
    [byEmail['sarah@studioone.demo'],   0,  6, 'confirmed', null, 95],
    [byEmail['sarah@studioone.demo'],   2,  6, 'scheduled', null, 95],
    [byEmail['sarah@studioone.demo'],   7,  6, 'scheduled', null, 95],
    [byEmail['sarah@studioone.demo'],   9,  6, 'scheduled', null, 95],
    [byEmail['marcus@studioone.demo'],  0, 18, 'confirmed', null, 110],
    [byEmail['marcus@studioone.demo'],  2, 18, 'scheduled', null, 110],
    [byEmail['marcus@studioone.demo'],  7, 18, 'scheduled', null, 110],
    [byEmail['priya@studioone.demo'],   1, 17, 'confirmed', null, 80],
    [byEmail['priya@studioone.demo'],   5, 17, 'scheduled', null, 80],
    [byEmail['priya@studioone.demo'],   7, 17, 'scheduled', null, 80],
    [byEmail['james@studioone.demo'],   1, 12, 'scheduled', null, 90],
    [byEmail['james@studioone.demo'],   8, 12, 'scheduled', null, 90],
    [byEmail['david@studioone.demo'],   3,  9, 'confirmed', null, 120],
    [byEmail['lisa@studioone.demo'],    0,  7, 'scheduled', null, 100],
  ].map(([client_id, day, hour, status, notes, price]) => ({
    trainer_id: me, client_id, starts_at: at(day, hour), ends_at: at(day, hour+1),
    status, session_type: 'training', location: 'Studio', notes, price, paid: status === 'completed'
  }));
  const { error: es } = await sb.from('sessions').insert(sessions);
  if (es) throw new Error('sessions: '+es.message);

  const payments = [
    [byEmail['sarah@studioone.demo'],   95, 'session', 1, 'Session payment',                'venmo',  days_ago(13)],
    [byEmail['sarah@studioone.demo'],   95, 'session', 1, 'Session payment',                'venmo',  days_ago(11)],
    [byEmail['sarah@studioone.demo'],   95, 'session', 1, 'Session payment',                'venmo',  days_ago(8)],
    [byEmail['sarah@studioone.demo'],   95, 'session', 1, 'Session payment',                'venmo',  days_ago(6)],
    [byEmail['marcus@studioone.demo'], 440, 'package', 4, '4-session package',              'zelle',  days_ago(18)],
    [byEmail['priya@studioone.demo'],   80, 'session', 1, 'Session payment',                'cash',   days_ago(13)],
    [byEmail['priya@studioone.demo'],   80, 'session', 1, 'Session payment',                'cash',   days_ago(8)],
    [byEmail['priya@studioone.demo'],   80, 'session', 1, 'Session payment',                'cash',   days_ago(6)],
    [byEmail['james@studioone.demo'], 1080, 'package', 12,'12-session pack — back rehab',   'stripe', days_ago(14)],
    [byEmail['david@studioone.demo'], 1200, 'package', 10,'10-session pack — meet prep',    'stripe', days_ago(5)],
    [byEmail['lisa@studioone.demo'],   500, 'package', 5, '5-session pack — ACL recovery',  'zelle',  days_ago(8)],
  ].map(([client_id, amount, payment_type, sessions_covered, description, method, paid_at]) => ({
    trainer_id: me, client_id, amount, payment_type, sessions_covered, description, method, paid_at
  }));
  const { error: ep } = await sb.from('payments').insert(payments);
  if (ep) throw new Error('payments: '+ep.message);

  const progress = [
    [byEmail['priya@studioone.demo'],  'weight',       168.5, 'lbs', days_ago(25)],
    [byEmail['priya@studioone.demo'],  'weight',       166.2, 'lbs', days_ago(18)],
    [byEmail['priya@studioone.demo'],  'weight',       164.8, 'lbs', days_ago(11)],
    [byEmail['priya@studioone.demo'],  'weight',       163.4, 'lbs', days_ago(4)],
    [byEmail['marcus@studioone.demo'], 'pr_squat',     365,   'lbs', days_ago(12)],
    [byEmail['marcus@studioone.demo'], 'pr_deadlift',  455,   'lbs', days_ago(7)],
    [byEmail['marcus@studioone.demo'], 'pr_bench',     285,   'lbs', days_ago(20)],
    [byEmail['marcus@studioone.demo'], 'pr_bench',     295,   'lbs', days_ago(2)],
    [byEmail['david@studioone.demo'],  'pr_squat',     405,   'lbs', days_ago(10)],
    [byEmail['david@studioone.demo'],  'pr_deadlift',  495,   'lbs', days_ago(3)],
  ].map(([client_id, metric_type, metric_value, metric_unit, measured_at]) => ({
    trainer_id: me, client_id, metric_type, metric_value, metric_unit, measured_at
  }));
  const { error: epr } = await sb.from('progress_entries').insert(progress);
  if (epr) throw new Error('progress: '+epr.message);

  // Workout plans assigned to two clients
  const plans = [
    {
      trainer_id: me, client_id: byEmail['sarah@studioone.demo'],
      name: 'Marathon base — week 4', description: 'Aerobic base + strength foundation. 5x/week.',
      is_template: false,
      exercises: [
        { name: 'Tempo Run',          sets: 1, reps: '5 mi @ 8:30/mi', weight: null, rest_sec: 0,   notes: 'Conversational pace' },
        { name: 'Romanian Deadlift',  sets: 3, reps: '8-10',           weight: 95,   rest_sec: 90,  notes: 'Slow eccentric' },
        { name: 'Bulgarian Split Squat', sets: 3, reps: '10 ea',       weight: 25,   rest_sec: 90,  notes: null },
        { name: 'Side Plank',         sets: 3, reps: '30s ea',         weight: null, rest_sec: 45,  notes: null },
      ],
    },
    {
      trainer_id: me, client_id: byEmail['marcus@studioone.demo'],
      name: 'Squat day — 80% week', description: 'Hypertrophy block, week 3.',
      is_template: false,
      exercises: [
        { name: 'Back Squat',        sets: 4, reps: '5',     weight: 315, rest_sec: 180, notes: '@RPE 7-8' },
        { name: 'Romanian Deadlift', sets: 3, reps: '8',     weight: 225, rest_sec: 120, notes: null },
        { name: 'Leg Press',         sets: 3, reps: '10',    weight: 360, rest_sec: 90,  notes: null },
        { name: 'Hanging Leg Raise', sets: 3, reps: '8-12',  weight: null, rest_sec: 60, notes: 'Slow tempo' },
      ],
    },
  ];
  const { error: ew } = await sb.from('workout_plans').insert(plans);
  if (ew) throw new Error('plans: '+ew.message);

  return { ok: true, clients: insertedClients.length, sessions: sessions.length, payments: payments.length, progress: progress.length, plans: plans.length };
}
"""


def main() -> None:
    print("Authenticating…")
    session = login()
    auth_payload = {
        "access_token": session["access_token"],
        "refresh_token": session["refresh_token"],
        "expires_in": session.get("expires_in", 3600),
        "expires_at": int(time.time()) + session.get("expires_in", 3600),
        "token_type": "bearer",
        "user": session.get("user"),
    }
    storage_key = f"sb-{SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token"
    print(f"Logged in as {session.get('user', {}).get('email')}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()

        page.goto(f"{FRONTEND}/", wait_until="domcontentloaded")
        page.evaluate(
            "([k, v]) => localStorage.setItem(k, JSON.stringify(v))",
            [storage_key, auth_payload],
        )

        # Reload so the JS auth state hydrates
        page.goto(f"{FRONTEND}/", wait_until="networkidle")
        page.wait_for_timeout(800)

        print("Seeding demo data via supabase-js…")
        try:
            result = page.evaluate(SEED_JS)
            print(f"  -> {result}")
        except Exception as e:
            print(f"  ! seed failed: {e}")
            browser.close()
            return

        # Find first client id for the client-detail screenshot
        first_client_id = page.evaluate("""async () => {
            const sb = (await import('/src/lib/supabase.ts')).supabase;
            const me = (await sb.auth.getUser()).data.user.id;
            const { data } = await sb.from('clients').select('id').eq('trainer_id', me).order('full_name').limit(1);
            return data?.[0]?.id;
        }""")
        print(f"First client ID for /clients/<id>: {first_client_id}")

        # Visit each shot
        for path, fname, full_page in SHOTS:
            url_path = path.replace("__first__", first_client_id or "")
            url = FRONTEND + url_path
            print(f"  -> {url}")
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                try:
                    page.wait_for_load_state("networkidle", timeout=10000)
                except Exception:
                    pass
                page.wait_for_timeout(1200)
                if full_page:
                    page.evaluate("window.scrollTo(0, 0)")
                    page.wait_for_timeout(300)
                out_path = OUT / fname
                page.screenshot(path=str(out_path), full_page=full_page)
                print(f"     wrote {out_path.relative_to(HERE)}")
            except Exception as e:
                print(f"     ! error: {e}")

        browser.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
