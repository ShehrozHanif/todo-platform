# [Task]: T002 [From]: specs/phase3-chatbot/mcp-server/plan.md §Database
# Async DB engine + session context manager for MCP server.
# Reuses the same Neon PostgreSQL database as the Phase 2 backend.
# Matches backend/db.py SSL handling pattern for asyncpg compatibility.
import os
from contextlib import asynccontextmanager
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

load_dotenv()

_engine = None


def get_engine():
    """Lazy singleton async engine with pool_size=5."""
    global _engine
    if _engine is None:
        url = os.environ["DATABASE_URL"]

        # Convert to asyncpg driver format
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # Strip sslmode/channel_binding — asyncpg rejects them as URL params.
        # SSL is enforced via connect_args instead.
        parsed = urlparse(url)
        params = parse_qs(parsed.query, keep_blank_values=True)
        params.pop("sslmode", None)
        params.pop("channel_binding", None)
        clean_url = urlunparse(parsed._replace(query=urlencode(params, doseq=True)))

        _engine = create_async_engine(
            clean_url,
            pool_size=5,
            max_overflow=0,
            pool_pre_ping=True,
            connect_args={"ssl": "require"},
        )
    return _engine


@asynccontextmanager
async def get_session():
    """Yield an async session that auto-commits on success, rolls back on error."""
    async with AsyncSession(get_engine(), expire_on_commit=False) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
