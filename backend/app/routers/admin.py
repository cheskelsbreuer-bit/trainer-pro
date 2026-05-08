"""Admin-only endpoints for the platform owner's back-office page.

Access is restricted to emails listed in the ADMIN_EMAILS env var
(comma-separated). Any other authed user — and any unauthed request — gets
a 404 so the existence of /admin is hidden.

Uses the SERVICE ROLE Supabase client because admin queries need to read
auth.users and cross-tenant tables (RLS doesn't apply).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from ..auth import CurrentUser
from ..config import settings
from ..db import supabase_admin

router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_emails() -> set[str]:
    return {e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()}


def _require_admin(user: CurrentUser) -> None:
    """404 (not 403) if the caller isn't an admin — hides the endpoint's existence."""
    if not user.email or user.email.lower() not in _admin_emails():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not Found")


# ─────────────── Overview ───────────────


class OverviewStats(BaseModel):
    total_trainers: int
    onboarded_trainers: int
    new_trainers_this_week: int
    new_trainers_this_month: int
    total_clients: int
    total_sessions: int
    total_payments_amount: float
    waitlist_count: int


@router.get("/overview", response_model=OverviewStats)
def overview(user: CurrentUser) -> OverviewStats:
    _require_admin(user)
    sb = supabase_admin()
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # head=True + count='exact' returns just the count, not rows
    total_trainers = (
        sb.table("trainers").select("id", count="exact", head=True).execute().count or 0
    )
    onboarded_trainers = (
        sb.table("trainers")
        .select("id", count="exact", head=True)
        .not_.is_("onboarded_at", "null")
        .execute()
        .count
        or 0
    )
    new_trainers_this_week = (
        sb.table("trainers")
        .select("id", count="exact", head=True)
        .gte("created_at", week_ago)
        .execute()
        .count
        or 0
    )
    new_trainers_this_month = (
        sb.table("trainers")
        .select("id", count="exact", head=True)
        .gte("created_at", month_ago)
        .execute()
        .count
        or 0
    )
    total_clients = (
        sb.table("clients").select("id", count="exact", head=True).execute().count or 0
    )
    total_sessions = (
        sb.table("sessions").select("id", count="exact", head=True).execute().count or 0
    )
    waitlist_count = (
        sb.table("waitlist_emails").select("id", count="exact", head=True).execute().count
        or 0
    )

    pay_resp = sb.table("payments").select("amount").execute()
    total_payments_amount = sum(float(p.get("amount") or 0) for p in (pay_resp.data or []))

    return OverviewStats(
        total_trainers=total_trainers,
        onboarded_trainers=onboarded_trainers,
        new_trainers_this_week=new_trainers_this_week,
        new_trainers_this_month=new_trainers_this_month,
        total_clients=total_clients,
        total_sessions=total_sessions,
        total_payments_amount=round(total_payments_amount, 2),
        waitlist_count=waitlist_count,
    )


# ─────────────── Trainers list ───────────────


class TrainerRow(BaseModel):
    id: str
    full_name: str | None = None
    business_name: str | None = None
    email: str | None = None
    onboarded_at: str | None = None
    client_count_estimate: str | None = None
    specialties: list[str] = []
    created_at: str | None = None


class TrainersResponse(BaseModel):
    rows: list[TrainerRow]
    total: int


@router.get("/trainers", response_model=TrainersResponse)
def list_trainers(user: CurrentUser, limit: int = 200) -> TrainersResponse:
    _require_admin(user)
    sb = supabase_admin()
    resp = (
        sb.table("trainers")
        .select(
            "id,full_name,business_name,email,onboarded_at,client_count_estimate,specialties,created_at"
        )
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows: list[TrainerRow] = []
    for r in resp.data or []:
        rows.append(
            TrainerRow(
                id=r["id"],
                full_name=r.get("full_name"),
                business_name=r.get("business_name"),
                email=r.get("email"),
                onboarded_at=r.get("onboarded_at"),
                client_count_estimate=r.get("client_count_estimate"),
                specialties=r.get("specialties") or [],
                created_at=r.get("created_at"),
            )
        )
    return TrainersResponse(rows=rows, total=len(rows))


# ─────────────── Waitlist ───────────────


class WaitlistRow(BaseModel):
    id: str
    email: str
    source: str | None = None
    created_at: str | None = None


class WaitlistResponse(BaseModel):
    rows: list[WaitlistRow]
    total: int


@router.get("/waitlist", response_model=WaitlistResponse)
def list_waitlist(user: CurrentUser, limit: int = 500) -> WaitlistResponse:
    _require_admin(user)
    sb = supabase_admin()
    resp = (
        sb.table("waitlist_emails")
        .select("id,email,source,created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = [
        WaitlistRow(
            id=r["id"],
            email=r["email"],
            source=r.get("source"),
            created_at=r.get("created_at"),
        )
        for r in (resp.data or [])
    ]
    return WaitlistResponse(rows=rows, total=len(rows))


# ─────────────── Whoami (used by frontend to show /admin only to admins) ───────────────


class AdminCheck(BaseModel):
    is_admin: bool


@router.get("/whoami", response_model=AdminCheck)
def whoami(user: CurrentUser) -> AdminCheck:
    """Lightweight check the frontend can call to decide whether to show /admin.

    Unlike the data endpoints this one returns {is_admin: false} instead of
    404 when the caller isn't an admin — the frontend needs to distinguish.
    Still requires a valid auth token to call.
    """
    is_admin = bool(user.email and user.email.lower() in _admin_emails())
    return AdminCheck(is_admin=is_admin)
