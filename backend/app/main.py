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
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import admin, analytics, health, reminders, reports, stripe_checkout, workouts_ai


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

# Wildcard CORS. Safe here because we don't use cookie auth — every
# authenticated request carries a Bearer JWT in the Authorization header,
# which the browser doesn't treat as a "credential" for CORS purposes.
# `allow_credentials=False` is required when using `*` for allow_origins;
# the browser would otherwise reject the response.
#
# The previous regex-based setup with allow_credentials=True was failing
# CORS preflights for app.trainerpro.coach in some cases — likely because
# the regex match was occasionally returning the wrong Vary/Origin
# combination on cached preflights. Wildcard sidesteps the whole class
# of issues.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)


# Belt-and-suspenders: a manual middleware that ALWAYS adds CORS headers,
# even on responses that bypass CORSMiddleware for whatever reason
# (validation errors, exception handlers, etc.). Some Render proxy setups
# also seem to drop CORS headers on certain non-2xx paths — this guarantees
# they're present.
@app.middleware("http")
async def force_cors_headers(request, call_next):
    if request.method == "OPTIONS":
        # Short-circuit any remaining preflight that wasn't caught above.
        from fastapi.responses import Response
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "600",
            },
        )
    response = await call_next(request)
    response.headers.setdefault("Access-Control-Allow-Origin", "*")
    response.headers.setdefault("Access-Control-Expose-Headers", "*")
    return response

app.include_router(health.router)
app.include_router(reports.router)
app.include_router(workouts_ai.router)
app.include_router(reminders.router)
app.include_router(analytics.router)
app.include_router(stripe_checkout.router)
app.include_router(admin.router)


@app.get("/")
def root() -> dict:
    return {"service": "trainer-pro-api", "docs": "/docs"}
