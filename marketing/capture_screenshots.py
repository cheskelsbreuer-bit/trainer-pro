"""Capture screenshots of Trainer Pro pages for the pitch PDF.

Uses Playwright (headless Chromium). Signs in as the demo-preview trainer
(populated earlier) so the back-office screenshots show real data.

Run from anywhere — paths are absolute:
    .\\backend\\venv\\Scripts\\python.exe .\\marketing\\capture_screenshots.py
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

# Ensure SSL works on filtered networks (proxy CA via OS trust store)
try:
    import truststore  # type: ignore[import-not-found]
    truststore.inject_into_ssl()
except Exception:  # pragma: no cover
    pass

import requests
from playwright.sync_api import sync_playwright

# ----------------------------------------------------------------------------
HERE = Path(__file__).resolve().parent
OUT = HERE / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

# Pulled from frontend/.env.local — same values the React app uses
SUPABASE_URL = "https://pydvcnybqlnpwgehnmwx.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "InB5ZHZjbnlicWxucHdnZWhubXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc2NTgs"
    "ImV4cCI6MjA5MzYwMzY1OH0.HnkFTBnq-KNLDmLtjQJ9xXVjqEUl8ZFqP7AdystrKEI"
)

# The trainer we populated earlier (Studio One Fitness, slug=demo-preview).
# Same email pattern we used during preview testing.
DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "phase3+1778128810548@trainerpro.demo")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "verify123!")

FRONTEND = "http://localhost:5173"


def get_session_via_rest() -> dict[str, str]:
    """Sign in via Supabase auth REST API; returns the session payload."""
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    r = requests.post(
        url,
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        },
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=15,
    )
    if r.status_code != 200:
        raise SystemExit(
            f"Login failed ({r.status_code}): {r.text}\n"
            f"Set DEMO_EMAIL / DEMO_PASSWORD env vars to a valid test user."
        )
    return r.json()


def supabase_storage_key() -> str:
    """Mirror what supabase-js stores in localStorage."""
    project_ref = SUPABASE_URL.split("//")[1].split(".")[0]
    return f"sb-{project_ref}-auth-token"


SHOTS = [
    # (path on site, output filename, scroll-to-bottom?, full-page?)
    ("/p/demo-preview", "01-public-profile-hero.png", False, False),
    ("/p/demo-preview", "02-public-profile-full.png", False, True),
    ("/book/demo-preview", "03-booking-page.png", False, False),
    ("/", "04-dashboard.png", False, False),
    ("/sessions", "05-calendar.png", False, False),
    ("/clients", "06-clients-list.png", False, False),
    ("/workouts", "07-workouts.png", False, False),
    ("/progress", "08-progress.png", False, False),
    ("/settings", "09-settings.png", False, False),
]


def main() -> None:
    print("Authenticating…")
    session = get_session_via_rest()
    auth_payload = {
        "access_token": session["access_token"],
        "refresh_token": session["refresh_token"],
        "expires_in": session.get("expires_in", 3600),
        "expires_at": int(time.time()) + session.get("expires_in", 3600),
        "token_type": "bearer",
        "user": session.get("user"),
    }
    storage_key = supabase_storage_key()
    print(f"Logged in as {session.get('user', {}).get('email')}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,  # crisp screenshots for the PDF
        )
        page = ctx.new_page()

        # Seed localStorage with the auth session BEFORE the app loads
        page.goto(f"{FRONTEND}/", wait_until="domcontentloaded")
        page.evaluate(
            "([k, v]) => localStorage.setItem(k, JSON.stringify(v))",
            [storage_key, auth_payload],
        )

        for path, fname, scroll_bottom, full_page in SHOTS:
            url = FRONTEND + path
            print(f"  -> {url}")
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
            except Exception as e:
                print(f"     ! navigation error: {e}")
                continue
            # Give React + remote images time to settle
            try:
                page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass
            page.wait_for_timeout(800)
            if scroll_bottom:
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                page.wait_for_timeout(500)
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(300)
            out_path = OUT / fname
            page.screenshot(path=str(out_path), full_page=full_page)
            print(f"     wrote {out_path.relative_to(HERE)}")
        browser.close()
    print(f"\nDone. {len(SHOTS)} screenshots in {OUT}")


if __name__ == "__main__":
    main()
