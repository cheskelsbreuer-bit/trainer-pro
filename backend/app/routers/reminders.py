"""Send SMS / email reminders to clients before sessions.

Why Python: Twilio's Python SDK is mature, async email is simple with httpx,
and we want this logic on the server (API keys, rate limits, audit trail).

How it's meant to be used:
- Manual trigger from the frontend (e.g., "Remind everyone now" button).
- Scheduled job (e.g., a Render cron) calling /reminders/run-daily once a day.
"""

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..auth import CurrentUser
from ..config import settings
from ..db import supabase_user

router = APIRouter(prefix="/reminders", tags=["reminders"])


class SendReminderRequest(BaseModel):
    session_id: str
    channel: Literal["sms", "email"] = "sms"
    custom_message: str | None = None


class SendReminderResponse(BaseModel):
    sent: bool
    channel: str
    detail: str | None = None


@router.post("/send", response_model=SendReminderResponse)
def send_reminder(
    req: SendReminderRequest,
    user: CurrentUser,
    authorization: str = Header(...),
) -> SendReminderResponse:
    jwt = authorization.split(" ", 1)[1]
    sb = supabase_user(jwt)

    sess = sb.table("sessions").select("*, clients(full_name, phone, email)").eq("id", req.session_id).single().execute()
    if not sess.data:
        raise HTTPException(404, "Session not found")
    s = sess.data
    client = s.get("clients") or {}

    starts_at = datetime.fromisoformat(s["starts_at"].replace("Z", "+00:00"))
    when = starts_at.strftime("%a %b %d at %-I:%M %p") if hasattr(starts_at, "strftime") else s["starts_at"]
    msg = req.custom_message or (
        f"Hi {client.get('full_name', 'there')}! Friendly reminder: training session "
        f"on {when}. Reply CANCEL if you can't make it."
    )

    if req.channel == "sms":
        if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER):
            raise HTTPException(503, "SMS not configured. Set Twilio env vars.")
        if not client.get("phone"):
            raise HTTPException(400, "Client has no phone number on file.")

        try:
            from twilio.rest import Client as TwilioClient

            tw = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            tw.messages.create(body=msg, from_=settings.TWILIO_FROM_NUMBER, to=client["phone"])
        except Exception as e:
            raise HTTPException(502, f"SMS send failed: {e}") from e

    else:
        if not settings.RESEND_API_KEY:
            raise HTTPException(503, "Email not configured. Set RESEND_API_KEY env var.")
        if not client.get("email"):
            raise HTTPException(400, "Client has no email on file.")

        import httpx

        trainer_resp = sb.table("trainers").select("full_name,business_name").eq("id", user.user_id).single().execute()
        trainer = trainer_resp.data or {}
        trainer_name = trainer.get("business_name") or trainer.get("full_name") or "Your trainer"

        subject = f"Reminder: training session {when}"
        text_body = (
            f"Hi {client.get('full_name', 'there')},\n\n"
            f"This is a friendly reminder of your training session on {when}"
            f"{' at ' + (s.get('location') or '') if s.get('location') else ''}.\n\n"
            f"See you then,\n{trainer_name}\n"
        )
        html_body = (
            f"<p>Hi {client.get('full_name', 'there')},</p>"
            f"<p>This is a friendly reminder of your training session on <strong>{when}</strong>"
            f"{' at <strong>' + (s.get('location') or '') + '</strong>' if s.get('location') else ''}.</p>"
            f"<p>See you then,<br/>{trainer_name}</p>"
        )

        try:
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [client["email"]],
                    "subject": subject,
                    "text": text_body,
                    "html": html_body,
                },
                timeout=15,
            )
            if resp.status_code >= 300:
                raise HTTPException(502, f"Email send failed: {resp.status_code} {resp.text}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Email send failed: {e}") from e

    # Mark on the session
    sb.table("sessions").update({"reminder_sent_at": datetime.now(timezone.utc).isoformat()}).eq("id", req.session_id).execute()

    return SendReminderResponse(sent=True, channel=req.channel)


def _require_cron_secret(provided: str | None) -> None:
    """Shared-secret gate for scheduled endpoints. Fails closed when unset."""
    import hmac

    if not settings.CRON_SECRET:
        raise HTTPException(503, "Scheduled sends are not configured (CRON_SECRET unset).")
    if not provided or not hmac.compare_digest(provided, settings.CRON_SECRET):
        raise HTTPException(401, "Bad cron secret")


