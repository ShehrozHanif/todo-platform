# [Task]: T008-T010 [From]: specs/phase2-web/database-schema/spec.md §Dependencies
# Async database engine, session factory, and FastAPI lifespan.
# Spec: contracts/db-operations.md §Session Contract | research.md R3, R7

import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

_log = logging.getLogger(__name__)

from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

load_dotenv()

# Module-level engine — lazily initialized via get_engine()
_engine: AsyncEngine | None = None


def get_engine() -> AsyncEngine:
    """
    Return the shared async engine, building it on first call.
    DATABASE_URL must be set in the environment before first call.
    R7: Neon-appropriate pool settings prevent stale connection errors.
    """
    global _engine
    if _engine is None:
        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            raise ValueError(
                "DATABASE_URL environment variable is not set. "
                "Copy .env.example to .env and fill in your Neon connection string."
            )
        _engine = _build_engine(database_url)
    return _engine


def set_engine(engine: AsyncEngine) -> None:
    """Override the module-level engine (used in tests)."""
    global _engine
    _engine = engine


def _build_engine(database_url: str) -> AsyncEngine:
    """
    Build async engine with driver-appropriate settings.
    SQLite (tests) vs asyncpg (Neon production) handled via is_sqlite flag.
    asyncpg does not accept sslmode= as a URL param — SSL passed via connect_args.
    """
    is_sqlite = database_url.startswith("sqlite")

    if is_sqlite:
        connect_args: dict = {"check_same_thread": False}
        kwargs: dict = {"echo": False, "connect_args": connect_args}
    else:
        # Strip sslmode/channel_binding query params — asyncpg rejects them.
        # SSL is enforced via connect_args instead.
        from urllib.parse import urlparse, urlencode, parse_qs, urlunparse

        parsed = urlparse(database_url)
        params = parse_qs(parsed.query, keep_blank_values=True)
        params.pop("sslmode", None)
        params.pop("channel_binding", None)
        clean_url = urlunparse(parsed._replace(query=urlencode(params, doseq=True)))

        connect_args = {"ssl": "require"}
        kwargs = {
            "echo": False,
            "connect_args": connect_args,
            "pool_pre_ping": True,
            "pool_size": 5,
            "max_overflow": 10,
            "pool_recycle": 300,
        }
        database_url = clean_url

    return create_async_engine(database_url, **kwargs)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: yields an AsyncSession, commits on success, rolls back on error.
    contracts/db-operations.md §get_session
    """
    engine = get_engine()
    async with AsyncSession(engine, expire_on_commit=False) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    """
    FastAPI lifespan: create only app-owned tables on startup.
    The 'user' table is owned and created by Better Auth (Next.js side).
    We only create 'task' — no FK dependency on user table ordering.
    contracts/db-operations.md §lifespan | research.md R5
    Phase 5 (Dapr): load secrets before engine init so DATABASE_URL is available.
    """
    import asyncio

    # Phase 5 (Dapr US4): load secrets from Dapr sidecar, inject into os.environ.
    # Fail-open: if sidecar unavailable, python-dotenv .env values are used instead.
    # Fail-fast: get_engine() raises ValueError if DATABASE_URL still missing.
    # Only attempt Dapr secrets when DAPR_ENABLED=true (sidecar present).
    if os.getenv("DAPR_ENABLED", "false").lower() == "true":
        from sidecar.secrets import inject_secrets, load_secrets_from_dapr
        secrets = await asyncio.to_thread(load_secrets_from_dapr)
        inject_secrets(secrets)

    from models import Task, Conversation, Message  # noqa: F401

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Task.__table__.create, checkfirst=True)  # type: ignore[attr-defined]
        await conn.run_sync(Conversation.__table__.create, checkfirst=True)  # type: ignore[attr-defined]
        await conn.run_sync(Message.__table__.create, checkfirst=True)  # type: ignore[attr-defined]

    # Phase 5: Add new columns to existing Neon DB (PostgreSQL only).
    # SQLite (tests) gets them via create_all since the model already has them.
    if "sqlite" not in str(engine.url):
        await _migrate_task_columns(engine)

    # Phase 5: Kafka producer lifecycle (FR-017, FR-006)
    # Fail-open: if Kafka is unavailable, app still starts and serves requests.
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")
    if bootstrap:
        try:
            from kafka.topics import create_topics
            from kafka.producer import init_producer
            await create_topics(bootstrap)
            await init_producer()
        except Exception as exc:
            _log.warning("Kafka setup failed — events disabled: %s", exc)

    # Phase 5 (Dapr US2): register reminder-scan job with Dapr Jobs API.
    # Only attempt when DAPR_ENABLED=true (sidecar present).
    if os.getenv("DAPR_ENABLED", "false").lower() == "true":
        try:
            from sidecar.jobs import register_reminder_job
            await register_reminder_job()
        except ImportError:
            pass  # sidecar.jobs not yet available — will be created in T015
        except Exception as exc:
            _log.warning("Dapr job registration failed: %s", exc)

    yield

    # Phase 5: Kafka producer shutdown
    try:
        from kafka.producer import shutdown_producer
        await shutdown_producer()
    except Exception:
        pass

    await engine.dispose()
    set_engine(None)  # type: ignore[arg-type]


async def _migrate_task_columns(engine: AsyncEngine) -> None:
    """Phase 5: Add new columns to existing task table (PostgreSQL only)."""
    statements = [
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS priority VARCHAR(6)",
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS category VARCHAR(50)",
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS tags TEXT",
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS due_date DATE",
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS due_time VARCHAR(5)",
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS recurring VARCHAR(7)",
        "ALTER TABLE task ADD COLUMN IF NOT EXISTS reminder BOOLEAN DEFAULT false",
        "CREATE INDEX IF NOT EXISTS ix_task_priority ON task (priority)",
    ]
    async with engine.begin() as conn:
        for sql in statements:
            await conn.execute(text(sql))
