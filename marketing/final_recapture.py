"""Final pass: re-capture screenshots that need a do-over.
- /progress (no id parameter — that was the bug)
- /  (dashboard recent-clients widget needs longer wait)
- a couple safety re-takes
"""
from __future__ import annotations
import os, time
from pathlib import Path
try:
    import truststore; truststore.inject_into_ssl()
except Exception: pass
import requests
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "screenshots"

SUPABASE_URL = "https://pydvcnybqlnpwgehnmwx.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6"
    "InB5ZHZjbnlicWxucHdnZWhubXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMjc2NTgs"
    "ImV4cCI6MjA5MzYwMzY1OH0.HnkFTBnq-KNLDmLtjQJ9xXVjqEUl8ZFqP7AdystrKEI"
)
DEMO_EMAIL = os.environ.get("DEMO_EMAIL", "phase3+1778128810548@trainerpro.demo")
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "verify123!")


def login() -> dict:
    r = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def capture(page, url: str, fname: str, full: bool = False, settle_ms: int = 3500):
    print(f"  -> {url}")
    page.goto(url, wait_until="domcontentloaded", timeout=20000)
    try:
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    # Wait until any "Loading…" indicator is gone
    try:
        page.wait_for_function(
            "() => !Array.from(document.querySelectorAll('*')).some(el => (el.textContent || '').trim() === 'Loading…')",
            timeout=10000,
        )
    except Exception:
        pass
    page.wait_for_timeout(settle_ms)
    if full:
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(700)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(500)
    out = OUT / fname
    page.screenshot(path=str(out), full_page=full)
    print(f"     wrote {out.name}")


def main():
    s = login()
    auth_payload = {
        "access_token": s["access_token"], "refresh_token": s["refresh_token"],
        "expires_in": s.get("expires_in", 3600),
        "expires_at": int(time.time()) + s.get("expires_in", 3600),
        "token_type": "bearer", "user": s.get("user"),
    }
    storage_key = f"sb-{SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto("http://localhost:5173/")
        page.evaluate("([k,v]) => localStorage.setItem(k, JSON.stringify(v))", [storage_key, auth_payload])
        page.goto("http://localhost:5173/", wait_until="networkidle")
        page.wait_for_timeout(1000)

        # Pre-warm the clients query so React Query has fresh data
        # before we hit /, where the recent-clients widget may otherwise
        # capture a stale-loading state.
        page.goto("http://localhost:5173/clients", wait_until="networkidle")
        page.wait_for_timeout(2500)

        # Now capture (note we use a fresh context each time would be ideal,
        # but since /clients pre-warmed React Query, the data should be ready)
        capture(page, "http://localhost:5173/", "04-dashboard.png", settle_ms=4000)
        capture(page, "http://localhost:5173/progress", "09-progress.png", settle_ms=2500)
        # Sanity re-take of clients list (it was good — but the data is fresh now)
        capture(page, "http://localhost:5173/clients", "06-clients-list.png", settle_ms=2500)

        browser.close()


if __name__ == "__main__":
    main()
