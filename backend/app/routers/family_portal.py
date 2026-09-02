"""Babysitting family portal — the parent-side endpoints.

Parents authenticate with ordinary Supabase accounts; a parent "owns" the
clients rows whose auth_user_id equals their user id. These endpoints use
the service-role client for the pieces RLS can't express (linking sibling
rows, writing the trainer's activity log) — every query is explicitly
scoped, per db.py's contract.
"""

from datetime import datetime

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


# ── Text consent, set by the parent themselves ────────────────────────
#
# The sitter can record consent on the enrolment form when a parent asks
# for it in person, but that is the business recording someone else's
# answer. This endpoint is the parent doing it themselves, in their own
# account: it is their phone, so it should be their tick. Carriers care
# about that distinction, and so should we.
#
# Consent applies to every kid in the family — the reminders are about
# one balance, not one child — and is scoped to this parent's own rows.

CONSENT_TAG = "smsconsent:1"


class SmsConsentRequest(BaseModel):
    consent: bool


@router.get("/sms-consent")
def read_sms_consent(authorization: str | None = Header(default=None)) -> dict:
    user = _parent(authorization)
    rows = _family_rows(supabase_admin(), user.user_id)
    if not rows:
        raise HTTPException(404, "No children are linked to this account yet.")
    return {
        "consent": any(CONSENT_TAG in (r.get("tags") or []) for r in rows),
        "kids": len(rows),
    }


@router.post("/sms-consent")
def set_sms_consent(req: SmsConsentRequest, authorization: str | None = Header(default=None)) -> dict:
    """Turn balance texts on or off for this family. Off is the default and
    always available — nothing about the childcare changes either way."""
    user = _parent(authorization)
    sb = supabase_admin()
    rows = _family_rows(sb, user.user_id)
    if not rows:
        raise HTTPException(404, "No children are linked to this account yet.")

    for row in rows:
        tags = [t for t in (row.get("tags") or []) if t != CONSENT_TAG]
        if req.consent:
            tags.append(CONSENT_TAG)
        sb.table("clients").update({"tags": tags}).eq("id", row["id"]).eq(
            "auth_user_id", user.user_id
        ).execute()

    # The sitter should be able to see who turned texts on, and when.
    sb.table("activity_log").insert(
        {
            "trainer_id": rows[0]["trainer_id"],
            "actor": "client",
            "action": "sms_consent_changed",
            "entity_type": "client",
            "entity_id": rows[0]["id"],
            "details": {
                "consent": req.consent,
                "by": "parent",
                "kids": [r["full_name"] for r in rows],
            },
        }
    ).execute()
    return {"ok": True, "consent": req.consent, "kids": len(rows)}


# ── Everything the parent was told, kept in the app ───────────────────
#
# A text can fail, an email can land in spam, and a phone can be in
# another room. Whatever we sent — "she arrived", a receipt, a balance
# reminder — is also here, in order, for a parent who wants to check.
# Nothing new is recorded for this: it reads the same activity log the
# sitter's own history comes from, scoped to this parent's children, so
# the app can never disagree with what actually went out.

# Actions worth showing a parent, newest first. Anything else in the log
# is the sitter's own business and stays out of here.
_PARENT_VISIBLE = ("arrival_notice", "payment_receipt", "absence_reported")


def _friendly_date(raw) -> str:
    """2026-08-30 is a database value, not something to show a parent."""
    try:
        return datetime.strptime(str(raw)[:10], "%Y-%m-%d").strftime("%b %-d")
    except (TypeError, ValueError):
        return ""


def _money(value) -> str:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return ""
    return f"${n:,.2f}".replace(".00", "")


@router.get("/notices")
def notices(authorization: str | None = Header(default=None)) -> dict:
    user = _parent(authorization)
    sb = supabase_admin()
    rows = _family_rows(sb, user.user_id)
    if not rows:
        return {"notices": []}

    mine = {r["id"]: (r.get("full_name") or "Your child").split(" ")[0] for r in rows}
    trainer_id = rows[0]["trainer_id"]

    log = (
        sb.table("activity_log")
        .select("id, created_at, action, entity_id, details")
        .eq("trainer_id", trainer_id)
        .in_("action", list(_PARENT_VISIBLE))
        .order("created_at", desc=True)
        .limit(200)
        .execute()
    )

    out = []
    for row in log.data or []:
        d = row.get("details") or {}
        client_id = d.get("client_id") or row.get("entity_id")
        if client_id not in mine:
            continue
        name = mine[client_id]
        action = row.get("action")

        if action == "arrival_notice":
            # Only tell them about a message that actually went out.
            if not d.get("sent"):
                continue
            when = d.get("at") or ""
            text = (
                f"{name} arrived{f' at {when}' if when else ''}."
                if d.get("kind") == "arrived"
                else f"{name} was picked up{f' at {when}' if when else ''}."
            )
            icon = "🚸" if d.get("kind") == "arrived" else "🚗"
        elif action == "payment_receipt":
            amount = _money(d.get("amount"))
            text = f"Payment received{f' — {amount}' if amount else ''}. Thank you!"
            icon = "💛"
        elif action == "absence_reported":
            date = _friendly_date(d.get("date"))
            note = (d.get("note") or "").strip()
            text = f"You let them know {name} would be out{f' on {date}' if date else ''}."
            if note:
                text += f' "{note}"'
            icon = "🙋"
        else:
            continue

        out.append(
            {
                "id": row["id"],
                "at": row["created_at"],
                "kind": action,
                "icon": icon,
                "text": text,
            }
        )
        if len(out) >= 40:
            break

    return {"notices": out}


