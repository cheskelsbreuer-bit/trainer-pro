"""The public sign-up page — where a parent asks to join, and ticks the
box themselves.

This exists for two reasons, and both matter.

For a sitter: a link she can send to a parent instead of typing their
details in herself. The parent fills it in once, she approves it, done.

For the carriers: a call-to-action they can actually look at. A page that
merely *describes* consent is not enough — an A2P reviewer has to be able
to visit the exact place a person signs up and see the unticked box with
its disclosure next to it. Nothing here is behind a login, because a
reviewer cannot get past one.

Nothing this endpoint writes touches a child's record. A submission is a
REQUEST, parked in the activity log, until the sitter looks at it and
adds the child herself.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..db import supabase_admin

router = APIRouter(prefix="/public", tags=["public-join"])

# A single sitter cannot receive more than this many requests in a day.
# Enough for a busy enrolment week, low enough that the form is not worth
# a spammer's time.
DAILY_CAP = 60


def _trainer_by_code(sb, code: str) -> dict | None:
    """A code is the sitter's public slug. Ids are accepted too so a
    sitter who never set a slug still has a working link."""
    code = (code or "").strip()
    if not code or len(code) > 80:
        return None
    res = (
        sb.table("trainers")
        .select("id, full_name, business_name, slug, template_slugs")
        .eq("slug", code)
        .limit(1)
        .execute()
    )
    row = (res.data or [None])[0]
    if row is None and re.fullmatch(r"[0-9a-fA-F-]{36}", code):
        res = (
            sb.table("trainers")
            .select("id, full_name, business_name, slug, template_slugs")
            .eq("id", code)
            .limit(1)
            .execute()
        )
        row = (res.data or [None])[0]
    return row


@router.get("/join/{code}")
def who_is_this(code: str) -> dict:
    """Let the page say whose sign-up form this is. Public on purpose —
    it returns a business name and nothing else about anybody."""
    sb = supabase_admin()
    t = _trainer_by_code(sb, code)
    if not t:
        raise HTTPException(404, "We couldn't find that childcare provider.")
    return {"name": t.get("business_name") or t.get("full_name") or "Your childcare provider"}


class JoinRequest(BaseModel):
    code: str
    parent_name: str
    child_name: str
    phone: str | None = None
    email: str | None = None
    # Ticked by the parent, or not. False is a perfectly good answer and
    # the form saves either way — that is the whole point of it.
    sms_consent: bool = False
    note: str | None = None


def _clean(value: str | None, limit: int) -> str:
    return (value or "").strip()[:limit]


@router.post("/join")
def join(req: JoinRequest) -> dict:
    sb = supabase_admin()
    t = _trainer_by_code(sb, req.code)
    if not t:
        raise HTTPException(404, "We couldn't find that childcare provider.")

    parent = _clean(req.parent_name, 80)
    child = _clean(req.child_name, 80)
    if not parent or not child:
        raise HTTPException(400, "Please give your name and your child's name.")
    phone = _clean(req.phone, 40)
    email = _clean(req.email, 120)
    if not phone and not email:
        raise HTTPException(400, "Please leave a phone number or an email so they can reach you.")

    today = datetime.now(timezone.utc).date().isoformat()
    seen = (
        sb.table("activity_log")
        .select("id")
        .eq("trainer_id", t["id"])
        .eq("action", "join_request")
        .gte("created_at", f"{today}T00:00:00Z")
        .limit(DAILY_CAP + 1)
        .execute()
    )
    if len(seen.data or []) >= DAILY_CAP:
        raise HTTPException(429, "This form has had a lot of sign-ups today. Please try tomorrow.")

    sb.table("activity_log").insert(
        {
            "trainer_id": t["id"],
            "actor": "client",
            "action": "join_request",
            "entity_type": "join_request",
            "details": {
                "parent_name": parent,
                "child_name": child,
                "phone": phone or None,
                "email": email or None,
                # Exactly what they ticked, recorded as evidence of consent
                # alongside the words they were shown.
                "sms_consent": bool(req.sms_consent),
                "consent_text": (
                    "Text me balance reminders and schedule updates. Optional - you'll get the "
                    "same care either way. Msg & data rates may apply. Reply STOP to stop."
                ),
                "note": _clean(req.note, 400) or None,
                "at": datetime.now(timezone.utc).isoformat(),
            },
        }
    ).execute()

    return {"ok": True, "name": t.get("business_name") or t.get("full_name")}