@router.post("/run-daily")
def run_daily(x_cron_secret: str | None = Header(default=None)) -> dict:
    """Cron-friendly: count reminders for sessions in the next 24h (legacy stub).

    Now gated behind the CRON_SECRET shared secret — the old check accepted
    any Bearer token, which let anyone on the internet trigger it.
    """
    _require_cron_secret(x_cron_secret)

    from ..db import supabase_admin

    sb = supabase_admin()
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(hours=24)
    upcoming = (
        sb.table("sessions")
        .select("*, clients(full_name, phone)")
        .gte("starts_at", now.isoformat())
        .lte("starts_at", horizon.isoformat())
        .is_("reminder_sent_at", "null")
        .in_("status", ["scheduled", "confirmed"])
        .execute()
    )
    count = 0
    for s in upcoming.data or []:
        # In a real impl, we'd fan out to Twilio in batches.
        count += 1

    return {"checked": len(upcoming.data or []), "would_send": count, "note": "Wire SMS provider to actually send."}


# ═══════════════════════════════════════════════════════════════════════
# Weekly balance reminders — the Babysitting vertical's "Thursday Engine".
#
# One endpoint, two callers:
#   · The sitter's own UI (trainer JWT): practice runs and "send now",
#     always scoped to her own account.
#   · The daily GitHub-Actions cron (X-Cron-Secret): runs for every
#     babysitting account whose schedule says "today is my day".
#
# Safety, in order: practice mode default for the UI; hard per-run cap;
# min-balance floor; once-per-day dedupe via activity_log; per-family
# error isolation (one bad phone number never kills the run); every run
# logged with counts.
# ═══════════════════════════════════════════════════════════════════════

_KID_MARKER = "bs:1"
_MAX_SENDS_PER_RUN = 100
_MIN_BALANCE = 1.0


def _tag_value(tags: list | None, prefix: str) -> str | None:
    for t in tags or []:
        if isinstance(t, str) and t.startswith(prefix):
            return t[len(prefix):]
    return None


def _tag_num(tags: list | None, prefix: str) -> float:
    import math

    raw = _tag_value(tags, prefix)
    if raw is None:
        return 0.0
    try:
        v = float(raw)
        return v if math.isfinite(v) else 0.0
    except ValueError:
        return 0.0


def _kid_balance(tags: list | None) -> float:
    return round(_tag_num(tags, "totalowed:") - _tag_num(tags, "totalpaid:"), 2)


def _family_label(slug: str) -> str:
    return " ".join(p.capitalize() for p in slug.split("-") if p) + " family"


def _fill_template(
    template: str,
    parent: str,
    kid_names: list[str],
    balance: float,
    currency: str,
    pay_link: str = "",
) -> str:
    if len(kid_names) <= 1:
        kids = kid_names[0] if kid_names else "your kids"
    else:
        kids = ", ".join(kid_names[:-1]) + " and " + kid_names[-1]
    amount = f"{balance:.0f}" if balance == int(balance) else f"{balance:.2f}"
    out = (
        template.replace("{parent}", parent or "there")
        .replace("{kids}", kids)
        .replace("{currency}", currency or "$")
        .replace("{balance}", amount)
    )
    # A money message should always carry the way to pay: fill {paylink}
    # if the template mentions it, otherwise append the link (only when
    # something is actually owed).
    if "{paylink}" in out:
        out = out.replace("{paylink}", pay_link or "")
    elif pay_link and balance > 0.005:
        out = out.rstrip() + f" Pay here: {pay_link}"
    return out.strip()


