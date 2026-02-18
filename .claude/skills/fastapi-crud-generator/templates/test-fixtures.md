# Test Fixtures Template (Updated for Routes)

## backend/tests/conftest.py

This **extends** the conftest.py from `neon-sqlmodel-generator` by adding:
- httpx `AsyncClient` fixture with dependency override
- Seed helpers for User and Task

```python
# [Task]: T00X [From]: specs/phase2-web/rest-api/tasks.md §Test Fixtures
"""Test fixtures for FastAPI route integration tests.

Provides: async engine, session, httpx client with dep override, seed helpers.
"""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from backend.db import get_session
from backend.main import app
from backend.models import Task, User

TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture(name="engine")
async def fixture_engine():
    """Create a fresh async engine per test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(name="session")
async def fixture_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create an async session for direct DB operations in tests."""
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest.fixture(name="client")
async def fixture_client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """httpx AsyncClient with get_session dependency overridden to test session."""

    async def _override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_session] = _override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(name="seed_user")
async def fixture_seed_user(session: AsyncSession) -> User:
    """Insert a test user and return it."""
    user = User(id="test-user-1", email="test@example.com", name="Test User")
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.fixture(name="seed_task")
async def fixture_seed_task(session: AsyncSession, seed_user: User) -> Task:
    """Insert a test task (depends on seed_user) and return it."""
    task = Task(user_id=seed_user.id, title="Test Task", description="A test task")
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task
```

## Key Points

- `fixture_client` overrides `get_session` so routes use the test SQLite session
- `app.dependency_overrides.clear()` in teardown — prevents test pollution
- `seed_user` + `seed_task` — composable fixtures for test data
- All fixtures are `async` — `asyncio_mode = "auto"` in pyproject.toml
- `ASGITransport(app=app)` — httpx sends requests directly to the ASGI app (no network)
