# Plan: MCP Server — Architecture & Design

**Feature:** MCP Server for AI-driven task management
**Phase:** 3 — AI Chatbot
**Plan Location:** `specs/phase3-chatbot/mcp-server/`
**Date:** 2026-02-23

---

## 1. Key Decisions

### 1.1 Transport: SSE (not stdio)

**Decision:** Use SSE transport for the MCP server.

**Rationale:**
- stdio requires the AI agent and MCP server to run as parent/child processes
- SSE allows the MCP server to run as a standalone HTTP service on Render
- The AI Agent (Feature 2) will connect to the MCP server over HTTP
- `streamable-http` is newer but SSE has broader compatibility and more docs

### 1.2 Database: Direct async connection (not HTTP calls to FastAPI)

**Decision:** The MCP server connects directly to Neon DB, not through the FastAPI REST API.

**Rationale:**
- Avoids an extra HTTP hop (MCP → FastAPI → DB vs MCP → DB)
- Lower latency
- No dependency on FastAPI being up
- Same SQLModel/SQLAlchemy patterns, just a separate connection pool

### 1.3 Model Reuse: Copy pattern, don't import from core/

**Decision:** The MCP server has its own `models.py` and `db.py`, copied from the backend pattern.

**Rationale:**
- `core/` was designed for Phase 1 CLI (in-memory dict storage)
- The backend uses SQLModel which `core/` doesn't have
- Keeping the MCP server self-contained avoids import path issues across different deploy targets
- The model is simple (one table) — copying 20 lines is cleaner than cross-package imports
- When deployed on Render, the MCP server is a separate service anyway

### 1.4 User Validation: Check user exists in DB

**Decision:** Before any tool call, verify the `user_id` exists in the `user` table.

**Rationale:**
- Prevents creating orphan tasks for non-existent users
- Cheap query (PK lookup, cached by DB)
- Better error messages for the AI agent

### 1.5 Connection Pool: Limited to 5 connections

**Decision:** MCP server pool limited to `max_size=5`.

**Rationale:**
- Neon free tier has ~100 connection limit
- FastAPI backend uses some, Better Auth uses some
- MCP server is single-purpose, doesn't need many concurrent connections
- Can increase later if needed

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────┐
│          MCP Server (Render)       │
│                                    │
│  ┌──────────┐    ┌──────────────┐  │
│  │ FastMCP  │    │   db.py      │  │
│  │ server   │───▶│ async engine │──┼──▶ Neon PostgreSQL
│  └────┬─────┘    │ session mgr  │  │
│       │          └──────────────┘  │
│  ┌────┴─────┐                      │
│  │ 5 Tools  │                      │
│  │ add      │                      │
│  │ list     │                      │
│  │ complete │                      │
│  │ delete   │                      │
│  │ update   │                      │
│  └──────────┘                      │
└────────────────────────────────────┘
        ▲
        │ SSE (HTTP)
        │
┌───────┴────────┐
│   AI Agent     │
│  (Feature 2)   │
└────────────────┘
```

### 2.2 File Structure

```
agents/
  mcp-server/
    server.py           ← FastMCP instance + 5 tool handlers
    db.py               ← get_engine(), get_session() async context manager
    models.py           ← SQLModel Task + User models
    pyproject.toml      ← Project config + dependencies
    .env.example        ← DATABASE_URL placeholder
```

### 2.3 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| MCP SDK | `mcp[cli]` | 1.7.x |
| ORM | `sqlmodel` | 0.0.22+ |
| Async DB | `sqlalchemy[asyncio]` | 2.x |
| PG Driver | `asyncpg` | 0.30+ |
| Python | 3.13+ | (matches backend) |
| Package Manager | `uv` | (matches backend) |

---

## 3. Tool Implementation Pattern

Each tool follows this pattern:

```python
@mcp.tool()
async def tool_name(user_id: str, ...) -> str:
    """Tool description for AI agent."""
    async with get_session() as session:
        # 1. Validate user exists
        user = await session.get(User, user_id)
        if not user:
            return json.dumps({"error": "User not found"})

        # 2. Perform operation
        ...

        # 3. Return JSON result
        return json.dumps(result)
```

**Key patterns:**
- All tools return JSON strings (MCP tools return text)
- Errors return `{"error": "message"}` — not exceptions
- User validation on every call
- Async session with auto-commit

---

## 4. Database Session Management

```python
# db.py
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlmodel import SQLModel

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        url = os.environ["DATABASE_URL"]
        # Convert postgres:// to postgresql+asyncpg://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        _engine = create_async_engine(url, pool_size=5, max_overflow=0)
    return _engine

@asynccontextmanager
async def get_session():
    async with AsyncSession(get_engine()) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

---

## 5. Deployment Plan

### Local Development
```bash
cd agents/mcp-server
uv run server.py
```
Runs on SSE transport, connects to Neon DB via `DATABASE_URL` in `.env`.

### Production (Render)
- **Service type:** Web Service (Python)
- **Build command:** `pip install -e .` or `uv sync`
- **Start command:** `python server.py`
- **Environment variables:** `DATABASE_URL` (same Neon connection string)
- **Port:** Default SSE port (auto-assigned by Render)

---

## 6. Error Handling Strategy

| Scenario | Response |
|----------|----------|
| User not found | `{"error": "User not found"}` |
| Task not found | `{"error": "Task not found"}` |
| Validation error | `{"error": "<specific message>"}` |
| DB connection error | `{"error": "Database connection failed"}` |
| Unexpected error | `{"error": "An unexpected error occurred"}` + log full traceback |

No unhandled exceptions. All errors are caught and returned as JSON strings.

---

## 7. Testing Strategy

### Manual Testing
- Start MCP server locally
- Use MCP Inspector tool (`mcp dev server.py`) to test each tool
- Verify tasks appear in web dashboard after `add_task`

### Integration Testing
- Python test file using `mcp` client SDK
- Tests for each tool: happy path + error cases
- Verify DB state after each operation

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Neon connection limit hit | Tools fail with DB errors | Pool limited to 5, monitor usage |
| Stale data if web + MCP update same task | Minor — last write wins | Acceptable for hackathon |
| MCP SDK breaking changes | Build fails | Pin to `mcp>=1.7,<2.0` |
