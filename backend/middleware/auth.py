# [Task]: T002 [From]: specs/phase2-web/authentication/spec.md §FR-001 to FR-009
# FastAPI JWT verification middleware using PyJWT.
# Verifies Bearer tokens issued by Better Auth's JWT plugin.
# Spec: SC-001 to SC-005

import os
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Request, status

BETTER_AUTH_SECRET: str = os.environ.get("BETTER_AUTH_SECRET", "")
ALGORITHM = "HS256"


def _extract_bearer_token(request: Request) -> str:
    """
    FR-002: Extract JWT from Authorization: Bearer <token> header.
    Returns 401 if header is missing or not Bearer-prefixed.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_header[7:]


def _decode_token(token: str) -> dict[str, Any]:
    """
    FR-003 / FR-008 / FR-009: Decode and verify JWT with PyJWT.
    Algorithm: HS256. Required claims: exp + sub.
    Returns 401 for expired or invalid tokens.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            key=BETTER_AUTH_SECRET,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(request: Request) -> dict[str, Any]:
    """
    FastAPI dependency: extract and verify JWT, return payload dict.
    Use `Depends(get_current_user)` on routes that only need authentication.
    """
    token = _extract_bearer_token(request)
    return _decode_token(token)


async def verify_user_access(
    user_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    FR-004: Combined authentication + user isolation dependency.
    JWT `sub` claim MUST match URL `{user_id}` — mismatch returns 403.
    Use `Depends(verify_user_access)` on all task routes.
    """
    if current_user.get("sub") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user
