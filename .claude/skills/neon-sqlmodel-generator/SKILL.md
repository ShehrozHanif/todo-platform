---
name: neon-sqlmodel-generator
description: |
  Generate SQLModel database models and async Neon PostgreSQL connection for FastAPI backends.
  This skill should be used when users ask to create database schemas, SQLModel models,
  Neon DB connections, or async database layers for Python FastAPI applications.
---

# Neon SQLModel Generator

Generate a **production-quality async database layer** for FastAPI using SQLModel + Neon Serverless PostgreSQL. Encodes proven patterns for model design, async connection management, session handling, and test fixtures.

## What This Skill Does

- Creates SQLModel table models with proper field types, indexes, and relationships
- Generates async database connection module with Neon-optimized pooling
- Produces FastAPI dependency injection for async sessions
- Sets up app lifespan for table creation
- Provides TDD test patterns using SQLite async in-memory DB

## What This Skill Does NOT Do

- Run database migrations (use Alembic separately)
- Create API routes or endpoints (see `fastapi-crud-generator`)
- Handle authentication logic (see `better-auth-jwt-generator`)
- Deploy or provision Neon databases
- Generate frontend code

---

## Before Implementation

Gather context to ensure successful implementation:

| Source | Gather |
|--------|--------|
| **Codebase** | Existing `backend/` structure, any existing models or config |
| **Conversation** | User's specific model fields, relationships, constraints |
| **Skill References** | SQLModel patterns from `references/sqlmodel-patterns.md`, Neon config from `references/neon-async.md` |
| **User Guidelines** | Project constitution, AGENTS.md conventions, task IDs to reference |

Ensure all required context is gathered before implementing.
Only ask user for THEIR specific model requirements (domain expertise is in this skill).

---

## Implementation Steps

Execute in this exact order. Write tests FIRST (RED), then implementation (GREEN) for each phase.

### Phase 1: Backend Project Setup

1. Run `uv init` in `backend/` if pyproject.toml doesn't exist
2. Add dependencies — see [templates/pyproject-backend.md](templates/pyproject-backend.md)
3. Create directory structure:
   ```
   backend/
   ├── __init__.py
   ├── models.py          # SQLModel table models
   ├── db.py              # Async engine, session, lifespan
   ├── .env.example        # Environment variable template
   ├── tests/
   │   ├── __init__.py
   │   ├── conftest.py     # Async DB fixtures
   │   └── test_models.py  # Model + DB tests
   └── pyproject.toml
   ```
4. Create `.env.example` with `DATABASE_URL` placeholder

### Phase 2: Model Layer (RED → GREEN)

1. Write tests in `backend/tests/test_models.py` — see [templates/test-patterns.md](templates/test-patterns.md)
   - Task model instantiation (all fields)
   - Task default values (completed=False, timestamps auto-set)
   - Task field constraints (title max length, description nullable)
   - User model instantiation
   - User email uniqueness constraint
   - Foreign key relationship (Task.user_id → User.id)
2. Write async test fixtures in `backend/tests/conftest.py` — see [templates/test-fixtures.md](templates/test-fixtures.md)
3. Implement models in `backend/models.py` — see [templates/sqlmodel-models.md](templates/sqlmodel-models.md)
4. Run `uv run pytest -v` — verify all model tests pass

### Phase 3: Database Connection (RED → GREEN)

1. Write tests for DB connection in `backend/tests/test_models.py`:
   - Session creates and closes properly
   - Can insert and query a Task via async session
   - Can insert and query a User via async session
   - Relationship: query tasks by user_id
2. Implement `backend/db.py` — see [templates/db-connection.md](templates/db-connection.md)
3. Run `uv run pytest -v` — verify all tests pass

### Phase 4: Final Verification

