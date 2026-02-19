# Implementation Plan: Database Schema — Neon PostgreSQL + SQLModel

**Branch**: `001-neon-database-schema` | **Date**: 2026-02-19 | **Spec**: specs/phase2-web/database-schema/spec.md

## Summary

Define SQLModel table models for User and Task entities with async Neon PostgreSQL connectivity via asyncpg. Provides the persistent data layer that all subsequent Phase 2 features (API, Auth, Frontend) depend on.

## Technical Context

**Language/Version**: Python 3.13+
**Primary Dependencies**: SQLModel 0.0.22+, SQLAlchemy 2.x (async), asyncpg, python-dotenv
**Storage**: Neon PostgreSQL (production) / SQLite aiosqlite (tests)
**Testing**: pytest + pytest-asyncio with in-memory SQLite
**Constraints**: No Alembic migrations — tables created programmatically at startup via lifespan

## Architecture

### Directory Structure

```
backend/
├── models.py          ← User + Task SQLModel tables
├── schemas.py         ← TaskCreate, TaskUpdate, TaskRead Pydantic models
├── db.py              ← Async engine, get_session, lifespan
├── main.py            ← FastAPI app wiring
├── .env.example       ← DATABASE_URL template
├── .gitignore         ← .env, __pycache__, .venv
└── tests/
    ├── conftest.py    ← SQLite in-memory fixtures
    ├── test_models.py ← Model validation tests
    └── __init__.py
```

### Key Decisions

1. **SQLModel over raw SQLAlchemy**: Combines Pydantic validation with SQLAlchemy ORM — single model definition serves both DB and API layers.
2. **Async engine with asyncpg**: Non-blocking I/O for Neon serverless PostgreSQL. Pool settings tuned for serverless (pool_pre_ping, pool_recycle=300).
3. **SSL via connect_args**: asyncpg rejects `sslmode=` URL params — SSL enforced via `connect_args={"ssl": "require"}` after stripping URL query params.
4. **User table defined but not created by backend**: Better Auth (Next.js) owns the user table lifecycle. Backend lifespan only creates the Task table with `checkfirst=True`.
5. **No FK constraint on Task.user_id**: Removed to avoid ordering dependency between Better Auth's user table creation and backend's task table creation. User isolation enforced at the API/middleware layer instead.
6. **SQLite for tests**: Fast, in-memory, no external dependencies. Test fixtures override `get_session` to use SQLite engine.

### Data Model

#### User Table (owned by Better Auth)

| Column     | Type                  | Constraints                    |
|------------|-----------------------|--------------------------------|
| id         | str (PK)              | Primary key, UUID from auth    |
| email      | str                   | UNIQUE, NOT NULL, indexed      |
| name       | str                   | NOT NULL                       |
| created_at | DateTime(timezone=TZ) | server_default=func.now()      |

#### Task Table (owned by backend)

| Column      | Type                  | Constraints                              |
|-------------|-----------------------|------------------------------------------|
| id          | int (PK)              | Auto-increment                           |
| user_id     | str                   | NOT NULL, indexed                        |
| title       | str(200)              | NOT NULL, max_length=200                 |
| description | str(1000) or NULL     | Optional, max_length=1000                |
| completed   | bool                  | NOT NULL, default=False, indexed         |
| created_at  | DateTime(timezone=TZ) | server_default=func.now()                |
| updated_at  | DateTime(timezone=TZ) | server_default=func.now(), onupdate=now()|

### Connection Architecture

```
Environment (.env)
    ↓
DATABASE_URL (postgresql+asyncpg://...)
    ↓
_build_engine() — strips sslmode/channel_binding, adds connect_args
    ↓
AsyncEngine (pool_size=5, max_overflow=10, pool_recycle=300)
    ↓
get_session() — yields AsyncSession per request
    ↓
lifespan() — creates Task table on startup, disposes engine on shutdown
```

## Error Taxonomy

| Scenario                  | Handling                                    |
|---------------------------|---------------------------------------------|
| DATABASE_URL not set      | ValueError raised at engine initialization  |
| Connection failure        | asyncpg.PostgresError propagated            |
| Title empty/too long      | Pydantic validation in schemas.py           |
| Duplicate email           | IntegrityError from UNIQUE constraint       |
| Session error             | Auto-rollback in get_session()              |

## Testing Strategy

- **Unit tests**: Model field validation (title length, defaults, timestamps)
- **Integration tests**: CRUD operations via async session against SQLite
- **Isolation tests**: Multi-user queries return only owned tasks
- **Edge case tests**: Empty title, max-length fields, missing user_id
- **Target**: 90%+ coverage on models.py + db.py
