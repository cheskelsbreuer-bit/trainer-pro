"""Stripe Checkout — package purchases.

Two endpoints:
  * POST /stripe/create-checkout-session  (auth: trainer)
      Trainer initiates a purchase on behalf of one of their clients.
      Returns { url }: redirect the client browser there to pay.
  * POST /stripe/webhook  (no auth, signature-verified)
      Stripe pings this when a Checkout Session completes. We insert a
      'payments' row and bump the client's package_balance. Service-role
      DB client bypasses RLS — webhook is the source of truth for "money in."

Test cards: https://stripe.com/docs/testing — use 4242 4242 4242 4242.

Local development: webhook secrets only validate when Stripe CLI forwards
events. Run:
    stripe listen --forward-to http://localhost:8000/stripe/webhook
The CLI prints a "whsec_..." signing secret — paste into STRIPE_WEBHOOK_SECRET.
"""

from __future__ import annotations

from typing import Any

import stripe
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from ..auth import CurrentUser
from ..config import settings
from ..db import supabase_admin

router = APIRouter(prefix="/stripe", tags=["stripe"])


def _ensure_configured() -> None:
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "STRIPE_SECRET_KEY is not set in backend .env",
        )
    stripe.api_key = settings.STRIPE_SECRET_KEY


class CheckoutCreateBody(BaseModel):
    client_id: str = Field(..., description="Client UUID from public.clients")
    package_name: str = Field(..., description="e.g. '10-session package'")
    amount: float = Field(..., gt=0, description="Total price in major units (USD dollars, etc.)")
    sessions_covered: int = Field(1, ge=1, description="How many sessions this purchase grants")
    currency: str = Field("USD", description="ISO currency code")
    success_url: str | None = None
    cancel_url: str | None = None


class CheckoutCreateResponse(BaseModel):
    url: str
    session_id: str


@router.post("/create-checkout-session", response_model=CheckoutCreateResponse)
def create_checkout_session(body: CheckoutCreateBody, user: CurrentUser) -> CheckoutCreateResponse:
    _ensure_configured()

    # Verify the client belongs to the calling trainer (or their studio).
    sb = supabase_admin()
    res = (
        sb.table("clients")
        .select("id, trainer_id, full_name, email, status")
        .eq("id", body.client_id)
        .single()
        .execute()
    )
    client = getattr(res, "data", None)
    if not client:
        raise HTTPException(404, "Client not found")
    if client["trainer_id"] != user.user_id:
        # Allow studio owners to charge any client in their studio
        peer = (
            sb.table("trainers")
            .select("id, studio_id, studio_role")
            .eq("id", user.user_id)
            .single()
            .execute()
        )
        owner_data = getattr(peer, "data", None) or {}
        if owner_data.get("studio_role") != "owner" or not owner_data.get("studio_id"):
            raise HTTPException(403, "Client does not belong to you")
        # Verify the client's trainer is in the same studio
        ct = (
            sb.table("trainers")
            .select("studio_id")
            .eq("id", client["trainer_id"])
            .single()
            .execute()
        )
        if (getattr(ct, "data", None) or {}).get("studio_id") != owner_data["studio_id"]:
            raise HTTPException(403, "Client does not belong to your studio")

    base = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": body.currency.lower(),
                        "product_data": {
                            "name": body.package_name,
                            "description": f"For {client['full_name']}",
                        },
                        "unit_amount": int(round(body.amount * 100)),
                    },
                    "quantity": 1,
                }
            ],
            success_url=body.success_url
            or f"{base}/clients/{body.client_id}?payment=success&session={{CHECKOUT_SESSION_ID}}",
            cancel_url=body.cancel_url or f"{base}/clients/{body.client_id}?payment=cancel",
            customer_email=client.get("email") or None,
            metadata={
                "trainer_id": user.user_id,
                "client_id": body.client_id,
                "package_name": body.package_name,
                "sessions_covered": str(body.sessions_covered),
            },
        )
    except stripe.StripeError as e:  # type: ignore[attr-defined]
        raise HTTPException(400, f"Stripe error: {getattr(e, 'user_message', None) or str(e)}") from e

    return CheckoutCreateResponse(url=session.url or "", session_id=session.id)


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request) -> dict[str, Any]:
    """Stripe → us. Verify signature, then act on supported events.

    We DON'T require the JWT auth here — Stripe is calling us, not a user.
    Signature verification (using STRIPE_WEBHOOK_SECRET) is the trust boundary.
    """
    _ensure_configured()
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            500,
            "STRIPE_WEBHOOK_SECRET is not set. Run `stripe listen --forward-to http://localhost:8000/stripe/webhook` and paste the printed whsec_ value into backend/.env, then restart uvicorn.",
        )

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError) as e:  # type: ignore[attr-defined]
        raise HTTPException(400, f"Invalid webhook signature: {e}") from e

    event_type = event.get("type", "")

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"])
    elif event_type == "checkout.session.expired":
        # Optional: log / notify trainer that the link wasn't paid
        pass
    elif event_type == "charge.refunded":
        await _handle_refund(event["data"]["object"])

    return {"received": True, "type": event_type}


