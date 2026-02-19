# Quickstart: Database Schema Feature

**Feature**: database-schema | **Branch**: 001-neon-database-schema

## Prerequisites

- Python 3.13+ installed
- UV package manager installed
- Neon PostgreSQL account (for production; tests use SQLite)

## Setup

```bash
# 1. Navigate to backend directory
cd backend/

# 2. Initialize project (if not already)
uv init

# 3. Install dependencies
uv add fastapi uvicorn sqlmodel asyncpg python-dotenv pydantic-settings
uv add --dev pytest pytest-asyncio pytest-cov aiosqlite httpx

# 4. Create .env file from template
cp .env.example .env
# Edit .env with your Neon connection string
```

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/todo_db?sslmode=require
```

## Run Tests

```bash
# Run all tests
uv run pytest -v

# Run with coverage
uv run pytest --cov=backend --cov-report=term-missing
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/models.py` | User + Task SQLModel table models |
| `backend/db.py` | Async engine, session factory, lifespan |
| `backend/tests/conftest.py` | Async SQLite fixtures for testing |
| `backend/tests/test_models.py` | Model + database operation tests |
| `backend/pyproject.toml` | Dependencies and pytest config |
| `backend/.env.example` | Environment variable template |

## Verify

After implementation, these should pass:

```bash
uv run pytest -v                    # All tests green
uv run pytest --cov=backend         # 90%+ coverage on models.py, db.py
```
