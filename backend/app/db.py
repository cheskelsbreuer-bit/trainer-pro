"""Server-side Supabase client.

Uses the SERVICE ROLE key, which bypasses Row Level Security. ONLY call into
this from authenticated endpoints — and ALWAYS scope queries by `trainer_id =
current_user.user_id` to keep tenants isolated.

For simple read paths it's often fine to use the user's own anon-key client
(passing through their JWT) and let RLS do the work. The service role is here
for things that need elevation (cross-user reports, scheduled jobs, etc.).
"""

from functools import lru_cache

from supabase import Client, create_client

from .config import settings


@lru_cache(maxsize=1)
def supabase_admin() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "Supabase admin client requested but SUPABASE_URL or "
            "SUPABASE_SERVICE_ROLE_KEY is not set."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def supabase_user(jwt: str) -> Client:
    """A client scoped to a specific user — RLS applies. Pass the raw JWT."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError("Supabase URL or ANON key not set")
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(jwt)
    return client
