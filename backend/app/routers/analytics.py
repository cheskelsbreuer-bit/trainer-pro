"""Server-side analytics endpoints.

Why Python: aggregations, trend detection, and forecasting are easy/fast in
Python. The frontend can ask "give me revenue trends" and we return clean
data ready for charting.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, Query
from pydantic import BaseModel

from ..auth import CurrentUser
from ..db import supabase_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


class RevenuePoint(BaseModel):
    period: str  # "2026-04" or "2026-W18" depending on grouping
    amount: float
    sessions: int


class RevenueResponse(BaseModel):
    granularity: str
    points: list[RevenuePoint]
    total: float
    average: float


@router.get("/revenue", response_model=RevenueResponse)
def revenue(
    user: CurrentUser,
    months: int = Query(6, ge=1, le=24),
    authorization: str = Header(...),
):
    """Monthly revenue + completed-session count for the last N months."""
    jwt = authorization.split(" ", 1)[1]
    sb = supabase_user(jwt)

    now = datetime.now(timezone.utc)
    start = (now.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=31 * (months - 1))).replace(day=1)

    pays = (
        sb.table("payments").select("amount,paid_at").gte("paid_at", start.isoformat()).execute()
    )
    sess = (
        sb.table("sessions")
        .select("starts_at,status")
        .gte("starts_at", start.isoformat())
        .eq("status", "completed")
        .execute()
    )

    buckets: dict[str, dict[str, float]] = {}
    cursor = start
    while cursor <= now:
        key = cursor.strftime("%Y-%m")
        buckets[key] = {"amount": 0.0, "sessions": 0}
        # advance to first of next month
        if cursor.month == 12:
            cursor = cursor.replace(year=cursor.year + 1, month=1)
        else:
            cursor = cursor.replace(month=cursor.month + 1)

    for p in pays.data or []:
        key = datetime.fromisoformat(p["paid_at"].replace("Z", "+00:00")).strftime("%Y-%m")
        if key in buckets:
            buckets[key]["amount"] += float(p["amount"])
    for s in sess.data or []:
        key = datetime.fromisoformat(s["starts_at"].replace("Z", "+00:00")).strftime("%Y-%m")
        if key in buckets:
            buckets[key]["sessions"] += 1

    points = [
        RevenuePoint(period=k, amount=round(v["amount"], 2), sessions=int(v["sessions"]))
        for k, v in buckets.items()
    ]
    total = sum(p.amount for p in points)
    avg = total / len(points) if points else 0.0
    return RevenueResponse(granularity="month", points=points, total=round(total, 2), average=round(avg, 2))
