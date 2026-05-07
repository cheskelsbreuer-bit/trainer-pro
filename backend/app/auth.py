"""Verify Supabase JWT tokens so backend endpoints know which trainer is calling.

Supabase has two signing modes — and we support both:

  * Legacy HS256 — symmetric, signed with SUPABASE_JWT_SECRET.
  * Modern ES256 (or RS256) — asymmetric. Public keys come from
    {SUPABASE_URL}/auth/v1/.well-known/jwks.json which we fetch with
    `requests` (uses certifi's CA bundle so SSL verification works on
    Windows) and cache for the process lifetime.

The token's own header tells us which algorithm + kid was used; we route
accordingly. user_id == trainers.id == auth.users.id in Supabase.
"""

from __future__ import annotations

import json
import threading
import time
from typing import Annotated, Any

import jwt
import requests
from fastapi import Depends, Header, HTTPException, status
from jwt.algorithms import ECAlgorithm, RSAAlgorithm

from .config import settings


class AuthedUser:
    """Lightweight wrapper around the JWT claims we care about."""

    def __init__(self, user_id: str, email: str | None, raw: dict[str, Any]) -> None:
        self.user_id = user_id
        self.email = email
        self.raw = raw


# Process-wide cache: kid -> public key object. Refreshed on cache miss
# (e.g. Supabase rotated keys), bounded by _CACHE_TTL_S so we don't hold
# stale keys forever.
_CACHE_TTL_S = 3600
_jwks_lock = threading.Lock()
_jwks_keys: dict[str, Any] = {}
_jwks_fetched_at: float = 0.0


def _fetch_jwks_into_cache() -> None:
    """Pull the project's JWKS via `requests` (uses certifi for SSL verify)."""
    global _jwks_fetched_at
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Server misconfigured: SUPABASE_URL is not set",
        )
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        jwks = resp.json()
    except requests.RequestException as e:
        raise RuntimeError(f"Failed to fetch JWKS from {url}: {e}") from e

    new_keys: dict[str, Any] = {}
    for jwk in jwks.get("keys", []):
        kid = jwk.get("kid")
        kty = jwk.get("kty")
        if not kid or not kty:
            continue
        try:
            if kty == "EC":
                key = ECAlgorithm.from_jwk(json.dumps(jwk))
            elif kty == "RSA":
                key = RSAAlgorithm.from_jwk(json.dumps(jwk))
            else:
                continue
            new_keys[kid] = key
        except Exception as e:  # malformed JWK, skip
            print(f"[auth] Skipping malformed JWK kid={kid!r}: {e}")

    if not new_keys:
        raise RuntimeError(f"JWKS at {url} contained no usable keys")

    _jwks_keys.clear()
    _jwks_keys.update(new_keys)
    _jwks_fetched_at = time.time()


def _get_signing_key(kid: str) -> Any:
    now = time.time()
    with _jwks_lock:
        # First lookup, expired cache, or unknown kid -> refetch
        if not _jwks_keys or now - _jwks_fetched_at > _CACHE_TTL_S or kid not in _jwks_keys:
            _fetch_jwks_into_cache()
        key = _jwks_keys.get(kid)
    if not key:
        raise jwt.InvalidKeyError(f"No matching JWKS key for kid={kid!r}")
    return key


def _decode_with_jwks(token: str, alg: str, kid: str) -> dict[str, Any]:
    key = _get_signing_key(kid)
    return jwt.decode(  # type: ignore[no-any-return]
        token,
        key,
        algorithms=[alg],
        audience="authenticated",
    )


def _decode_with_secret(token: str) -> dict[str, Any]:
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

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Malformed token: {e}") from e

    alg = unverified_header.get("alg", "")
    kid = unverified_header.get("kid", "")

    try:
        if alg == "HS256":
            payload = _decode_with_secret(token)
        elif alg in ("ES256", "RS256", "ES384", "RS384", "ES512", "RS512"):
            if not kid:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED,
                    f"Asymmetric token missing 'kid' header",
                )
            payload = _decode_with_jwks(token, alg, kid)
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
        import traceback
        print(f"[auth] Unexpected error verifying JWT (alg={alg!r}, kid={kid!r}): {e}")
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
