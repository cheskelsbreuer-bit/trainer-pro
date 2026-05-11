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

router = APIRouter(prefix="/chesky", tags=["chesky"])


def _admin_emails() -> set[str]:
    return {e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()}


def _require_admin(user: CurrentUser) -> None:
    """404 (not 403) if the caller isn't an admin — hides the endpoint's existence."""
    if not user.email or user.email.lower() not in _admin_emails():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not Found")
    # Service-role key is required for /admin/* to read across tenants.
    # Without it, every endpoint here would crash with RuntimeError → 500.
    # Surface a clear message so the frontend "Couldn't load" hint is actionable.
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Admin tools unavailable: SUPABASE_SERVICE_ROLE_KEY env var is not set "
            "on the backend. Add it in Render → Environment, then redeploy.",
        )


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
    """List signed-up trainers from the trainers table directly.

    Previously joined with auth.admin.list_users() but that API is slow on
    Render's free tier — first call after an idle worker would 30-sec
    timeout, frontend showed "Failed to fetch". Trainers table has email
    in it (populated by the auth-user signup trigger), so we just read
    that and skip the auth.users round-trip entirely.
    """
    _require_admin(user)
    sb = supabase_admin()
    trainers = _safe_select_trainers(sb)

    def _to_iso(v: Any) -> str | None:
        if not v:
            return None
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)

    rows: list[TrainerRow] = [
        TrainerRow(
            id=str(t.get("id")),
            full_name=t.get("full_name"),
            business_name=t.get("business_name"),
            email=t.get("email"),
            onboarded_at=t.get("onboarded_at"),
            client_count_estimate=t.get("client_count_estimate"),
            specialties=t.get("specialties") or [],
            created_at=_to_iso(t.get("created_at")),
        )
        for t in trainers
        if t.get("id")
    ]
    rows.sort(key=lambda r: r.created_at or "", reverse=True)
    return TrainersResponse(rows=rows[:limit], total=len(rows))


# ─────────────── Trainer detail (drilldown) ───────────────


class TrainerDetail(BaseModel):
    id: str
    full_name: str | None = None
    business_name: str | None = None
    email: str | None = None
    phone: str | None = None
    timezone: str | None = None
    currency: str | None = None
    primary_color: str | None = None
    slug: str | None = None
    booking_enabled: bool = False
    onboarded_at: str | None = None
    client_count_estimate: str | None = None
    specialties: list[str] = []
    service_area: str | None = None
    directory_listed: bool = True
    created_at: str | None = None
    # Computed counts so the admin sees real activity, not just signup state.
    client_count: int = 0
    session_count: int = 0
    payment_total: float = 0.0
    last_session_at: str | None = None


@router.get("/trainers/{trainer_id}", response_model=TrainerDetail)
def trainer_detail(trainer_id: str, user: CurrentUser) -> TrainerDetail:
    _require_admin(user)
    sb = supabase_admin()
    try:
        resp = sb.table("trainers").select("*").eq("id", trainer_id).single().execute()
        t = resp.data or {}
    except Exception as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Trainer not found: {e}")

    def _safe_count(table: str) -> int:
        try:
            return (
                sb.table(table)
                .select("id", count="exact", head=True)
                .eq("trainer_id", trainer_id)
                .execute()
                .count
                or 0
            )
        except Exception:
            return 0

    payment_total = 0.0
    try:
        pay = sb.table("payments").select("amount").eq("trainer_id", trainer_id).execute()
        payment_total = sum(float(p.get("amount") or 0) for p in (pay.data or []))
    except Exception:
        pass

    last_session_at: str | None = None
    try:
        last = (
            sb.table("sessions")
            .select("starts_at")
            .eq("trainer_id", trainer_id)
            .order("starts_at", desc=True)
            .limit(1)
            .execute()
        )
        if last.data:
            last_session_at = last.data[0].get("starts_at")
    except Exception:
        pass

    return TrainerDetail(
        id=str(t.get("id") or trainer_id),
        full_name=t.get("full_name"),
        business_name=t.get("business_name"),
        email=t.get("email"),
        phone=t.get("phone"),
        timezone=t.get("timezone"),
        currency=t.get("currency"),
        primary_color=t.get("primary_color"),
        slug=t.get("slug"),
        booking_enabled=bool(t.get("booking_enabled")),
        onboarded_at=t.get("onboarded_at"),
        client_count_estimate=t.get("client_count_estimate"),
        specialties=t.get("specialties") or [],
        service_area=t.get("service_area"),
        directory_listed=bool(t.get("directory_listed", True)),
        created_at=t.get("created_at"),
        client_count=_safe_count("clients"),
        session_count=_safe_count("sessions"),
        payment_total=round(payment_total, 2),
        last_session_at=last_session_at,
    )


