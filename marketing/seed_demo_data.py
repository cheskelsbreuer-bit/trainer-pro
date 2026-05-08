"""Populate the demo-preview trainer with realistic clients, sessions, payments,
and progress entries so the back-office screenshots show real data instead of
empty states. Idempotent — safe to re-run.
"""

from __future__ import annotations

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

try:
    import truststore
    truststore.inject_into_ssl()
except Exception:
    pass

import requests

SUPABASE_URL = "https://pydvcnybqlnpwgehnmwx.supabase.co"

# Read service role key from backend/.env
ENV = Path(__file__).resolve().parent.parent / "backend" / ".env"
service_key = None
for line in ENV.read_text().splitlines():
    if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
        service_key = line.split("=", 1)[1].strip()
        break
if not service_key:
    sys.exit("SUPABASE_SERVICE_ROLE_KEY not found in backend/.env")

# Find demo-preview trainer
H = {
    "apikey": service_key,
    "Authorization": f"Bearer {service_key}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

r = requests.get(
    f"{SUPABASE_URL}/rest/v1/trainers?slug=eq.demo-preview&select=id,full_name",
    headers=H,
    timeout=10,
)
r.raise_for_status()
rows = r.json()
if not rows:
    sys.exit("No trainer with slug=demo-preview")
TRAINER_ID = rows[0]["id"]
print(f"Trainer: {rows[0]['full_name']} ({TRAINER_ID})")

# Wipe any prior demo rows for this trainer (identified by email pattern)
requests.delete(
    f"{SUPABASE_URL}/rest/v1/clients?trainer_id=eq.{TRAINER_ID}&email=like.*@studioone.demo",
    headers=H,
    timeout=10,
)

# Clients
TODAY = datetime.now().date()

CLIENTS = [
    ("Sarah Mitchell", "sarah@studioone.demo", "Train for first marathon — October 2026", 95, 8, ["morning", "marathon-prep"]),
    ("Marcus Chen", "marcus@studioone.demo", "Squat 405, deadlift 500, bench 315 by EOY", 110, 4, ["evening", "strength"]),
    ("Priya Patel", "priya@studioone.demo", "Lose 25 lbs and run a 5K under 30 minutes", 80, 0, ["weight-loss", "high-priority"]),
    ("James O'Connor", "james@studioone.demo", "Stay healthy, manage back pain, build core", 90, 12, ["lunch", "post-rehab"]),
    ("Lisa Wang", "lisa@studioone.demo", "Recover from ACL repair, return to volleyball", 100, 5, ["morning", "post-rehab"]),
    ("David Thompson", "david@studioone.demo", "Compete in masters powerlifting — meet in August", 120, 10, ["weekend", "strength"]),
]

client_payload = []
for name, email, goals, rate, balance, tags in CLIENTS:
    client_payload.append({
        "trainer_id": TRAINER_ID,
        "full_name": name,
        "email": email,
        "phone": "555-0100",
        "goals": goals,
        "rate_per_session": rate,
        "package_balance": balance,
        "status": "active",
        "tags": tags,
    })

r = requests.post(
    f"{SUPABASE_URL}/rest/v1/clients",
    headers=H,
    data=json.dumps(client_payload),
    timeout=15,
)
print(f"clients POST status={r.status_code} body[:300]={r.text[:300]!r}")
if r.status_code >= 300:
    sys.exit(1)
try:
    clients = r.json()
except Exception:
    sys.exit("body wasn't JSON")
client_by_email = {c["email"]: c["id"] for c in clients}
print(f"Inserted {len(clients)} clients")

# Sessions — past 2 weeks (mostly completed, one cancelled, one no-show) + next 2 weeks
def at(day_offset: int, hour: int, minute: int = 0) -> str:
    d = datetime.combine(TODAY + timedelta(days=day_offset), datetime.min.time())
    return d.replace(hour=hour, minute=minute).isoformat()


SESSIONS = [
    # PAST
    ("sarah@studioone.demo",  -15,  6, "completed", "5-mile tempo run", 95),
    ("sarah@studioone.demo",  -13,  6, "completed", "Strength + hip mobility", 95),
    ("sarah@studioone.demo",  -11,  6, "completed", "Hill repeats", 95),
    ("sarah@studioone.demo",   -8,  6, "completed", "Lower body strength", 95),
    ("sarah@studioone.demo",   -6,  6, "completed", "8-mile long run", 95),
    ("sarah@studioone.demo",   -4,  6, "completed", "Recovery + foam rolling", 95),
    ("marcus@studioone.demo", -14, 18, "cancelled", "Cancelled — work conflict", None),
    ("marcus@studioone.demo", -12, 18, "completed", "Squat 365x3", 110),
    ("marcus@studioone.demo",  -7, 18, "completed", "Deadlift 455x1 PR", 110),
    ("marcus@studioone.demo",  -5, 18, "completed", "Bench + accessories", 110),
    ("priya@studioone.demo",  -15, 17, "no_show",   "Followed up", None),
    ("priya@studioone.demo",  -13, 17, "completed", "Full body circuit", 80),
    ("priya@studioone.demo",   -8, 17, "completed", "Lower body + intervals", 80),
    ("priya@studioone.demo",   -6, 17, "completed", "Upper body push; weight down 1.5#", 80),
    ("james@studioone.demo",  -13, 12, "completed", "Core + RDL light", 90),
    ("james@studioone.demo",   -6, 12, "completed", "Mobility + light squats", 90),
    ("david@studioone.demo",  -10,  9, "completed", "Squat day — 405x3 working set", 120),
    ("david@studioone.demo",   -3,  9, "completed", "Deadlift day — 495x2", 120),
    ("lisa@studioone.demo",    -7,  7, "completed", "Quad strengthening; no impact", 100),
    # FUTURE
    ("sarah@studioone.demo",   0,  6, "confirmed", None, 95),
    ("sarah@studioone.demo",   2,  6, "scheduled", None, 95),
    ("sarah@studioone.demo",   7,  6, "scheduled", None, 95),
    ("sarah@studioone.demo",   9,  6, "scheduled", None, 95),
    ("marcus@studioone.demo",  0, 18, "confirmed", None, 110),
    ("marcus@studioone.demo",  2, 18, "scheduled", None, 110),
    ("marcus@studioone.demo",  7, 18, "scheduled", None, 110),
    ("priya@studioone.demo",   1, 17, "confirmed", None, 80),
    ("priya@studioone.demo",   5, 17, "scheduled", None, 80),
    ("priya@studioone.demo",   7, 17, "scheduled", None, 80),
    ("james@studioone.demo",   1, 12, "scheduled", None, 90),
    ("james@studioone.demo",   8, 12, "scheduled", None, 90),
    ("david@studioone.demo",   3,  9, "confirmed", None, 120),
    ("lisa@studioone.demo",    0,  7, "scheduled", None, 100),
]

session_payload = []
for email, day, hour, status, notes, price in SESSIONS:
    cid = client_by_email[email]
    starts = at(day, hour)
    ends = at(day, hour + 1)
    session_payload.append({
        "trainer_id": TRAINER_ID,
        "client_id": cid,
        "starts_at": starts,
        "ends_at": ends,
        "status": status,
        "session_type": "training",
        "location": "Studio",
        "notes": notes,
        "price": price,
        "paid": status == "completed",
    })

r = requests.post(
    f"{SUPABASE_URL}/rest/v1/sessions",
    headers=H,
    data=json.dumps(session_payload),
    timeout=20,
)
r.raise_for_status()
print(f"Inserted {len(r.json())} sessions")

# Payments
def days_ago(n):
    return (datetime.combine(TODAY - timedelta(days=n), datetime.min.time())).isoformat()


PAYMENTS = [
    ("sarah@studioone.demo",   95, "session", 1, "Session payment", "venmo", days_ago(13)),
    ("sarah@studioone.demo",   95, "session", 1, "Session payment", "venmo", days_ago(11)),
    ("sarah@studioone.demo",   95, "session", 1, "Session payment", "venmo", days_ago(8)),
    ("sarah@studioone.demo",   95, "session", 1, "Session payment", "venmo", days_ago(6)),
    ("marcus@studioone.demo", 440, "package", 4, "4-session package", "zelle", days_ago(18)),
    ("priya@studioone.demo",   80, "session", 1, "Session payment", "cash", days_ago(13)),
    ("priya@studioone.demo",   80, "session", 1, "Session payment", "cash", days_ago(8)),
    ("priya@studioone.demo",   80, "session", 1, "Session payment", "cash", days_ago(6)),
    ("james@studioone.demo", 1080, "package", 12, "12-session pack — back rehab", "stripe", days_ago(14)),
    ("david@studioone.demo", 1200, "package", 10, "10-session pack — meet prep", "stripe", days_ago(5)),
    ("lisa@studioone.demo",   500, "package", 5,  "5-session pack — ACL recovery", "zelle", days_ago(8)),
]
payment_payload = []
for email, amount, ptype, sessions, desc, method, paid_at in PAYMENTS:
    payment_payload.append({
        "trainer_id": TRAINER_ID,
        "client_id": client_by_email[email],
        "amount": amount,
        "payment_type": ptype,
        "sessions_covered": sessions,
        "description": desc,
        "method": method,
        "paid_at": paid_at,
    })
r = requests.post(
    f"{SUPABASE_URL}/rest/v1/payments",
    headers=H,
    data=json.dumps(payment_payload),
    timeout=15,
)
r.raise_for_status()
print(f"Inserted {len(r.json())} payments")

# Progress entries (for nice charts on Sarah + Marcus)
PROGRESS = [
    ("priya@studioone.demo", "weight",       168.5, "lbs", days_ago(25)),
    ("priya@studioone.demo", "weight",       166.2, "lbs", days_ago(18)),
    ("priya@studioone.demo", "weight",       164.8, "lbs", days_ago(11)),
    ("priya@studioone.demo", "weight",       163.4, "lbs", days_ago(4)),
    ("marcus@studioone.demo", "pr_squat",    365, "lbs", days_ago(12)),
    ("marcus@studioone.demo", "pr_deadlift", 455, "lbs", days_ago(7)),
    ("marcus@studioone.demo", "pr_bench",    285, "lbs", days_ago(20)),
    ("marcus@studioone.demo", "pr_bench",    295, "lbs", days_ago(2)),
    ("david@studioone.demo",  "pr_squat",    405, "lbs", days_ago(10)),
    ("david@studioone.demo",  "pr_deadlift", 495, "lbs", days_ago(3)),
]
progress_payload = []
for email, mtype, val, unit, when in PROGRESS:
    progress_payload.append({
        "trainer_id": TRAINER_ID,
        "client_id": client_by_email[email],
        "metric_type": mtype,
        "metric_value": val,
        "metric_unit": unit,
        "measured_at": when,
    })
r = requests.post(
    f"{SUPABASE_URL}/rest/v1/progress_entries",
    headers=H,
    data=json.dumps(progress_payload),
    timeout=15,
)
r.raise_for_status()
print(f"Inserted {len(r.json())} progress entries")

# A few workout plans assigned to clients
PLANS = [
    {
        "client_email": "sarah@studioone.demo",
        "name": "Marathon base — week 4",
        "description": "Aerobic base + strength foundation. 5x/week.",
        "exercises": [
            {"name": "Tempo Run", "sets": 1, "reps": "5 mi @ 8:30/mi", "weight": None, "rest_sec": 0, "notes": "Conversational pace"},
            {"name": "Romanian Deadlift", "sets": 3, "reps": "8-10", "weight": 95, "rest_sec": 90, "notes": "Slow eccentric"},
            {"name": "Bulgarian Split Squat", "sets": 3, "reps": "10 ea", "weight": 25, "rest_sec": 90, "notes": None},
            {"name": "Side Plank", "sets": 3, "reps": "30s ea", "weight": None, "rest_sec": 45, "notes": None},
        ],
    },
    {
        "client_email": "marcus@studioone.demo",
        "name": "Squat day — 80% week",
        "description": "Hypertrophy block, week 3.",
        "exercises": [
            {"name": "Back Squat",       "sets": 4, "reps": "5", "weight": 315, "rest_sec": 180, "notes": "@RPE 7-8"},
            {"name": "Romanian Deadlift","sets": 3, "reps": "8", "weight": 225, "rest_sec": 120, "notes": None},
            {"name": "Leg Press",        "sets": 3, "reps": "10", "weight": 360, "rest_sec": 90, "notes": None},
            {"name": "Hanging Leg Raise","sets": 3, "reps": "8-12", "weight": None, "rest_sec": 60, "notes": "Slow tempo"},
        ],
    },
]
plan_payload = []
for p in PLANS:
    plan_payload.append({
        "trainer_id": TRAINER_ID,
        "client_id": client_by_email[p["client_email"]],
        "name": p["name"],
        "description": p["description"],
        "exercises": p["exercises"],
        "is_template": False,
    })
r = requests.post(
    f"{SUPABASE_URL}/rest/v1/workout_plans",
    headers=H,
    data=json.dumps(plan_payload),
    timeout=15,
)
r.raise_for_status()
print(f"Inserted {len(r.json())} workout plans")

print("\nAll demo data seeded for demo-preview trainer.")
