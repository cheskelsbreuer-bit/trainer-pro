"""Babysitting family portal — the parent-side endpoints.

Parents authenticate with ordinary Supabase accounts; a parent "owns" the
clients rows whose auth_user_id equals their user id. These endpoints use
the service-role client for the pieces RLS can't express (linking sibling
rows, writing the trainer's activity log) — every query is explicitly
scoped, per db.py's contract.
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..auth import get_current_user
from ..db import supabase_admin

router = APIRouter(prefix="/portal", tags=["family-portal"])


def _parent(authorization: str | None):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    return get_current_user(authorization)


def _tag_value(tags: list | None, prefix: str) -> str | None:
    for t in tags or []:
        if isinstance(t, str) and t.startswith(prefix):
            return t[len(prefix):]
    return None


@router.post("/link-family")
def link_family(authorization: str | None = Header(default=None)) -> dict:
    """After a parent accepts an invite for ONE kid, link the siblings too.

    Idempotent: finds every kid already linked to this parent, then links any
    other ACTIVE kid of the same trainer carrying the same family: tag.
    """
    user = _parent(authorization)
    sb = supabase_admin()

    mine = (
        sb.table("clients")
        .select("id, trainer_id, tags")
        .eq("auth_user_id", user.user_id)
        .execute()
    )
    linked = mine.data or []
    if not linked:
        return {"linked": 0, "note": "No kids linked to this account yet."}

    newly = 0
    seen_pairs = set()
    for row in linked:
        fam = _tag_value(row.get("tags"), "family:")
        if not fam:
            continue
        pair = (row["trainer_id"], fam)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        siblings = (
            sb.table("clients")
            .select("id, auth_user_id")
            .eq("trainer_id", row["trainer_id"])
            .contains("tags", [f"family:{fam}"])
            .execute()
        )
        for sib in siblings.data or []:
            if sib.get("auth_user_id") is None:
                sb.table("clients").update({"auth_user_id": user.user_id}).eq("id", sib["id"]).execute()
                newly += 1

    return {"linked": newly}


class AbsenceRequest(BaseModel):
    client_id: str
    date: str  # YYYY-MM-DD
    note: str = ""


@router.post("/report-absence")
def report_absence(req: AbsenceRequest, authorization: str | None = Header(default=None)) -> dict:
    """Parent taps "Rivky is out" — lands in the sitter's activity log,
    which her dashboard surfaces."""
    user = _parent(authorization)
    sb = supabase_admin()

    kid = (
        sb.table("clients")
        .select("id, trainer_id, full_name, auth_user_id")
        .eq("id", req.client_id)
        .single()
        .execute()
    )
    if not kid.data or kid.data.get("auth_user_id") != user.user_id:
        raise HTTPException(403, "That kid is not linked to your account.")

    note = (req.note or "").strip()[:300]
    sb.table("activity_log").insert(
        {
            "trainer_id": kid.data["trainer_id"],
            "actor": "client",
            "action": "absence_reported",
            "entity_type": "client",
            "entity_id": kid.data["id"],
            "details": {
                "kid_name": kid.data["full_name"],
                "date": req.date,
                "note": note,
            },
        }
    ).execute()
    return {"ok": True}
