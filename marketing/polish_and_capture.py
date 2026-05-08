"""Polish demo data and re-capture all screenshots in one Playwright session.

Fixes for the previous run:
  - Trainer.full_name was "Phase3 Test" (showed as eyebrow over hero) → "Alex Reed"
  - Public profile gallery had broken Unsplash IDs → curated working set
  - Backend was off, causing "Backend isn't reachable" warnings → now ON before this runs

Run from anywhere — assumes backend (8000) and frontend (5173) are up:
    .\backend\venv\Scripts\python.exe .\marketing\polish_and_capture.py
"""

from __future__ import annotations

import os
import time
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


# (path, output filename, full_page)
SHOTS = [
    ("/p/demo-preview", "01-public-profile-hero.png", False),
    ("/p/demo-preview", "02-public-profile-full.png", True),
    ("/book/demo-preview", "03-booking-page.png", False),
    ("/", "04-dashboard.png", False),
    ("/sessions", "05-calendar.png", False),
    ("/clients", "06-clients-list.png", False),
    ("/clients/__first__", "07-client-detail.png", False),
    ("/workouts", "08-workouts.png", False),
    ("/progress/__first__", "09-progress.png", False),
    ("/settings", "10-settings.png", False),
]


# Curated, reliable Unsplash URLs (chosen for proven-stable IDs)
POLISH_JS = """
async () => {
  const sb = (await import('/src/lib/supabase.ts')).supabase;
  const { data: { user } } = await sb.auth.getUser();
  const me = user.id;

  // 1) Clean trainer name + business name (no "Phase3 Test")
  await sb.from('trainers').update({
    full_name: 'Alex Reed',
    business_name: 'Studio One Fitness',
  }).eq('id', me);

  // 2) Fetch current public_profile, swap gallery to curated working URLs
  const { data: t } = await sb.from('trainers').select('public_profile').eq('id', me).single();
  const pp = t.public_profile || {};
  pp.gallery = [
    { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80&auto=format&fit=crop', caption: 'Strength session' },
    { url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=900&q=80&auto=format&fit=crop', caption: 'Studio floor' },
    { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80&auto=format&fit=crop', caption: 'Outdoor work' },
    { url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=900&q=80&auto=format&fit=crop', caption: 'Form coaching' },
    { url: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=900&q=80&auto=format&fit=crop', caption: 'Conditioning' },
    { url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=900&q=80&auto=format&fit=crop', caption: 'Mobility work' },
  ];
  // also tighten hero/about copy a touch
  pp.hero = pp.hero || {};
  pp.hero.title = 'Build your body. Transform your life.';
  pp.hero.subtitle = 'Personalized 1-on-1 training designed around your goals, your schedule, and your body. No group classes, no judgment, no shortcuts.';
  pp.hero.photo_url = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80&auto=format&fit=crop';
  pp.hero.cta_text = 'Book a free consultation';

  await sb.from('trainers').update({ public_profile: pp }).eq('id', me);

  // 3) Verify clients are still active and seeded
  const { data: clients, count } = await sb.from('clients')
    .select('id,full_name,status', { count: 'exact' })
    .eq('trainer_id', me);

  return { ok: true, trainer: 'Alex Reed', clients: count, sample: clients?.slice(0, 3) };
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

        # Reload so JS auth state hydrates
        page.goto(f"{FRONTEND}/", wait_until="networkidle")
        page.wait_for_timeout(800)

        print("Polishing demo data…")
        try:
            result = page.evaluate(POLISH_JS)
            print(f"  -> {result}")
        except Exception as e:
            print(f"  ! polish failed: {e}")
            browser.close()
            return

        # Resolve first client id for the client detail / progress screenshots
        first_client_id = page.evaluate("""async () => {
            const sb = (await import('/src/lib/supabase.ts')).supabase;
            const me = (await sb.auth.getUser()).data.user.id;
            // Pick David Thompson if available — has full payment + workout
            const { data } = await sb.from('clients')
              .select('id,full_name')
              .eq('trainer_id', me)
              .order('full_name');
            const david = data?.find(c => c.full_name === 'David Thompson');
            return david?.id || data?.[0]?.id;
        }""")
        print(f"Selected client for detail/progress: {first_client_id}")

        for path, fname, full_page in SHOTS:
            url_path = path.replace("__first__", first_client_id or "")
            url = FRONTEND + url_path
            print(f"  -> {url}")
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                try:
                    page.wait_for_load_state("networkidle", timeout=12000)
                except Exception:
                    pass
                # Extra time for images, charts, transitions
                page.wait_for_timeout(2000)
                if full_page:
                    # Trigger lazy images by scrolling, then back to top
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    page.wait_for_timeout(800)
                    page.evaluate("window.scrollTo(0, 0)")
                    page.wait_for_timeout(500)
                out_path = OUT / fname
                page.screenshot(path=str(out_path), full_page=full_page)
                print(f"     wrote {out_path.relative_to(HERE)}")
            except Exception as e:
                print(f"     ! error: {e}")

        browser.close()
    print(f"\nDone. Screenshots in {OUT}")


if __name__ == "__main__":
    main()
