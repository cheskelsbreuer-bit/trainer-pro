"""Public health-check endpoints — handy for uptime monitors and deploy checks."""

from fastapi import APIRouter

from ..config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Return 200 if the service is alive, plus which integrations are configured."""
    return {
        "ok": True,
        "service": "trainer-pro-backend",
        "version": "0.1.0",
        "integrations": {
            "supabase": bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY),
            "supabase_jwt": bool(settings.SUPABASE_JWT_SECRET),
            # Service-role key is required for ALL /admin/* endpoints.
            # If false, "Couldn't load trainers" + feedback reply both fail.
            "supabase_service_role": bool(settings.SUPABASE_SERVICE_ROLE_KEY),
            "anthropic": bool(settings.ANTHROPIC_API_KEY),
            "twilio": bool(
                settings.TWILIO_ACCOUNT_SID
                and settings.TWILIO_AUTH_TOKEN
                and settings.TWILIO_FROM_NUMBER
            ),
            "resend": bool(settings.RESEND_API_KEY),
            "stripe": bool(settings.STRIPE_SECRET_KEY),
            "admin_emails": bool(settings.ADMIN_EMAILS),
        },
    }
