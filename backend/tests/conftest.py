# [Task]: T012 / T011 [From]: specs/phase2-web/database-schema/spec.md + rest-api/tasks.md
# Pytest fixtures: async SQLite in-memory engine, session, httpx client, seed data.
# research.md R2: tests MUST NOT hit Neon (external, slow, costs money).

# sys.path fix: ensure backend/ takes precedence over root-level modules (e.g. main.py from Phase I).
import sys
from pathlib import Path

_backend_dir = str(Path(__file__).parent.parent.resolve())
if sys.path and sys.path[0] != _backend_dir:
    sys.path.insert(0, _backend_dir)

from collections.abc import AsyncGenerator

import jwt as pyjwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

import db as db_module
import middleware.auth as auth_module
import models  # noqa: F401 — ensures SQLModel.metadata is populated
from db import get_session
from main import app
from models import Task, User

# Test auth secret and helpers
TEST_SECRET = "test-secret-key-for-unit-tests-only-32chars"

from datetime import datetime, timedelta, timezone


def create_test_token(user_id: str = "test-user-1") -> str:
    """Create a valid test JWT for the given user_id."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": "test@example.com",
        "name": "Test User",
        "iat": now,
        "exp": now + timedelta(days=7),
    }
    return pyjwt.encode(payload, TEST_SECRET, algorithm="HS256")

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(autouse=True)
def set_test_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    """Override BETTER_AUTH_SECRET for all tests so JWT verification uses test secret."""
    monkeypatch.setenv("BETTER_AUTH_SECRET", TEST_SECRET)
    monkeypatch.setattr(auth_module, "BETTER_AUTH_SECRET", TEST_SECRET)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    """Valid auth headers for the default test user (test-user-1)."""
    token = create_test_token(user_id="test-user-1")
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def engine() -> AsyncGenerator[AsyncEngine, None]:
    """Fresh async SQLite in-memory engine per test function."""
    eng = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    db_module.set_engine(eng)

    async with eng.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield eng

    async with eng.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

    await eng.dispose()
    db_module.set_engine(None)  # type: ignore[arg-type]


@pytest_asyncio.fixture(scope="function")
async def session(engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Async session for direct DB operations in tests."""
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as s:
        yield s


@pytest_asyncio.fixture(scope="function")
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """httpx AsyncClient with get_session overridden to the test SQLite session."""

    async def _override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_session] = _override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def seed_user(session: AsyncSession) -> User:
    """Insert a test user into the test DB and return it."""
    user = User(id="test-user-1", email="test@example.com", name="Test User")
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def seed_task(session: AsyncSession, seed_user: User) -> Task:
    """Insert a test task (depends on seed_user) and return it."""
    task = Task(
        user_id=seed_user.id,
        title="Test Task",
        description="A test task",
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
