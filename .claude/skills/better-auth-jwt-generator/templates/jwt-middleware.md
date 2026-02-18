# JWT Middleware Template

## backend/middleware/auth.py

```python
# [Task]: T00X [From]: specs/phase2-web/authentication/plan.md §JWT Middleware
"""FastAPI JWT verification middleware using PyJWT.

Verifies Bearer tokens issued by Better Auth's JWT plugin.
Extracts user identity and enforces user isolation on routes.
"""

import os

import jwt
from fastapi import Depends, HTTPException, Request, status

BETTER_AUTH_SECRET = os.environ.get("BETTER_AUTH_SECRET", "")
ALGORITHM = "HS256"


def _extract_bearer_token(request: Request) -> str:
    """Extract JWT from Authorization: Bearer <token> header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth_header[7:]


def _decode_token(token: str) -> dict:
    """Decode and verify JWT token using shared secret."""
    try:
        payload = jwt.decode(
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


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency: extract and verify JWT, return user payload.

    Usage:
        @router.get("/{user_id}/tasks")
        async def list_tasks(
            user_id: str,
            current_user: dict = Depends(get_current_user),
            session: AsyncSession = Depends(get_session),
        ):
            ...
    """
    token = _extract_bearer_token(request)
    return _decode_token(token)


async def verify_user_access(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """FastAPI dependency: verify JWT AND ensure token user matches URL user_id.

    Combines authentication + authorization in one dependency.

    Usage:
        @router.get("/{user_id}/tasks")
        async def list_tasks(
            user_id: str,
            current_user: dict = Depends(verify_user_access),
            session: AsyncSession = Depends(get_session),
        ):
            # current_user is guaranteed to match user_id
            ...
    """
    if current_user.get("sub") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return current_user
```

## backend/middleware/__init__.py

```python
from backend.middleware.auth import get_current_user, verify_user_access

__all__ = ["get_current_user", "verify_user_access"]
```

## Key Points

- `_extract_bearer_token` — pulls token from `Authorization: Bearer <token>` header
- `_decode_token` — verifies with PyJWT, requires `exp` + `sub` claims
- `get_current_user` — simple auth dependency (just verifies token)
- `verify_user_access` — combined auth + user match dependency (preferred for routes)
- `WWW-Authenticate: Bearer` header in 401 responses (RFC 6750 standard)
- `ExpiredSignatureError` caught separately for specific error message
- `BETTER_AUTH_SECRET` loaded from env, never hardcoded

## Updating Routes to Use Auth

Replace `Depends(get_current_user)` pattern in `backend/routes/tasks.py`:

```python
from backend.middleware.auth import verify_user_access

@router.get("/{user_id}/tasks", response_model=list[TaskResponse])
async def list_tasks(
    user_id: str,
    current_user: dict = Depends(verify_user_access),  # ← ADD THIS
    session: AsyncSession = Depends(get_session),
) -> list[TaskResponse]:
    ...
```

Apply `Depends(verify_user_access)` to ALL 6 task endpoints. The `user_id` path param is automatically passed to `verify_user_access` by FastAPI's DI system.
