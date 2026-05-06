"""Trainer Pro — Python backend (FastAPI).

Run locally:
    uvicorn app.main:app --reload --port 8000

The frontend talks to this server for "smart" features (PDF reports, AI workout
generation, SMS reminders, analytics). Plain CRUD goes directly from the
frontend to Supabase — no need for a backend round trip.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import analytics, health, reminders, reports, workouts_ai


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(reports.router)
app.include_router(workouts_ai.router)
app.include_router(reminders.router)
app.include_router(analytics.router)


@app.get("/")
def root() -> dict:
    return {"service": "trainer-pro-api", "docs": "/docs"}
