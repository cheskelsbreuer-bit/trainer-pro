"""Centralized config — reads from environment variables (or .env in dev)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # CORS — comma-separated list of allowed origins
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Admin allowlist — comma-separated emails that can call /admin/*
    ADMIN_EMAILS: str = ""

    # Optional integrations
    ANTHROPIC_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    # Email (Resend) — used for session reminders + intake emails
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Trainer Pro <onboarding@resend.dev>"
    # Shared secret for scheduled jobs (GitHub Actions cron → /reminders/*).
    # Empty = scheduled endpoints refuse to run (fail closed).
    CRON_SECRET: str = ""
    # ── Email replies coming back IN ───────────────────────────────────
    # Comment notifications go out with Reply-To set to this address, so
    # hitting Reply in the inbox routes the answer through Resend Inbound
    # back to POST /reminders/inbound-reply, which drops it into the
    # sender's app. Empty = replies still work as plain email to the
    # user, they just don't land inside the app.
    REPLY_INBOUND_EMAIL: str = ""
    # Svix signing secret for that inbound webhook ("whsec_..." from the
    # Resend webhook page). Empty = the endpoint refuses every delivery.
    INBOUND_WEBHOOK_SECRET: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGIN.split(",") if o.strip()]


settings = Settings()
