"""Verify Supabase JWT tokens so backend endpoints know which trainer is calling.

The frontend includes its Supabase access token in the Authorization header.
We verify the signature using the project's JWT secret, then return the user_id.
That user_id == trainers.id == auth.users.id in Supabase.
"""

from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status

from .config import settings


class AuthedUser:
    """Lightweight wrapper around the JWT claims we care about."""

    def __init__(self, user_id: str, email: str | None, raw: dict):
        self.user_id = user_id
        self.email = email
        self.raw = raw


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> AuthedUser:
    """FastAPI dependency: validate the bearer token, return the user."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()

    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Server misconfigured: SUPABASE_JWT_SECRET is not set",
        )

    try:
        # Supabase signs with HS256 by default
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Invalid token: {e}") from e

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing 'sub'")

    return AuthedUser(user_id=user_id, email=payload.get("email"), raw=payload)


CurrentUser = Annotated[AuthedUser, Depends(get_current_user)]
