"""Verify Supabase JWT tokens so backend endpoints know which trainer is calling.

Supabase has two signing modes — and we support both:

  * Legacy HS256 — symmetric, signed with SUPABASE_JWT_SECRET.
  * Modern ES256 (or RS256) — asymmetric. Public key is fetched from
    {SUPABASE_URL}/auth/v1/.well-known/jwks.json and cached.

The token's own header tells us which algorithm was used; we route accordingly.
That user_id == trainers.id == auth.users.id in Supabase.
"""

from __future__ import annotations

from typing import Annotated, Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from .config import settings


class AuthedUser:
    """Lightweight wrapper around the JWT claims we care about."""

    def __init__(self, user_id: str, email: str | None, raw: dict[str, Any]) -> None:
        self.user_id = user_id
        self.email = email
        self.raw = raw


# Single PyJWKClient instance — it caches the JWKS internally for an hour.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.SUPABASE_URL:
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                "Server misconfigured: SUPABASE_URL is not set",
            )
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwks_client


def _decode_with_jwks(token: str, alg: str) -> dict[str, Any]:
    """Verify an asymmetrically-signed JWT using the project's JWKS."""
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token).key
    return jwt.decode(  # type: ignore[no-any-return]
        token,
        signing_key,
        algorithms=[alg],
        audience="authenticated",
    )


def _decode_with_secret(token: str) -> dict[str, Any]:
    """Verify an HS256 JWT using the legacy shared secret."""
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Server misconfigured: token is HS256 but SUPABASE_JWT_SECRET is empty",
        )
    return jwt.decode(  # type: ignore[no-any-return]
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated",
    )


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> AuthedUser:
    """FastAPI dependency: validate the bearer token, return the user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    # Peek at the unverified header to figure out which alg the token uses.
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Malformed token: {e}") from e

    alg = unverified_header.get("alg", "")

    try:
        if alg == "HS256":
            payload = _decode_with_secret(token)
        elif alg in ("ES256", "RS256", "ES384", "RS384", "ES512", "RS512"):
            payload = _decode_with_jwks(token, alg)
        else:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                f"Unsupported JWT algorithm: {alg!r}",
            )
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}") from e
    except Exception as e:
        # JWKS fetch failure, network glitch, etc — convert to a clean 401
        # with the underlying message so the frontend can surface it.
        import traceback
        print(f"[auth] Unexpected error verifying JWT (alg={alg!r}): {e}")
        traceback.print_exc()
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            f"Token verification failed: {type(e).__name__}: {e}",
        ) from e

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing 'sub'")

    return AuthedUser(user_id=user_id, email=payload.get("email"), raw=payload)


CurrentUser = Annotated[AuthedUser, Depends(get_current_user)]
