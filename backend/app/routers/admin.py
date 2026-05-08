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


def _list_auth_users(sb: Any) -> list[Any]:
    """Page through auth.admin.list_users() — Supabase paginates at 50/page."""
    out: list[Any] = []
    page = 1
    while True:
        resp = sb.auth.admin.list_users(page=page, per_page=200)
        # supabase-py returns either a list directly or an object w/ `users`
        users = resp if isinstance(resp, list) else getattr(resp, "users", [])
        if not users:
            break
        out.extend(users)
        if len(users) < 200:
            break
        page += 1
        if page > 50:  # safety stop at ~10k users
            break
    return out


def _safe_select_trainers(sb: Any) -> list[dict[str, Any]]:
    """Select trainers data, falling back if newer columns don't exist yet.

    Migrations 15/16 may not have run on every environment — we still want
    /admin to work and just show empty profile fields for unmigrated DBs.
    """
    try:
        resp = sb.table("trainers").select("*").execute()
        return resp.data or []
    except Exception as e:
        print(f"[admin] trainers select failed, returning empty: {e}")
        return []


@router.get("/overview", response_model=OverviewStats)
def overview(user: CurrentUser) -> OverviewStats:
    _require_admin(user)
    sb = supabase_admin()
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Source of truth for "users" is auth.users — works even if the trigger
    # that auto-creates trainers rows ever silently fails.
    auth_users = _list_auth_users(sb)

    def _parse_dt(s: Any) -> datetime | None:
        if not s:
            return None
        if isinstance(s, datetime):
            return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
        try:
            return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        except Exception:
            return None

    total_trainers = len(auth_users)
    new_trainers_this_week = sum(
        1 for u in auth_users if (d := _parse_dt(getattr(u, "created_at", None))) and d >= week_ago
    )
    new_trainers_this_month = sum(
        1 for u in auth_users if (d := _parse_dt(getattr(u, "created_at", None))) and d >= month_ago
    )

    # Onboarded count comes from the trainers table — fields may be missing
    # on unmigrated DBs, in which case treat everyone as not onboarded.
    trainers_rows = _safe_select_trainers(sb)
    onboarded_trainers = sum(1 for t in trainers_rows if t.get("onboarded_at"))

    def _safe_count(table: str) -> int:
        try:
            return sb.table(table).select("id", count="exact", head=True).execute().count or 0
        except Exception:
            return 0

    total_clients = _safe_count("clients")
    total_sessions = _safe_count("sessions")
    waitlist_count = _safe_count("waitlist_emails")

    try:
        pay_resp = sb.table("payments").select("amount").execute()
        total_payments_amount = sum(float(p.get("amount") or 0) for p in (pay_resp.data or []))
    except Exception:
        total_payments_amount = 0.0

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
def list_trainers(user: CurrentUser, limit: int = 500) -> TrainersResponse:
    """List EVERY signed-up user, joined with their trainer profile if any.

    auth.users is the source of truth — even if the auto-create-trainers
    trigger failed at some point, we still want to see who signed up.
    """
    _require_admin(user)
    sb = supabase_admin()

    auth_users = _list_auth_users(sb)
    trainers_by_id = {t.get("id"): t for t in _safe_select_trainers(sb)}

    def _to_iso(v: Any) -> str | None:
        if not v:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)

    rows: list[TrainerRow] = []
    for u in auth_users:
        uid = getattr(u, "id", None) or (u.get("id") if isinstance(u, dict) else None)
        if not uid:
            continue
        t = trainers_by_id.get(uid, {})
        email = (
            getattr(u, "email", None)
            or (u.get("email") if isinstance(u, dict) else None)
            or t.get("email")
        )
        created_at = (
            getattr(u, "created_at", None)
            or (u.get("created_at") if isinstance(u, dict) else None)
            or t.get("created_at")
        )
        rows.append(
            TrainerRow(
                id=str(uid),
                full_name=t.get("full_name"),
                business_name=t.get("business_name"),
                email=email,
                onboarded_at=t.get("onboarded_at"),
                client_count_estimate=t.get("client_count_estimate"),
                specialties=t.get("specialties") or [],
                created_at=_to_iso(created_at),
            )
        )

    rows.sort(key=lambda r: r.created_at or "", reverse=True)
    return TrainersResponse(rows=rows[:limit], total=len(rows))


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
    try:
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
    except Exception as e:
        # Table missing or query failed — show empty rather than 500.
        print(f"[admin] waitlist select failed: {e}")
        return WaitlistResponse(rows=[], total=0)


# ─────────────── Feedback ───────────────


class FeedbackRow(BaseModel):
    id: str
    trainer_id: str | None = None
    trainer_email: str | None = None
    category: str
    message: str
    user_agent: str | None = None
    url: str | None = None
    resolved_at: str | None = None
    created_at: str | None = None


class FeedbackResponse(BaseModel):
    rows: list[FeedbackRow]
    total: int


@router.get("/feedback", response_model=FeedbackResponse)
def list_feedback(user: CurrentUser, limit: int = 200) -> FeedbackResponse:
    _require_admin(user)
    sb = supabase_admin()
    try:
        resp = (
            sb.table("feedback")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = [
            FeedbackRow(
                id=r["id"],
                trainer_id=r.get("trainer_id"),
                trainer_email=r.get("trainer_email"),
                category=r.get("category") or "general",
                message=r.get("message") or "",
                user_agent=r.get("user_agent"),
                url=r.get("url"),
                resolved_at=r.get("resolved_at"),
                created_at=r.get("created_at"),
            )
            for r in (resp.data or [])
        ]
        return FeedbackResponse(rows=rows, total=len(rows))
    except Exception as e:
        print(f"[admin] feedback select failed: {e}")
        return FeedbackResponse(rows=[], total=0)


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