def _group_families(kids: list[dict], muted: set[str]) -> list[dict]:
    """One entry per family: parent name, kid first names, contact, balance."""
    by_fam: dict[str, list[dict]] = {}
    for k in kids:
        slug = _tag_value(k.get("tags"), "family:") or f"solo-{k['id']}"
        by_fam.setdefault(slug, []).append(k)

    out = []
    for slug, members in by_fam.items():
        if slug in muted:
            continue
        balance = round(sum(_kid_balance(m.get("tags")) for m in members), 2)
        if balance < _MIN_BALANCE:
            continue
        parent = next((_tag_value(m.get("tags"), "parent:") for m in members if _tag_value(m.get("tags"), "parent:")), "")
        phone = next((m.get("phone") for m in members if m.get("phone")), None)
        email = next((m.get("email") for m in members if m.get("email")), None)
        out.append(
            {
                "family": slug,
                "label": members[0]["full_name"] if slug.startswith("solo-") else _family_label(slug),
                "parent": parent,
                "kid_names": [m["full_name"].split(" ")[0] for m in members],
                "balance": balance,
                "sms_ok": any("smsconsent:1" in (m.get("tags") or []) for m in members),
            "phone": phone,
                "email": email,
            }
        )
    out.sort(key=lambda f: -f["balance"])
    return out


def _send_email_for(trainer_name: str, bs_settings: dict, to_email: str, subject: str, body: str) -> str:
    """Send one email. Prefers the sitter's own Gmail (free, her address);
    falls back to Resend when the deploy has it configured. Returns the
    channel used. Raises on failure."""
    gmail = (bs_settings.get("gmail") or {}) if isinstance(bs_settings.get("gmail"), dict) else {}
    g_addr = (gmail.get("address") or "").strip()
    g_pass = (gmail.get("appPassword") or "").replace(" ", "").strip()

    gmail_error: str | None = None
    if g_addr and g_pass:
        import smtplib
        from email.mime.text import MIMEText
        from email.utils import formataddr

        try:
            msg = MIMEText(body, "plain", "utf-8")
            msg["Subject"] = subject
            msg["From"] = formataddr((trainer_name, g_addr))
            msg["To"] = to_email
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as smtp:
                smtp.login(g_addr, g_pass)
                smtp.sendmail(g_addr, [to_email], msg.as_string())
            return "gmail"
        except smtplib.SMTPAuthenticationError as e:
            # Wrong / revoked app password. Don't kill the run — fall
            # through to Resend if the deploy has it.
            gmail_error = f"Gmail sign-in failed ({e.smtp_code}): check the app password"
        except Exception as e:  # noqa: BLE001 — network, port blocks, etc.
            gmail_error = f"Gmail send failed: {type(e).__name__}: {e}"

    if settings.RESEND_API_KEY:
        import httpx

        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                # From: the sitter's name, our verified domain. Reply-To:
                # her own inbox (Gmail or whatever she saved), so a parent
                # hitting Reply reaches HER, not the platform.
                "from": f"{trainer_name} <{settings.RESEND_FROM_EMAIL}>"
                if "<" not in settings.RESEND_FROM_EMAIL
                else settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "text": body,
                **({"reply_to": [g_addr]} if g_addr else {}),
            },
            timeout=15,
        )
        if resp.status_code >= 300:
            raise RuntimeError(f"Resend {resp.status_code}: {resp.text[:200]}" + (f" (after {gmail_error})" if gmail_error else ""))
        return "resend (gmail failed)" if gmail_error else "resend"

    if gmail_error:
        raise RuntimeError(gmail_error)
    raise RuntimeError("No email path configured (add Gmail in Messages settings, or set RESEND_API_KEY).")


def _send_sms(to_phone: str, body: str, tw_client) -> None:
    clean = to_phone.strip()
    digits = "".join(ch for ch in clean if ch.isdigit())
    if clean.startswith("+"):
        to = "+" + digits
    elif len(digits) == 10:
        to = "+1" + digits
    else:
        to = "+" + digits
    tw_client.messages.create(body=body, from_=settings.TWILIO_FROM_NUMBER, to=to)


class WeeklyBalancesRequest(BaseModel):
    dry_run: bool = True
    force: bool = False  # ignore the once-per-day dedupe
    channels: list[Literal["sms", "email"]] | None = None  # override the saved schedule


