# Test Fixtures Template

## backend/tests/conftest.py

```python
# [Task]: T00X [From]: specs/phase2-web/database-schema/tasks.md §Test Fixtures
"""Async test fixtures using SQLite in-memory database.

NEVER connects to Neon during tests. Uses aiosqlite for fast, isolated testing.
"""

from collections.abc import AsyncGenerator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

# In-memory SQLite for testing — no Neon dependency
TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture(name="engine")
async def fixture_engine():
    """Create a fresh async engine for each test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(name="session")
async def fixture_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Create an async session bound to the test engine."""
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session() as session:
        yield session
```

## Key Points

- `TEST_DATABASE_URL = "sqlite+aiosqlite://"` — in-memory, fresh per test
- `fixture_engine` creates tables before test, drops after — full isolation
- `fixture_session` yields an async session for database operations
- `expire_on_commit=False` — same as production config
- `echo=True` — SQL logging visible in test output for debugging
- `asyncio_mode = "auto"` in pyproject.toml means no `@pytest.mark.asyncio` needed

## SQLite vs PostgreSQL Differences

Tests use SQLite which has some differences from PostgreSQL:
- No `server_default=func.now()` execution in SQLite — timestamps may be None in tests
- String length constraints not enforced by SQLite
- For timestamp testing, set values explicitly in test data

These differences are acceptable for unit/integration testing. Real DB behavior is verified in staging.
