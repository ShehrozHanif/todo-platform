# Database Connection Template

## backend/db.py

```python
# [Task]: T00X [From]: specs/phase2-web/database-schema/plan.md §Database
"""Async database connection for Neon Serverless PostgreSQL.

Provides:
- Async engine with connection pooling
- Async session factory
- FastAPI dependency for session injection
- App lifespan for table creation and cleanup
"""

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session.

    Usage:
        @router.get("/tasks")
        async def list_tasks(session: AsyncSession = Depends(get_session)):
            ...
    """
    async with async_session_factory() as session:
        yield session


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App lifespan: create tables on startup, dispose engine on shutdown."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    await engine.dispose()
```

## Key Points

- `load_dotenv()` loads `.env` file for `DATABASE_URL`
- `pool_pre_ping=True` handles Neon cold starts (detects stale connections)
- `expire_on_commit=False` prevents `MissingGreenlet` errors in async context
- `get_session` is an async generator — FastAPI auto-closes via `Depends()`
- `lifespan` uses `run_sync` to bridge sync SQLModel metadata into async
- Engine disposed on shutdown to clean up connection pool
- `pool_size=5` + `max_overflow=10` — conservative for Neon free tier
