# Neon Serverless PostgreSQL — Async Connection Reference

## Connection String Format

```
postgresql+asyncpg://username:password@ep-XXXX.region.aws.neon.tech/dbname?sslmode=require
```

| Component | Example | Notes |
|-----------|---------|-------|
| Driver | `postgresql+asyncpg` | Must use asyncpg for async SQLAlchemy |
| Host | `ep-cool-rain-123456.us-east-2.aws.neon.tech` | From Neon dashboard |
| Database | `todo_db` | Create in Neon console |
| SSL | `?sslmode=require` | **Required** for Neon — connection fails without it |

## Async Engine Creation

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    echo=False,        # Set True for SQL logging in dev
    pool_pre_ping=True  # Detect stale connections (Neon cold starts)
)
```

### Key Engine Options for Neon

| Option | Value | Why |
|--------|-------|-----|
| `pool_pre_ping` | `True` | Neon suspends idle connections; pre-ping detects stale ones |
| `pool_size` | `5` | Neon free tier has limited connections |
| `max_overflow` | `10` | Allow burst connections |
| `pool_recycle` | `300` | Recycle connections every 5 min (Neon timeout) |
| `echo` | `False` | Disable SQL logging in production |

## Async Session Factory

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False  # Prevent lazy-load issues in async context
)
```

**`expire_on_commit=False`** is critical for async — without it, accessing attributes after commit raises `MissingGreenlet` errors.

## FastAPI Dependency Injection

```python
from collections.abc import AsyncGenerator

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
```

Usage in routes:
```python
from fastapi import Depends

@router.get("/tasks")
async def list_tasks(session: AsyncSession = Depends(get_session)):
    ...
```

## App Lifespan (Table Creation)

```python
from contextlib import asynccontextmanager
from sqlmodel import SQLModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
```

**`run_sync`** bridges sync SQLModel metadata operations into the async context.

## Neon-Specific Considerations

### Cold Starts
Neon suspends compute after ~5 minutes of inactivity. First connection after suspension takes 2-5 seconds. Mitigate with:
- `pool_pre_ping=True` on engine
- Frontend loading states during first request

### SSL Required
Neon ALWAYS requires SSL. The connection string must include `?sslmode=require`.

### Connection Limits
- Free tier: ~100 connections
- Use pooling and keep `pool_size` reasonable (5-10)

### Branching (Advanced)
Neon supports database branching for dev/staging, but that's out of scope for this skill.

## Environment Variable Loading

```python
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
```

Or with pydantic-settings:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str

    class Config:
        env_file = ".env"

settings = Settings()
```

## Testing with SQLite Async (NOT Neon)

Tests must NEVER hit Neon. Use SQLite with aiosqlite:

```python
TEST_DATABASE_URL = "sqlite+aiosqlite://"  # In-memory

test_engine = create_async_engine(TEST_DATABASE_URL, echo=True)
```

This requires `aiosqlite` as a dev dependency.