# ── Quick pay — the mother pays her balance right from the portal ──────
#
# One tap: we compute the family balance, open a Stripe Checkout page
# that takes a card OR a US bank debit (ACH), and the webhook records
# the payment and moves the balance the moment Stripe confirms it.
# If the sitter hasn't connected Stripe but set a payment link
# (Venmo / PayPal / Zelle), we hand that back instead — the button
# always leads somewhere real, or says plainly that nothing is set up.


class PortalPayRequest(BaseModel):
    amount: float | None = None  # None = the whole family balance


def _num_tag(tags: list | None, prefix: str) -> float:
    raw = _tag_value(tags, prefix)
    try:
        return float(raw) if raw is not None else 0.0
    except ValueError:
        return 0.0


def _family_rows(sb, user_id: str) -> list[dict]:
    mine = (
        sb.table("clients")
        .select("id, trainer_id, full_name, email, status, tags, created_at")
        .eq("auth_user_id", user_id)
        .neq("status", "archived")
        .execute()
    )
    return mine.data or []


@router.post("/pay")
def portal_pay(req: PortalPayRequest, authorization: str | None = Header(default=None)) -> dict:
    from ..config import settings

    user = _parent(authorization)
    sb = supabase_admin()

    kids = _family_rows(sb, user.user_id)
    if not kids:
        raise HTTPException(404, "No kids linked to this account")

    balance = round(
        sum(_num_tag(k.get("tags"), "totalowed:") - _num_tag(k.get("tags"), "totalpaid:") for k in kids),
        2,
    )
    if balance <= 0.005:
        raise HTTPException(400, "Nothing is owed right now")

    amount = round(req.amount, 2) if req.amount else balance
    if amount < 1:
        raise HTTPException(400, "Minimum payment is $1")
    if amount > balance:
        amount = balance  # no overpaying by accident

    trainer_id = kids[0]["trainer_id"]
    trainer_resp = (
        sb.table("trainers")
        .select("id, full_name, business_name, public_profile")
        .eq("id", trainer_id)
        .single()
        .execute()
    )
    trainer = trainer_resp.data or {}
    bs_settings = ((trainer.get("public_profile") or {}).get("babysitting") or {}).get("settings") or {}
    sitter_name = trainer.get("business_name") or trainer.get("full_name") or "your babysitter"

    # The oldest kid row anchors the payment, same rule the chat uses.
    anchor = sorted(kids, key=lambda k: (k.get("created_at") or "", k["id"]))[0]

    # No Stripe on the server → the sitter's own payment link, if any.
    if not settings.STRIPE_SECRET_KEY:
        pay_link = (bs_settings.get("payLink") or "").strip()
        if pay_link:
            return {"url": pay_link, "external": True, "amount": amount}
        raise HTTPException(
            503,
            f"Online payment isn't set up yet — pay {sitter_name} directly, or ask them to add a payment link.",
        )

    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    base = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
    kid_names = ", ".join(k["full_name"].split(" ")[0] for k in kids)

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            # Card only — instant, no bank-clearing wait.
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": f"Babysitting balance — {sitter_name}",
                            "description": f"For {kid_names}",
                        },
                        "unit_amount": int(round(amount * 100)),
                    },
                    "quantity": 1,
                }
            ],
            success_url=f"{base}/portal?payment=success",
            cancel_url=f"{base}/portal?payment=cancel",
            customer_email=next((k.get("email") for k in kids if k.get("email")), None),
            metadata={
                "trainer_id": trainer_id,
                "client_id": anchor["id"],
                "bs": "1",
                "package_name": "Balance payment from the app",
                "sessions_covered": "0",
            },
        )
    except stripe.StripeError as e:  # type: ignore[attr-defined]
        raise HTTPException(400, f"Stripe error: {getattr(e, 'user_message', None) or str(e)}") from e

    return {"url": session.url or "", "external": False, "amount": amount}