def _run_for_trainer(sb_admin, trainer: dict, req: WeeklyBalancesRequest, triggered_by: str) -> dict:
    profile = trainer.get("public_profile") or {}
    bs = profile.get("babysitting") or {}
    bs_settings = bs.get("settings") or {}
    schedule = bs_settings.get("schedule") or {}

    currency = bs_settings.get("currency") or "$"
    pay_link = (bs_settings.get("payLink") or "").strip()
    sms_template = bs_settings.get("smsTemplate") or (
        "Hi {parent}! Friendly reminder from your babysitter: the balance for {kids} is {currency}{balance}. Thank you!"
    )
    email_subject = bs_settings.get("emailSubject") or "Your babysitting balance"
    email_template = bs_settings.get("emailTemplate") or sms_template
    muted = set(bs_settings.get("mutedFamilies") or [])
    trainer_name = trainer.get("business_name") or trainer.get("full_name") or "Your babysitter"

    if req.channels is not None:
        channels = set(req.channels)
    else:
        channels = set()
        if schedule.get("emailAuto"):
            channels.add("email")
        if schedule.get("smsAuto"):
            channels.add("sms")
    if not channels:
        channels = {"email"}

    # Once-per-day dedupe (skippable with force / always skipped in dry runs).
    already = None
    if not req.dry_run and not req.force:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        prior = (
            sb_admin.table("activity_log")
            .select("id")
            .eq("trainer_id", trainer["id"])
            .eq("action", "weekly_balance_reminders")
            .gte("created_at", today_start.isoformat())
            .limit(1)
            .execute()
        )
        already = bool(prior.data)
    if already:
        return {"trainer_id": trainer["id"], "skipped": "already sent today"}

    kids_resp = (
        sb_admin.table("clients")
        .select("id, full_name, phone, email, status, tags")
        .eq("trainer_id", trainer["id"])
        .eq("status", "active")
        .contains("tags", [_KID_MARKER])
        .execute()
    )
    families = _group_families(kids_resp.data or [], muted)

    capped = False
    if len(families) > _MAX_SENDS_PER_RUN:
        families = families[:_MAX_SENDS_PER_RUN]
        capped = True

    plan = []
    for f in families:
        sms_body = _fill_template(sms_template, f["parent"], f["kid_names"], f["balance"], currency, pay_link)
        email_body = _fill_template(email_template, f["parent"], f["kid_names"], f["balance"], currency, pay_link)
        plan.append({**f, "sms_body": sms_body, "email_body": email_body})

    if req.dry_run:
        return {
            "trainer_id": trainer["id"],
            "dry_run": True,
            "families": plan,
            "channels": sorted(channels),
            "capped": capped,
        }

    tw_client = None
    if "sms" in channels and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
        from twilio.rest import Client as TwilioClient

        tw_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

    sent_sms = sent_email = 0
    errors: list[str] = []
    for f in plan:
        if "email" in channels and f["email"]:
            try:
                _send_email_for(trainer_name, bs_settings, f["email"], email_subject, f["email_body"])
                sent_email += 1
            except Exception as e:  # noqa: BLE001 — isolate per family
                errors.append(f"{f['label']} email: {e}")
        if "sms" in channels:
            if tw_client is None:
                if not errors or not errors[-1].startswith("_sms_unconfigured"):
                    errors.append("_sms_unconfigured: texts requested but Twilio is not set up on the server")
            elif not f.get("sms_ok"):
                # No recorded opt-in for this family — carrier rules say
                # never text them. Email still goes.
                pass
            elif f["phone"]:
                try:
                    _send_sms(f["phone"], f["sms_body"], tw_client)
                    sent_sms += 1
                except Exception as e:  # noqa: BLE001
                    errors.append(f"{f['label']} sms: {e}")

    result = {
        "trainer_id": trainer["id"],
        "dry_run": False,
        "families_checked": len(plan),
        "sent_sms": sent_sms,
        "sent_email": sent_email,
        "errors": errors[:20],
        "capped": capped,
    }

    try:
        sb_admin.table("activity_log").insert(
            {
                "trainer_id": trainer["id"],
                "actor": "system",
                "action": "weekly_balance_reminders",
                "entity_type": "reminder_run",
                "details": {**result, "triggered_by": triggered_by},
            }
        ).execute()
    except Exception:  # noqa: BLE001 — logging must never fail the run
        pass

    return result


