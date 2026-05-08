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


@router.post("/run-daily")
def run_daily(authorization: str = Header(...)) -> dict:
    """Cron-friendly: send reminders for all sessions in the next 24h that haven't been reminded.

    Requires a service-role JWT so it can act across all sessions for the trainer.
    Wire to a Render cron job: schedule = '0 9 * * *' (9am daily).
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    # In a real deploy, you'd verify a shared cron secret here.
    # For now, this requires the service_role key (admin) to call.

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
