# [Task]: T003 [From]: specs/phase2-web/authentication/tasks.md §Auth Tests
# Tests for JWT verification middleware — 14 tests.
# Uses PyJWT to create test tokens — never depends on Better Auth server.
# Spec: SC-001 to SC-005

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

import middleware.auth as auth_module
from middleware.auth import (
    _decode_token,
    _extract_bearer_token,
    get_current_user,
    verify_user_access,
)

TEST_SECRET = "test-secret-key-for-unit-tests-only-32chars"


def create_test_token(
    user_id: str = "test-user-123",
    email: str = "test@example.com",
    name: str = "Test User",
    expired: bool = False,
    secret: str = TEST_SECRET,
) -> str:
    """Create a real JWT token for testing with PyJWT."""
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
def set_test_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    """FR-006: Override BETTER_AUTH_SECRET for test isolation — never use real secret in tests."""
    monkeypatch.setenv("BETTER_AUTH_SECRET", TEST_SECRET)
    monkeypatch.setattr(auth_module, "BETTER_AUTH_SECRET", TEST_SECRET)


# ── Token Extraction Tests ────────────────────────────────────────────────────


def test_extract_bearer_token_valid() -> None:
    """Valid Authorization: Bearer header extracts token correctly."""
    from fastapi import Request

    scope = {
        "type": "http",
        "headers": [(b"authorization", b"Bearer abc123")],
    }
    request = Request(scope)
    token = _extract_bearer_token(request)
    assert token == "abc123"


def test_extract_bearer_token_missing_header() -> None:
    """FR-002: Missing Authorization header returns 401."""
    from fastapi import Request

    scope = {"type": "http", "headers": []}
    request = Request(scope)
    with pytest.raises(Exception) as exc_info:
        _extract_bearer_token(request)
    assert exc_info.value.status_code == 401


def test_extract_bearer_token_wrong_prefix() -> None:
    """FR-002: 'Basic' prefix instead of 'Bearer' returns 401."""
    from fastapi import Request

    scope = {
        "type": "http",
        "headers": [(b"authorization", b"Basic abc123")],
    }
    request = Request(scope)
    with pytest.raises(Exception) as exc_info:
        _extract_bearer_token(request)
    assert exc_info.value.status_code == 401


# ── Token Decode Tests ─────────────────────────────────────────────────────────


def test_decode_token_valid_returns_payload() -> None:
    """Valid token with correct secret returns full payload."""
    token = create_test_token(user_id="user-1")
    payload = _decode_token(token)
    assert payload["sub"] == "user-1"
    assert payload["email"] == "test@example.com"


def test_decode_token_expired_returns_401() -> None:
    """FR-003: Expired token returns 401 with 'expired' in detail."""
    token = create_test_token(expired=True)
    with pytest.raises(Exception) as exc_info:
        _decode_token(token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_decode_token_wrong_secret_returns_401() -> None:
    """FR-003: Token signed with wrong secret returns 401 with 'invalid' in detail."""
    token = create_test_token(secret="wrong-secret-key-not-matching!!")
    with pytest.raises(Exception) as exc_info:
        _decode_token(token)
    assert exc_info.value.status_code == 401
    assert "invalid" in exc_info.value.detail.lower()


def test_decode_token_malformed_returns_401() -> None:
    """FR-003: Malformed token string returns 401."""
    with pytest.raises(Exception) as exc_info:
        _decode_token("not.a.valid.jwt.token")
    assert exc_info.value.status_code == 401


def test_decode_token_missing_sub_claim_returns_401() -> None:
    """FR-009: Token missing 'sub' claim returns 401."""
    now = datetime.now(timezone.utc)
    payload = {"email": "x@y.com", "exp": now + timedelta(days=1), "iat": now}
    token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    with pytest.raises(Exception) as exc_info:
        _decode_token(token)
    assert exc_info.value.status_code == 401


# ── Integration Tests (Full Endpoint) ─────────────────────────────────────────


@pytest.fixture
def test_app() -> FastAPI:
    """Minimal FastAPI app with a protected route + public health check."""
    _app = FastAPI()

    @_app.get("/api/{user_id}/test")
    async def protected_route(
        user_id: str,
        current_user: dict = Depends(verify_user_access),
    ) -> dict:
        return {"user_id": user_id, "sub": current_user["sub"]}

    @_app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    return _app


@pytest.fixture
async def test_client(test_app: FastAPI) -> AsyncClient:
    """httpx AsyncClient against the minimal test app."""
    async with AsyncClient(
        transport=ASGITransport(app=test_app),
        base_url="http://test",
    ) as c:
        yield c


async def test_valid_token_passes(test_client: AsyncClient) -> None:
    """FR-001: Valid JWT for matching user allows access."""
    token = create_test_token(user_id="user-1")
    resp = await test_client.get(
        "/api/user-1/test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["sub"] == "user-1"


async def test_missing_token_returns_401(test_client: AsyncClient) -> None:
    """FR-002: No Authorization header returns 401."""
    resp = await test_client.get("/api/user-1/test")
    assert resp.status_code == 401


async def test_invalid_token_returns_401(test_client: AsyncClient) -> None:
    """FR-003: Garbage token string returns 401."""
    resp = await test_client.get(
        "/api/user-1/test",
        headers={"Authorization": "Bearer garbage-token"},
    )
    assert resp.status_code == 401


async def test_expired_token_returns_401(test_client: AsyncClient) -> None:
    """FR-003: Expired JWT returns 401."""
    token = create_test_token(user_id="user-1", expired=True)
    resp = await test_client.get(
        "/api/user-1/test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401


async def test_mismatched_user_id_returns_403(test_client: AsyncClient) -> None:
    """FR-004: JWT sub='user-1' accessing /api/different-user/ returns 403."""
    token = create_test_token(user_id="user-1")
    resp = await test_client.get(
        "/api/different-user/test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Access denied"


async def test_health_check_no_auth_required(test_client: AsyncClient) -> None:
    """FR-005: /health endpoint is publicly accessible."""
    resp = await test_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