@router.get("/trainers/{trainer_id}/clients")
def trainer_clients(trainer_id: str, user: CurrentUser, limit: int = 100) -> dict[str, Any]:
    _require_admin(user)
    sb = supabase_admin()
    try:
        resp = (
            sb.table("clients")
            .select("id,full_name,email,phone,status,package_balance,created_at")
            .eq("trainer_id", trainer_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"rows": resp.data or [], "total": len(resp.data or [])}
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))


@router.get("/trainers/{trainer_id}/sessions")
def trainer_sessions(trainer_id: str, user: CurrentUser, limit: int = 50) -> dict[str, Any]:
    _require_admin(user)
    sb = supabase_admin()
    try:
        resp = (
            sb.table("sessions")
            .select("id,starts_at,ends_at,status,session_type,price,paid,client_id")
            .eq("trainer_id", trainer_id)
            .order("starts_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"rows": resp.data or [], "total": len(resp.data or [])}
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))


@router.get("/trainers/{trainer_id}/payments")
def trainer_payments(trainer_id: str, user: CurrentUser, limit: int = 50) -> dict[str, Any]:
    _require_admin(user)
    sb = supabase_admin()
    try:
        resp = (
            sb.table("payments")
            .select("id,amount,currency,payment_type,method,description,paid_at")
            .eq("trainer_id", trainer_id)
            .order("paid_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"rows": resp.data or [], "total": len(resp.data or [])}
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))


class TrainerPatch(BaseModel):
    directory_listed: bool | None = None
    booking_enabled: bool | None = None
    full_name: str | None = None
    business_name: str | None = None
    service_area: str | None = None


@router.patch("/trainers/{trainer_id}", response_model=TrainerDetail)
def patch_trainer(trainer_id: str, body: TrainerPatch, user: CurrentUser) -> TrainerDetail:
    """Admin can suspend/edit a trainer. Only fields explicitly set on the
    body are written — None means leave alone. Returns the fresh detail."""
    _require_admin(user)
    sb = supabase_admin()
    update: dict[str, Any] = {}
    for field, value in body.model_dump(exclude_none=True).items():
        update[field] = value
    if update:
        sb.table("trainers").update(update).eq("id", trainer_id).execute()
    return trainer_detail(trainer_id, user)


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
    admin_reply: str | None = None
    admin_replied_at: str | None = None
    admin_reply_seen_at: str | None = None


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
                admin_reply=r.get("admin_reply"),
                admin_replied_at=r.get("admin_replied_at"),
                admin_reply_seen_at=r.get("admin_reply_seen_at"),
            )
            for r in (resp.data or [])
        ]
        return FeedbackResponse(rows=rows, total=len(rows))
    except Exception as e:
        print(f"[admin] feedback select failed: {e}")
        return FeedbackResponse(rows=[], total=0)


# ─────────────── Reply to feedback ───────────────


class ReplyBody(BaseModel):
    reply: str


@router.post("/feedback/{feedback_id}/reply")
def reply_to_feedback(feedback_id: str, body: ReplyBody, user: CurrentUser) -> dict[str, Any]:
    """Write an admin reply onto a feedback row. Trainer reads it via RLS-allowed
    select on their own feedback rows. Pass an empty string to clear/un-send."""
    _require_admin(user)
    text = (body.reply or "").strip()
    sb = supabase_admin()
    if not text:
        # Clear the reply
        sb.table("feedback").update(
            {"admin_reply": None, "admin_replied_at": None, "admin_reply_seen_at": None}
        ).eq("id", feedback_id).execute()
        return {"ok": True, "cleared": True}

    if len(text) > 5000:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reply too long (max 5000 chars).")

    sb.table("feedback").update(
        {
            "admin_reply": text,
            "admin_replied_at": datetime.now(timezone.utc).isoformat(),
            # Reset the seen flag so the trainer's banner re-appears if we
            # send a follow-up reply on the same feedback row.
            "admin_reply_seen_at": None,
        }
    ).eq("id", feedback_id).execute()
    return {"ok": True}


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