1. Run `uv run pytest --cov=backend --cov-report=term-missing`
2. Verify 90%+ coverage on models.py and db.py
3. Verify `.env.example` is correct

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | SQLModel | Combines SQLAlchemy + Pydantic; FastAPI native |
| Async driver | asyncpg | Best performance for PostgreSQL async |
| Test DB | SQLite aiosqlite | Fast, no external deps, in-memory isolation |
| Session pattern | Async contextmanager + DI | FastAPI dependency injection, auto-cleanup |
| Timestamps | `func.now()` server defaults | DB-level consistency, not app-level |
| user_id type | `str` | Better Auth generates string UUIDs |
| Indexes | user_id + completed | Query patterns: filter by user, filter by status |

---

## Critical Invariants

- `DATABASE_URL` must come from environment variable, NEVER hardcoded
- All DB operations are `async` — no sync SQLAlchemy calls
- Test fixtures use SQLite async, NEVER hit Neon in tests
- `user_id` is `str` (not int) — Better Auth compatibility
- `created_at` and `updated_at` use server-side defaults
- `get_session` is an async generator for FastAPI `Depends()`
- Models use `table=True` in SQLModel for actual DB tables

---

## Output Specification

| File | Purpose | Template |
|------|---------|----------|
| `backend/models.py` | Task + User SQLModel classes | [templates/sqlmodel-models.md](templates/sqlmodel-models.md) |
| `backend/db.py` | Async engine, session factory, lifespan | [templates/db-connection.md](templates/db-connection.md) |
| `backend/pyproject.toml` | Dependencies + pytest config | [templates/pyproject-backend.md](templates/pyproject-backend.md) |
| `backend/.env.example` | Environment variable template | See below |
| `backend/tests/conftest.py` | Async fixtures, test DB session | [templates/test-fixtures.md](templates/test-fixtures.md) |
| `backend/tests/test_models.py` | Model + DB integration tests | [templates/test-patterns.md](templates/test-patterns.md) |

### .env.example content:
```env
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.us-east-2.aws.neon.tech/todo_db?sslmode=require
```

---

## Domain Standards

### Must Follow
- [ ] All models inherit from `SQLModel` with `table=True`
- [ ] Async engine created with `create_async_engine`
- [ ] Sessions via `async_sessionmaker` (not deprecated `sessionmaker`)
- [ ] `get_session` as async generator yielding `AsyncSession`
- [ ] Neon requires `sslmode=require` in connection string
- [ ] Field validators use Pydantic v2 `field_validator`

### Must Avoid
- Sync database calls (no `create_engine`, no `Session`)
- Hardcoded connection strings
- `session.commit()` without error handling
- Missing indexes on frequently queried columns
- Using `datetime.now()` in Python instead of DB `func.now()`
- `Optional` from typing (use `str | None` syntax)

---

## Output Checklist

Before delivering, verify:
- [ ] `backend/models.py` — Task + User models with all fields, indexes, relationships
- [ ] `backend/db.py` — Async engine, session factory, get_session, lifespan
- [ ] `backend/pyproject.toml` — All dependencies listed
- [ ] `backend/.env.example` — DATABASE_URL template
- [ ] `backend/tests/conftest.py` — Async fixtures with SQLite
- [ ] `backend/tests/test_models.py` — All model tests passing
- [ ] All tests use async SQLite (no Neon dependency)
- [ ] Coverage ≥ 90% on models.py and db.py
- [ ] No hardcoded secrets or connection strings
- [ ] Every file has Task ID comment referencing specs

---

## Reference Files

| File | When to Read |
|------|--------------|
| `references/sqlmodel-patterns.md` | SQLModel field types, relationships, validators |
| `references/neon-async.md` | Neon connection string format, pooling, SSL config |
| `templates/sqlmodel-models.md` | Exact model code template |
| `templates/db-connection.md` | Exact db.py code template |
| `templates/pyproject-backend.md` | Backend dependency configuration |
| `templates/test-fixtures.md` | pytest-asyncio fixture patterns |
| `templates/test-patterns.md` | Model and DB test examples |
