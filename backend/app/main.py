"""Trainer Pro — Python backend (FastAPI).

Run locally:
    uvicorn app.main:app --reload --port 8000

The frontend talks to this server for "smart" features (PDF reports, AI workout
generation, SMS reminders, analytics). Plain CRUD goes directly from the
frontend to Supabase — no need for a backend round trip.
"""

# Use the OS-native certificate store for SSL verification. Necessary on
# networks behind TLS-intercepting proxies (corporate filters, school
# networks, etc.) where the OS trusts a private CA but Python's bundled
# certifi roots don't include it. Affects every later HTTPS call (httpx,
# requests, urllib).
import truststore
truststore.inject_into_ssl()

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import Response

from .config import settings
from .routers import admin, analytics, auto_billing, family_portal, health, reminders, reports, stripe_checkout, workouts_ai


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup checks — print missing config so failures are obvious in logs.
    if not settings.SUPABASE_URL:
        print("[WARN] SUPABASE_URL is empty. Set it in .env or environment.")
    if not settings.SUPABASE_JWT_SECRET:
        print("[WARN] SUPABASE_JWT_SECRET is empty. Authenticated endpoints will fail.")
    yield


app = FastAPI(
    title="Trainer Pro API",
    description="Backend for Trainer Pro — handles AI, reports, reminders, and analytics.",
    version="0.1.0",
    lifespan=lifespan,
)

# Hand-rolled CORS. We previously used Starlette's CORSMiddleware but
# requests from app.trainerpro.coach kept getting CORS-rejected in the
# browser — the responses landed without the Access-Control-Allow-Origin
# header for reasons we couldn't pin down (possibly Render's proxy
# stripping them, possibly a Starlette+Render edge-case). This middleware
# is dead simple: every response gets the wildcard origin, every OPTIONS
# preflight gets short-circuited with a 204. We also stamp a marker
# header so we can verify from DevTools that this code is actually running.
_CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "*",
    "Access-Control-Max-Age": "600",
    "X-Cors-Source": "manual-v3",
}


@app.middleware("http")
async def cors_middleware(request, call_next):
    if request.method == "OPTIONS":
        return Response(status_code=204, headers=_CORS_HEADERS)
    try:
        response = await call_next(request)
    except Exception as exc:  # noqa: BLE001 — last-resort CORS on crash
        # Even if a route crashes, return a CORS-headered 500 so the
        # frontend sees a real error instead of an opaque CORS rejection.
        return Response(
            content=f'{{"detail":"Internal error: {type(exc).__name__}"}}',
            status_code=500,
            media_type="application/json",
            headers=_CORS_HEADERS,
        )
    for key, value in _CORS_HEADERS.items():
        response.headers[key] = value
    return response

app.include_router(health.router)
app.include_router(reports.router)
app.include_router(workouts_ai.router)
app.include_router(reminders.router)
app.include_router(analytics.router)
app.include_router(stripe_checkout.router)
app.include_router(admin.router)
app.include_router(family_portal.router)
app.include_router(auto_billing.router)


@app.get("/")
def root() -> dict:
    return {"service": "trainer-pro-api", "docs": "/docs"}
