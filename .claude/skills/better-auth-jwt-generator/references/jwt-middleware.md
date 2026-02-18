# JWT Middleware Reference (FastAPI + PyJWT)

## PyJWT Library

PyJWT is a Python library for encoding and decoding JWT tokens. The backend uses it to verify tokens issued by Better Auth.

### Installation
```bash
uv add pyjwt
```

**Important:** The package is `pyjwt` but the import is `jwt`:
```python
import jwt  # NOT import pyjwt
```

## JWT Decode Pattern

```python
import jwt

payload = jwt.decode(
    token,
    key=SECRET_KEY,
    algorithms=["HS256"],
    options={"require": ["exp", "sub"]},
)
```

### Parameters

| Parameter | Value | Why |
|-----------|-------|-----|
| `token` | The Bearer token string | From Authorization header |
| `key` | `BETTER_AUTH_SECRET` | Same secret as Better Auth |
| `algorithms` | `["HS256"]` | **Must specify** — prevents algorithm confusion attack |
| `options.require` | `["exp", "sub"]` | Ensure token has expiry and user ID |

## Exception Handling

PyJWT raises specific exceptions:

```python
try:
    payload = jwt.decode(token, key=SECRET, algorithms=["HS256"])
except jwt.ExpiredSignatureError:
    # Token has expired — 401
    raise HTTPException(status_code=401, detail="Token has expired")
except jwt.InvalidTokenError:
    # Any other decode failure (bad signature, malformed, etc.) — 401
    raise HTTPException(status_code=401, detail="Invalid token")
```

### Exception Hierarchy

```
jwt.InvalidTokenError (base)
├── jwt.DecodeError            — Malformed token, bad base64
├── jwt.ExpiredSignatureError  — Token past exp time
├── jwt.InvalidSignatureError  — Wrong secret key
├── jwt.MissingRequiredClaimError — Missing required claims
└── jwt.InvalidAlgorithmError  — Algorithm not in allowed list
```

Catching `jwt.ExpiredSignatureError` first (for specific message), then `jwt.InvalidTokenError` as fallback covers all cases.

## Bearer Token Extraction

```python
from fastapi import Request

def _extract_bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    return auth_header[7:]  # Strip "Bearer " prefix
```

### Edge Cases
- Missing `Authorization` header entirely → 401
- Header present but not `Bearer ` prefix → 401
- Empty token after `Bearer ` → caught by PyJWT decode

## FastAPI Dependency Pattern

```python
from fastapi import Depends, Request

async def get_current_user(request: Request) -> dict:
    token = _extract_bearer_token(request)
    payload = _decode_token(token)
    return payload

# Usage in routes:
@router.get("/{user_id}/tasks")
async def list_tasks(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    ...
```

## User ID Validation Strategy

Two approaches for validating token user matches URL user:

### Option A: In each route handler (explicit)
```python
if current_user["sub"] != user_id:
    raise HTTPException(status_code=403, detail="Access denied")
```

### Option B: In middleware dependency (DRY)
```python
async def verify_user_access(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    if current_user["sub"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return current_user
```

**Option B is preferred** — single dependency handles both auth + user matching.

## Creating Test Tokens

For testing, create real JWT tokens with PyJWT:

```python
import jwt
from datetime import datetime, timezone, timedelta

TEST_SECRET = "test-secret-key-for-unit-tests-only"

def create_test_token(
    user_id: str = "test-user",
    expired: bool = False,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": f"{user_id}@test.com",
        "name": "Test User",
        "iat": now,
        "exp": now + timedelta(days=-1 if expired else 7),
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")
```

## Security Best Practices

| Practice | Reason |
|----------|--------|
| Always specify `algorithms=["HS256"]` | Prevents algorithm confusion (CVE-2022-29078) |
| Use `options={"require": ["exp", "sub"]}` | Rejects tokens missing critical claims |
| Secret ≥ 32 characters | Resist brute-force |
| Return 401 (not 403) for invalid tokens | Don't reveal that user exists |
| Return 403 for valid token + wrong user | User is authed but unauthorized |
| Log decode failures server-side | Debug without exposing to client |
