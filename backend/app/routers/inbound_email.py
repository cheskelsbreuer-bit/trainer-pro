"""Email replies that land back inside the app.

The loop this closes:

    sitter types in the 💡 Comment box
      → POST /reminders/comment-notify emails the builder,
        Reply-To: reply+<feedback id>@<inbound domain>
      → builder hits Reply in Gmail like a normal person
      → Resend Inbound receives it and POSTs here
      → we write it onto the feedback row as admin_reply
      → the 💡 widget in her app shows the answer with an unread dot.

Nothing here is babysitting-specific — it works for any account that
uses the comment widget.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import re
import time
import uuid as uuidlib
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request

from ..config import settings
from ..db import supabase_admin

router = APIRouter(prefix="/inbound", tags=["inbound"])

# How far out of step an inbound webhook's timestamp may be (seconds).
_TIMESTAMP_TOLERANCE = 5 * 60


def _verify_svix(body: bytes, svix_id: str, svix_timestamp: str, svix_signature: str) -> None:
    """Resend signs webhooks with Svix. Verify by hand so we don't take on
    another dependency: HMAC-SHA256 over "<id>.<timestamp>.<body>", keyed
    with the base64 part of the whsec_ secret."""
    secret = settings.INBOUND_WEBHOOK_SECRET
    if not secret:
        # Fail closed: with no secret, anyone who finds the URL could write
        # into someone's app.
        raise HTTPException(503, "Inbound replies are not switched on for this server.")
    if not (svix_id and svix_timestamp and svix_signature):
        raise HTTPException(401, "Unsigned delivery")

    try:
        ts = int(svix_timestamp)
    except ValueError:
        raise HTTPException(401, "Bad timestamp") from None
    if abs(time.time() - ts) > _TIMESTAMP_TOLERANCE:
        raise HTTPException(401, "Stale delivery")

    raw = secret.split("_", 1)[1] if secret.startswith("whsec_") else secret
    try:
        key = base64.b64decode(raw)
    except Exception:  # noqa: BLE001 — a malformed secret is a config error
        raise HTTPException(503, "Inbound webhook secret is malformed.") from None

    signed = svix_id.encode() + b"." + svix_timestamp.encode() + b"." + body
    expected = base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()

    # The header is a space-separated list of "<version>,<signature>".
    for part in svix_signature.split():
        _, _, sig = part.partition(",")
        if sig and hmac.compare_digest(sig, expected):
            return
    raise HTTPException(401, "Bad signature")


def _addresses(value: Any) -> list[str]:
    """Resend sends addresses as a string, a list, or a list of objects.
    Flatten whatever shape arrives into plain lowercase addresses."""
    out: list[str] = []
    items = value if isinstance(value, list) else [value]
    for item in items:
        if isinstance(item, dict):
            item = item.get("address") or item.get("email") or ""
        if not isinstance(item, str):
            continue
        for found in re.findall(r"[\w.+-]+@[\w.-]+", item):
            out.append(found.lower())
    return out


def _reply_token(to_addrs: list[str], subject: str) -> str | None:
    """Which comment is this a reply to? Prefer the plus-address we set as
    Reply-To; fall back to the [#code] we also stamp into the subject, for
    the mail clients that rewrite Reply-To or that the user re-forwards."""
    for addr in to_addrs:
        local = addr.split("@", 1)[0]
        if "+" in local:
            token = local.split("+", 1)[1].strip()
            if token:
                return token
    m = re.search(r"\[#([0-9a-fA-F-]{6,40})\]", subject or "")
    return m.group(1) if m else None


# Where a quoted original starts. Everything from here down is the email
# being replied to, not the reply.
_QUOTE_MARKERS = (
    re.compile(r"^\s*>"),
    re.compile(r"^\s*On .{4,120}\bwrote:\s*$", re.I),
    re.compile(r"^\s*-{2,}\s*Original Message\s*-{2,}", re.I),
    re.compile(r"^\s*_{5,}\s*$"),
    re.compile(r"^\s*From:\s.+@", re.I),
    re.compile(r"^\s*Sent from my \w+", re.I),
    re.compile(r"^\s*--\s*$"),
)


def _strip_quoted(text: str) -> str:
    lines: list[str] = []
    for line in (text or "").replace("\r\n", "\n").split("\n"):
        if any(p.match(line) for p in _QUOTE_MARKERS):
            break
        lines.append(line)
    return "\n".join(lines).strip()


def _find_feedback(sb: Any, token: str) -> dict | None:
    """A full uuid matches directly; a short code matches by prefix, which
    Postgres can't LIKE against a uuid column — so we scan the recent rows
    in Python. Comments are low-volume; 400 is plenty of history."""
    try:
        uuidlib.UUID(token)
    except ValueError:
        pass
    else:
        res = (
            sb.table("feedback")
            .select("id, trainer_id, trainer_email, message")
            .eq("id", token)
            .limit(1)
            .execute()
        )
        return (res.data or [None])[0]

    short = token.replace("-", "").lower()
    res = (
        sb.table("feedback")
        .select("id, trainer_id, trainer_email, message")
        .order("created_at", desc=True)
        .limit(400)
        .execute()
    )
    for row in res.data or []:
        if str(row.get("id", "")).replace("-", "").lower().startswith(short):
            return row
    return None


def _notify_author(row: dict, reply: str) -> None:
    """Tell the person who wrote the comment that there's an answer waiting.
    Best-effort — the reply is already saved, so a mail hiccup is harmless."""
    to = (row.get("trainer_email") or "").strip()
    if not (to and settings.RESEND_API_KEY):
        return
    import httpx

    try:
        httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to],
                "subject": "You have an answer in the app",
                "text": (
                    "You asked:\n\n"
                    f"    {(row.get('message') or '').strip()[:400]}\n\n"
                    "The answer:\n\n"
                    f"    {reply[:1500]}\n\n"
                    "It's also waiting for you in the app — tap the 💡 Comment "
                    "button in the corner.\n"
                ),
            },
            timeout=15,
        )
    except Exception:  # noqa: BLE001
        pass


@router.post("/email")
async def inbound_email(
    request: Request,
    svix_id: str = Header(default="", alias="svix-id"),
    svix_timestamp: str = Header(default="", alias="svix-timestamp"),
    svix_signature: str = Header(default="", alias="svix-signature"),
) -> dict:
    """Resend Inbound posts a received email here.

    Anything we can't act on returns 200 with a reason, so Resend stops
    retrying a delivery that will never succeed. Only a failed signature
    check is an error."""
    body = await request.body()
    _verify_svix(body, svix_id, svix_timestamp, svix_signature)

    import json

    try:
        payload = json.loads(body.decode("utf-8"))
    except Exception:  # noqa: BLE001
        return {"ok": True, "ignored": "unreadable payload"}

    data = payload.get("data") or payload
    if payload.get("type") and not str(payload["type"]).startswith("email.received"):
        return {"ok": True, "ignored": f"event {payload['type']}"}

    senders = _addresses(data.get("from"))
    to_addrs = _addresses(data.get("to")) + _addresses(data.get("cc"))
    subject = data.get("subject") or ""

    # Only the people on the admin allowlist may write into someone's app.
    admins = {e.strip().lower() for e in (settings.ADMIN_EMAILS or "").split(",") if e.strip()}
    if not admins:
        return {"ok": True, "ignored": "no admin allowlist configured"}
    if not any(s in admins for s in senders):
        return {"ok": True, "ignored": "sender is not an admin"}

    token = _reply_token(to_addrs, subject)
    if not token:
        return {"ok": True, "ignored": "no comment id on this email"}

    reply = _strip_quoted(data.get("text") or "")
    if not reply and data.get("html"):
        reply = _strip_quoted(re.sub(r"<[^>]+>", " ", data["html"]))
        reply = re.sub(r"[ \t]{2,}", " ", reply)
    if not reply:
        return {"ok": True, "ignored": "empty reply"}
    reply = reply[:5000]

    sb = supabase_admin()
    row = _find_feedback(sb, token)
    if not row:
        return {"ok": True, "ignored": f"no comment matching {token}"}

    from datetime import datetime, timezone

    sb.table("feedback").update(
        {
            "admin_reply": reply,
            "admin_replied_at": datetime.now(timezone.utc).isoformat(),
            # Clear "seen" so the sitter gets the unread dot again.
            "admin_reply_seen_at": None,
        }
    ).eq("id", row["id"]).execute()

    _notify_author(row, reply)
    return {"ok": True, "feedback_id": row["id"], "chars": len(reply)}