async def _handle_checkout_completed(session: dict[str, Any]) -> None:
    meta = session.get("metadata") or {}
    trainer_id = meta.get("trainer_id")
    client_id = meta.get("client_id")
    if not trainer_id or not client_id:
        # Not from our app — ignore
        return

    try:
        sessions_covered = int(meta.get("sessions_covered", 1))
    except (TypeError, ValueError):
        sessions_covered = 1
    package_name = meta.get("package_name", "Stripe purchase")
    amount_cents = session.get("amount_total") or 0
    amount = round(amount_cents / 100.0, 2)
    currency = (session.get("currency") or "usd").upper()
    payment_type = "package" if sessions_covered > 1 else "session"

    sb = supabase_admin()

    # Idempotency: if we've already inserted for this session ID, skip.
    existing = (
        sb.table("payments")
        .select("id")
        .eq("reference", session["id"])
        .limit(1)
        .execute()
    )
    if getattr(existing, "data", None):
        return

    sb.table("payments").insert(
        {
            "trainer_id": trainer_id,
            "client_id": client_id,
            "amount": amount,
            "currency": currency,
            "payment_type": payment_type,
            "sessions_covered": sessions_covered,
            "description": package_name,
            "method": "stripe",
            "reference": session["id"],
        }
    ).execute()

    # Bump the client's package_balance by the sessions purchased
    if sessions_covered > 0:
        cur = (
            sb.table("clients")
            .select("package_balance")
            .eq("id", client_id)
            .single()
            .execute()
        )
        current = (getattr(cur, "data", None) or {}).get("package_balance") or 0
        sb.table("clients").update({"package_balance": current + sessions_covered}).eq(
            "id", client_id
        ).execute()


async def _handle_refund(charge: dict[str, Any]) -> None:
    """Record a refund as a negative-amount payment row, idempotent on charge.id."""
    payment_intent = charge.get("payment_intent")
    amount_refunded_cents = charge.get("amount_refunded") or 0
    if not payment_intent or amount_refunded_cents <= 0:
        return

    sb = supabase_admin()
    # Find the original payment by metadata or reference (Stripe Checkout session
    # id is what we stored, not the charge — best-effort match)
    # If we can't find it, log and move on.
    found = (
        sb.table("payments")
        .select("id, trainer_id, client_id, sessions_covered")
        .ilike("reference", f"{payment_intent}%")
        .limit(1)
        .execute()
    )
    rows = getattr(found, "data", None) or []
    if not rows:
        return
    p = rows[0]

    # Insert a refund payment, idempotent on charge.id
    ref = f"refund:{charge.get('id')}"
    existing = sb.table("payments").select("id").eq("reference", ref).limit(1).execute()
    if getattr(existing, "data", None):
        return

    sb.table("payments").insert(
        {
            "trainer_id": p["trainer_id"],
            "client_id": p["client_id"],
            "amount": -round(amount_refunded_cents / 100.0, 2),
            "currency": (charge.get("currency") or "usd").upper(),
            "payment_type": "refund",
            "sessions_covered": -(p.get("sessions_covered") or 0),
            "description": "Refund",
            "method": "stripe",
            "reference": ref,
        }
    ).execute()


@router.get("/config")
def stripe_config(_user: CurrentUser) -> dict[str, Any]:
    """Lightweight 'is Stripe wired up?' check for the Settings page."""
    return {
        "configured": bool(settings.STRIPE_SECRET_KEY),
        "webhook_configured": bool(settings.STRIPE_WEBHOOK_SECRET),
        "test_mode": settings.STRIPE_SECRET_KEY.startswith("sk_test_") if settings.STRIPE_SECRET_KEY else None,
    }
