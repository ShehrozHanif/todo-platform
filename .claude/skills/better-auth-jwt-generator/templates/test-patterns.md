# Auth Test Patterns Template

## backend/tests/test_auth.py

```python
# [Task]: T00X [From]: specs/phase2-web/authentication/tasks.md §Auth Tests
"""Tests for JWT verification middleware.

Uses PyJWT to create test tokens — never depends on Better Auth server.
"""

import os
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import FastAPI, Depends
from httpx import ASGITransport, AsyncClient

from backend.middleware.auth import (
    get_current_user,
    verify_user_access,
    _extract_bearer_token,
    _decode_token,
)

# Test secret — override the real one for testing
TEST_SECRET = "test-secret-key-for-unit-tests-only-32chars"


def create_test_token(
    user_id: str = "test-user-123",
    email: str = "test@example.com",
    name: str = "Test User",
    expired: bool = False,
    secret: str = TEST_SECRET,
) -> str:
    """Create a JWT token for testing."""
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=-1 if expired else 7)
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": now,
        "exp": exp,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture(autouse=True)
def set_test_secret(monkeypatch):
    """Override BETTER_AUTH_SECRET for all tests."""
    monkeypatch.setenv("BETTER_AUTH_SECRET", TEST_SECRET)
    # Re-import to pick up new env value
    import backend.middleware.auth as auth_module
    monkeypatch.setattr(auth_module, "BETTER_AUTH_SECRET", TEST_SECRET)


# ── Token Extraction Tests ────────────────────────────────────────


class TestExtractBearerToken:
    async def test_valid_bearer_token(self):
        from starlette.testclient import TestClient
        from fastapi import Request
        import io

        # Create a minimal ASGI scope
        scope = {
            "type": "http",
            "headers": [(b"authorization", b"Bearer abc123")],
        }
        request = Request(scope)
        token = _extract_bearer_token(request)
        assert token == "abc123"

    async def test_missing_header_raises_401(self):
        scope = {"type": "http", "headers": []}
        request = Request(scope)
        with pytest.raises(Exception) as exc_info:
            _extract_bearer_token(request)
        assert exc_info.value.status_code == 401

    async def test_non_bearer_prefix_raises_401(self):
        scope = {
            "type": "http",
            "headers": [(b"authorization", b"Basic abc123")],
        }
        request = Request(scope)
        with pytest.raises(Exception) as exc_info:
            _extract_bearer_token(request)
        assert exc_info.value.status_code == 401


# ── Token Decode Tests ────────────────────────────────────────────


class TestDecodeToken:
    def test_valid_token_returns_payload(self):
        token = create_test_token(user_id="user-1")
        payload = _decode_token(token)
        assert payload["sub"] == "user-1"
        assert payload["email"] == "test@example.com"

    def test_expired_token_raises_401(self):
        token = create_test_token(expired=True)
        with pytest.raises(Exception) as exc_info:
            _decode_token(token)
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_invalid_signature_raises_401(self):
        token = create_test_token(secret="wrong-secret-key-not-matching!!")
        with pytest.raises(Exception) as exc_info:
            _decode_token(token)
        assert exc_info.value.status_code == 401
        assert "invalid" in exc_info.value.detail.lower()

    def test_malformed_token_raises_401(self):
        with pytest.raises(Exception) as exc_info:
            _decode_token("not.a.valid.jwt.token")
        assert exc_info.value.status_code == 401

    def test_missing_sub_claim_raises_401(self):
        now = datetime.now(timezone.utc)
        payload = {"email": "x@y.com", "exp": now + timedelta(days=1), "iat": now}
        token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
        with pytest.raises(Exception) as exc_info:
            _decode_token(token)
        assert exc_info.value.status_code == 401


# ── Integration Tests (Full Endpoint) ─────────────────────────────


class TestProtectedEndpoint:
    """Test auth middleware via a minimal FastAPI app."""

    @pytest.fixture
    def test_app(self):
        """Create a minimal app with a protected route."""
        app = FastAPI()

        @app.get("/api/{user_id}/test")
        async def protected_route(
            user_id: str,
            current_user: dict = Depends(verify_user_access),
        ):
            return {"user_id": user_id, "sub": current_user["sub"]}

        @app.get("/health")
        async def health():
            return {"status": "ok"}

        return app

    @pytest.fixture
    async def test_client(self, test_app):
        async with AsyncClient(
            transport=ASGITransport(app=test_app),
            base_url="http://test",
        ) as client:
            yield client

    async def test_valid_token_passes(self, test_client: AsyncClient):
        token = create_test_token(user_id="user-1")
        resp = await test_client.get(
            "/api/user-1/test",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["sub"] == "user-1"

    async def test_missing_token_returns_401(self, test_client: AsyncClient):
        resp = await test_client.get("/api/user-1/test")
        assert resp.status_code == 401

    async def test_invalid_token_returns_401(self, test_client: AsyncClient):
        resp = await test_client.get(
            "/api/user-1/test",
            headers={"Authorization": "Bearer garbage-token"},
        )
        assert resp.status_code == 401

    async def test_expired_token_returns_401(self, test_client: AsyncClient):
        token = create_test_token(user_id="user-1", expired=True)
        resp = await test_client.get(
            "/api/user-1/test",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401

    async def test_mismatched_user_id_returns_403(self, test_client: AsyncClient):
        token = create_test_token(user_id="user-1")
        resp = await test_client.get(
            "/api/different-user/test",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

    async def test_health_check_no_auth_required(self, test_client: AsyncClient):
        resp = await test_client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
```

## Test Count Summary

| Test Class | Tests | What It Covers |
|------------|-------|----------------|
| `TestExtractBearerToken` | 3 | Valid header, missing header, wrong prefix |
| `TestDecodeToken` | 5 | Valid token, expired, wrong secret, malformed, missing claim |
| `TestProtectedEndpoint` | 6 | Valid auth, missing 401, invalid 401, expired 401, mismatch 403, public health |
| **Total** | **14** | Full middleware coverage |

## Patterns Used

- `create_test_token()` — helper creates real JWTs with PyJWT (no Better Auth needed)
- `monkeypatch` overrides `BETTER_AUTH_SECRET` for test isolation
- `test_app` fixture creates minimal FastAPI app with protected + public routes
- `AsyncClient` with `ASGITransport` — no real network, fast
- Each error case tested independently with specific status code assertions
- Health check proves public endpoints are unaffected by auth middleware

## Adding Auth Headers to Existing Route Tests

After implementing auth, update `backend/tests/conftest.py`:

```python
@pytest.fixture
def auth_headers():
    """Valid auth headers for test user."""
    token = create_test_token(user_id="test-user-123")
    return {"Authorization": f"Bearer {token}"}
```

Then update all route test calls:
```python
# Before (no auth):
resp = await client.get(f"/api/{seed_user.id}/tasks")

# After (with auth):
resp = await client.get(
    f"/api/{seed_user.id}/tasks",
    headers=auth_headers,
)
```
