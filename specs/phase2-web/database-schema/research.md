# Research: Neon Database Schema

**Feature**: database-schema | **Branch**: 001-neon-database-schema | **Date**: 2026-02-19

## R1: Async PostgreSQL Driver for SQLModel

**Decision**: asyncpg via `postgresql+asyncpg://` connection string
**Rationale**: asyncpg is the fastest async PostgreSQL driver for Python, natively supported by SQLAlchemy's async engine. SQLModel builds on SQLAlchemy, so this is the standard choice.
**Alternatives considered**:
- `psycopg3` (async mode) — viable but less mature async ecosystem with SQLAlchemy
- `aiopg` — deprecated in favor of asyncpg

## R2: Test Database Strategy

**Decision**: SQLite with aiosqlite (in-memory) for all tests
**Rationale**: Tests must never hit Neon (external dependency, slow, costs money). SQLite in-memory is instant, isolated per test session, and supports the same async patterns via aiosqlite driver.
**Alternatives considered**:
- PostgreSQL Docker container — heavier, slower CI, but more realistic
- Neon branching — overkill for unit/integration tests, adds latency

## R3: Session Management Pattern

**Decision**: `async_sessionmaker` + async generator for FastAPI dependency injection
**Rationale**: `async_sessionmaker` is the current SQLAlchemy 2.0+ recommended pattern (not the deprecated `sessionmaker`). Async generator with `yield` ensures proper session cleanup via FastAPI's DI lifecycle.
**Alternatives considered**:
- Manual session creation in each route — repetitive, error-prone cleanup
- Middleware-based session — too broad, harder to test

## R4: Timestamp Strategy

**Decision**: Server-side defaults using SQLAlchemy `func.now()` via `sa_column`
**Rationale**: DB-level timestamps are consistent across all app instances and immune to app-level clock drift. `onupdate=func.now()` handles automatic update timestamps.
**Alternatives considered**:
- Python `datetime.now()` in defaults — app-level, inconsistent across instances
- Trigger-based — more complex, harder to test with SQLite

## R5: Table Creation Strategy

**Decision**: Programmatic via `SQLModel.metadata.create_all` in FastAPI lifespan
**Rationale**: Simple, fits the hackathon scope. Tables created at app startup. No migration tracking needed since we're building from scratch.
**Alternatives considered**:
- Alembic migrations — proper for production but out of scope per spec
- Raw SQL scripts — less maintainable, duplicates model definitions

## R6: User ID Type

**Decision**: `str` (not `int`) for user_id fields
**Rationale**: Better Auth generates UUID-style string identifiers. Using `str` ensures compatibility without type conversion at the API layer.
**Alternatives considered**:
- `int` — would require mapping/conversion from Better Auth's string IDs
- `UUID` type — more specific but adds complexity with SQLite test compatibility

## R7: Connection Pooling for Neon

**Decision**: `pool_pre_ping=True`, `pool_size=5`, `max_overflow=10`, `pool_recycle=300`
**Rationale**: Neon suspends idle compute after ~5 minutes. `pool_pre_ping` detects stale connections. Small pool size respects Neon free tier limits (~100 connections). Recycle at 5 minutes matches Neon's timeout.
**Alternatives considered**:
- No pooling config — would hit stale connection errors after Neon cold starts
- External connection pooler (PgBouncer) — overkill for this phase