@router.post("/weekly-balances")
def weekly_balances(
    req: WeeklyBalancesRequest,
    x_cron_secret: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> dict:
    """Send (or preview) balance reminders, grouped per family.

    Two ways in:
      · Trainer JWT — her own account only. dry_run=True previews.
      · X-Cron-Secret — the daily cron. Runs every babysitting account
        whose schedule is enabled AND whose chosen weekday is today (UTC).
    """
    from ..db import supabase_admin

    sb_admin = supabase_admin()

    if x_cron_secret is not None:
        _require_cron_secret(x_cron_secret)
        trainers = (
            sb_admin.table("trainers")
            .select("id, full_name, business_name, public_profile, template_slugs")
            .contains("template_slugs", ["babysitting"])
            .execute()
        )
        now = datetime.now(timezone.utc)
        today = now.weekday()  # Mon=0 … Sun=6
        results = []
        for t in trainers.data or []:
            schedule = ((t.get("public_profile") or {}).get("babysitting") or {}).get("settings", {}).get("schedule") or {}
            if not schedule.get("enabled"):
                continue
            if schedule.get("frequency") == "monthly":
                # "Every 1st of the month" style — fires on that date.
                if int(schedule.get("dayOfMonth", 1)) != now.day:
                    continue
            else:
                # Weekly. schedule.day uses JS convention: Sun=0 … Sat=6.
                js_today = (today + 1) % 7
                if int(schedule.get("day", 4)) != js_today:
                    continue
            try:
                results.append(_run_for_trainer(sb_admin, t, req, triggered_by="cron"))
            except Exception as e:  # noqa: BLE001 — one bad tenant never kills the run
                results.append({"trainer_id": t["id"], "error": str(e)[:200]})
        return {"ran_for": len(results), "results": results}

    # Trainer-initiated path — verify the JWT ourselves.
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    from ..auth import get_current_user

    user = get_current_user(authorization)
    trainer_resp = (
        sb_admin.table("trainers")
        .select("id, full_name, business_name, public_profile, template_slugs")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    if not trainer_resp.data:
        raise HTTPException(404, "Trainer not found")
    return _run_for_trainer(sb_admin, trainer_resp.data, req, triggered_by="trainer")


class ReceiptRequest(BaseModel):
    client_id: str
    amount: float


@router.post("/payment-receipt")
def payment_receipt(
    req: ReceiptRequest,
    authorization: str | None = Header(default=None),
) -> dict:
    """Right after the sitter records a payment: thank the parent and show
    the fresh family balance. Fire-and-forget from the UI — never blocks
    the payment itself."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    from ..auth import get_current_user
    from ..db import supabase_admin

    user = get_current_user(authorization)
    sb = supabase_admin()

    trainer_resp = (
        sb.table("trainers")
        .select("id, full_name, business_name, public_profile")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    if not trainer_resp.data:
        raise HTTPException(404, "Trainer not found")
    trainer = trainer_resp.data
    bs_settings = ((trainer.get("public_profile") or {}).get("babysitting") or {}).get("settings") or {}
    receipts = bs_settings.get("receipts") or {}
    if not receipts.get("enabled"):
        return {"sent": False, "reason": "receipts off"}

    kid_resp = (
        sb.table("clients")
        .select("id, trainer_id, full_name, phone, email, tags")
        .eq("id", req.client_id)
        .eq("trainer_id", user.user_id)
        .single()
        .execute()
    )
    if not kid_resp.data:
        raise HTTPException(404, "Kid not found")
    kid = kid_resp.data

    fam_slug = _tag_value(kid.get("tags"), "family:")
    if fam_slug:
        members_resp = (
            sb.table("clients")
            .select("id, full_name, phone, email, status, tags")
            .eq("trainer_id", user.user_id)
            .eq("status", "active")
            .contains("tags", [f"family:{fam_slug}"])
            .execute()
        )
        members = members_resp.data or [kid]
    else:
        members = [kid]

    balance = round(sum(_kid_balance(m.get("tags")) for m in members), 2)
    parent = next((_tag_value(m.get("tags"), "parent:") for m in members if _tag_value(m.get("tags"), "parent:")), "")
    email = next((m.get("email") for m in members if m.get("email")), None)
    kid_names = [m["full_name"].split(" ")[0] for m in members]

    currency = bs_settings.get("currency") or "$"
    pay_link = (bs_settings.get("payLink") or "").strip()
    template = receipts.get("template") or (
        "Hi {parent}! Received {currency}{amount} — thank you! The balance for {kids} is now {currency}{balance}."
    )
    amount_str = f"{req.amount:.0f}" if req.amount == int(req.amount) else f"{req.amount:.2f}"
    body = _fill_template(template.replace("{amount}", amount_str), parent, kid_names, balance, currency, pay_link)
    trainer_name = trainer.get("business_name") or trainer.get("full_name") or "Your babysitter"

    phone = next((m.get("phone") for m in members if m.get("phone")), None)
    # Only text a family that actually opted in (carrier rule, and the
    # promise made on the consent checkbox).
    sms_consent = any("smsconsent:1" in (m.get("tags") or []) for m in members)
    sms_wanted = receipts.get("smsEnabled", True) and sms_consent

    channels: list[str] = []
    errors: list[str] = []

    # Text first — the parent's phone is where this lands best.
    if sms_wanted and phone and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
        try:
            from twilio.rest import Client as TwilioClient

            _send_sms(phone, body, TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN))
            channels.append("sms")
        except Exception as e:  # noqa: BLE001 — the email still goes
            errors.append(f"sms: {e}")

    if email:
        try:
            channels.append(_send_email_for(trainer_name, bs_settings, email, "Payment received — thank you!", body))
        except Exception as e:  # noqa: BLE001
            errors.append(f"email: {e}")

    if not channels:
        reason = "; ".join(errors) if errors else "no parent phone or email on file"
        return {"sent": False, "reason": reason[:200]}
    channel = "+".join(channels)

    try:
        sb.table("activity_log").insert(
            {
                "trainer_id": user.user_id,
                "actor": "system",
                "action": "payment_receipt",
                "entity_type": "client",
                "entity_id": kid["id"],
                "details": {"amount": req.amount, "channel": channel, "to": email or phone},
            }
        ).execute()
    except Exception:  # noqa: BLE001
        pass
    return {"sent": True, "channel": channel}


class TestEmailRequest(BaseModel):
    pass


@router.post("/test-email")
def test_email(authorization: str | None = Header(default=None)) -> dict:
    """Sends ONE email to the sitter's own login address through the exact
    same path the reminders use, and returns the channel or the real
    error text — the one-tap answer to "why aren't my emails going?"."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    from ..auth import get_current_user
    from ..db import supabase_admin

    user = get_current_user(authorization)
    if not user.email:
        raise HTTPException(400, "Your login has no email address")

    sb = supabase_admin()
    trainer_resp = (
        sb.table("trainers")
        .select("id, full_name, business_name, public_profile")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    if not trainer_resp.data:
        raise HTTPException(404, "Trainer not found")
    trainer = trainer_resp.data
    bs_settings = ((trainer.get("public_profile") or {}).get("babysitting") or {}).get("settings") or {}
    trainer_name = trainer.get("business_name") or trainer.get("full_name") or "Your babysitting app"

    try:
        channel = _send_email_for(
            trainer_name,
            bs_settings,
            user.email,
            "Test — your reminders are working",
            "This is a test from your babysitting app. If you can read this, "
            "automatic emails are working. 💛",
        )
    except Exception as e:  # noqa: BLE001 — the error text IS the answer
        return {"sent": False, "error": str(e)[:300]}
    return {"sent": True, "channel": channel, "to": user.email}


class AnnounceRequest(BaseModel):
    body: str
    family_slugs: list[str] | None = None  # None = every active family
    channels: list[Literal["sms", "email"]] = ["email"]


@router.post("/announce")
def announce(req: AnnounceRequest, authorization: str | None = Header(default=None)) -> dict:
    """Send a note to parents FROM THE SERVER — no mail app, no tapping
    one family at a time. Email goes now; SMS goes the moment the 10DLC
    campaign is approved (until then it reports itself as unavailable
    rather than pretending to have sent)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    from ..auth import get_current_user
    from ..db import supabase_admin

    body = (req.body or "").strip()
    if not body:
        raise HTTPException(400, "Nothing to send")

    user = get_current_user(authorization)
    sb = supabase_admin()

    trainer_resp = (
        sb.table("trainers")
        .select("id, full_name, business_name, public_profile")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    if not trainer_resp.data:
        raise HTTPException(404, "Trainer not found")
    trainer = trainer_resp.data
    bs_settings = ((trainer.get("public_profile") or {}).get("babysitting") or {}).get("settings") or {}
    trainer_name = trainer.get("business_name") or trainer.get("full_name") or "Your babysitter"

    kids_resp = (
        sb.table("clients")
        .select("id, full_name, phone, email, status, tags")
        .eq("trainer_id", trainer["id"])
        .eq("status", "active")
        .contains("tags", [_KID_MARKER])
        .execute()
    )
    families = _group_families(kids_resp.data or [], set())
    if req.family_slugs is not None:
        wanted = set(req.family_slugs)
        families = [f for f in families if f["slug"] in wanted]
    families = families[:_MAX_SENDS_PER_RUN]

    channels = set(req.channels or ["email"])
    tw_client = None
    sms_unavailable = None
    if "sms" in channels:
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
            from twilio.rest import Client as TwilioClient

            tw_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        else:
            sms_unavailable = "Texting isn't switched on yet — the email went out."

    sent_email = sent_sms = 0
    errors: list[str] = []
    for f in families:
        if "email" in channels and f["email"]:
            try:
                _send_email_for(trainer_name, bs_settings, f["email"], f"A note from {trainer_name}", body)
                sent_email += 1
            except Exception as e:  # noqa: BLE001 — one family never stops the rest
                errors.append(f"{f['label']}: {str(e)[:120]}")
        if "sms" in channels and tw_client is not None and f["phone"] and f.get("sms_ok"):
            try:
                _send_sms(f["phone"], body, tw_client)
                sent_sms += 1
            except Exception as e:  # noqa: BLE001
                msg = str(e)
                # The pending-campaign error is expected, not a bug.
                if "30034" in msg or "unregistered" in msg.lower():
                    sms_unavailable = "Texting is still waiting on carrier approval — the email went out."
                else:
                    errors.append(f"{f['label']} text: {msg[:120]}")

    result = {
        "families": len(families),
        "sent_email": sent_email,
        "sent_sms": sent_sms,
        "sms_unavailable": sms_unavailable,
        "errors": errors[:10],
    }
    try:
        sb.table("activity_log").insert(
            {
                "trainer_id": trainer["id"],
                "actor": "trainer",
                "action": "parent_announcement",
                "entity_type": "announcement",
                "details": {**result, "body": body[:200]},
            }
        ).execute()
    except Exception:  # noqa: BLE001
        pass
    return result


class CommentNotifyRequest(BaseModel):
    message: str


@router.post("/comment-notify")
def comment_notify(req: CommentNotifyRequest, authorization: str | None = Header(default=None)) -> dict:
    """A sitter wrote in the 💡 Comment box — email it to the builder so it
    isn't sitting unseen in a database. Reply-To is HER address, so hitting
    Reply in the inbox answers her directly; the admin page is linked for a
    reply that lands back inside her app."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    from ..auth import get_current_user
    from ..db import supabase_admin

    body = (req.message or "").strip()
    if not body:
        raise HTTPException(400, "Empty comment")

    admins = [e.strip() for e in (settings.ADMIN_EMAILS or "").split(",") if e.strip()]
    if not admins:
        return {"sent": False, "reason": "no admin email configured"}

    user = get_current_user(authorization)
    sb = supabase_admin()
    t = (
        sb.table("trainers")
        .select("id, full_name, business_name")
        .eq("id", user.user_id)
        .single()
        .execute()
    )
    row = t.data or {}
    who = row.get("business_name") or row.get("full_name") or "A user"
    from_addr = settings.RESEND_FROM_EMAIL

    text = (
        f"{who} wrote a comment in the app:\n\n"
        f"    {body}\n\n"
        f"— {who}\n"
        f"Their email: {user.email or 'unknown'}\n\n"
        "Reply to this email to answer them directly.\n"
        "To have your reply appear inside their app, answer it here:\n"
        "https://www.trainerpro.coach/chesky\n"
    )

    if not settings.RESEND_API_KEY:
        return {"sent": False, "reason": "no email path configured"}

    import httpx

    sent = 0
    errors = []
    for to in admins:
        try:
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_addr,
                    "to": [to],
                    "subject": f"💡 App comment from {who}",
                    "text": text,
                    **({"reply_to": [user.email]} if user.email else {}),
                },
                timeout=15,
            )
            if resp.status_code >= 300:
                errors.append(f"{resp.status_code}: {resp.text[:120]}")
            else:
                sent += 1
        except Exception as e:  # noqa: BLE001 — a notify hiccup never breaks the comment
            errors.append(str(e)[:120])

    return {"sent": sent > 0, "count": sent, "errors": errors[:3]}
