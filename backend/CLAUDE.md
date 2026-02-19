# Backend — Claude Code Guidelines

## Stack

- **Runtime**: Python 3.13+ with UV package manager
- **Framework**: FastAPI with async/await throughout
- **ORM**: SQLModel (SQLAlchemy 2.x async)
- **Database**: Neon PostgreSQL via asyncpg (production), SQLite aiosqlite (tests)
- **Auth**: PyJWT HS256 verification middleware (tokens issued by frontend)
- **Testing**: pytest + pytest-asyncio + httpx AsyncClient

## Project Structure

```
backend/
├── main.py              # FastAPI app, CORS, lifespan, router mount
├── models.py            # SQLModel table definitions (User, Task)
├── schemas.py           # Pydantic request/response schemas
├── db.py                # Async engine, session factory, lifespan
├── routes/
│   └── tasks.py         # 6 CRUD endpoints under /api/{user_id}/tasks
├── middleware/
│   └── auth.py          # JWT verification + user isolation
├── tests/
│   ├── conftest.py      # Async fixtures, test DB, auth helpers
│   ├── test_routes.py   # Endpoint integration tests (24+)
│   ├── test_auth.py     # JWT middleware tests (14)
│   └── test_models.py   # Model validation tests
├── pyproject.toml       # Dependencies and tool config
└── .env.example         # Environment variable template
```

## Key Patterns

- **All routes require auth**: Every task endpoint uses `Depends(verify_user_access)` which validates JWT and enforces user isolation (`sub` == URL `{user_id}`).
- **Health check is public**: `GET /health` has no auth dependency.
- **Session management**: `get_session()` auto-commits on success, auto-rollbacks on error.
- **Table ownership**: Backend only creates the `task` table. Better Auth (frontend) owns `user`, `session`, `account`, `verification`, `jwks`.
- **SSL handling**: asyncpg cannot accept `sslmode=` URL params. `db.py` strips these and passes `connect_args={"ssl": "require"}`.

## Commands

```bash
# Install dependencies
uv sync

# Run dev server
uv run uvicorn main:app --reload --port 8000

# Run tests
uv run pytest -v

# Run tests with coverage
uv run pytest --cov=. --cov-report=term-missing
```

## Environment Variables

| Variable             | Required | Example                                    |
|----------------------|----------|--------------------------------------------|
| `DATABASE_URL`       | Yes      | `postgresql+asyncpg://user:pass@host/db`   |
| `BETTER_AUTH_SECRET` | Yes      | Random 32+ character string                |
| `ALLOWED_ORIGINS`    | No       | `http://localhost:3000` (CORS)             |

## Conventions

- Every code file must have a `# [Task]: Txxx [From]: specs/...` comment header linking to the spec.
- Use type hints on all function signatures.
- No hardcoded secrets — always use environment variables via `.env`.
- Prefer `Depends()` for dependency injection over manual instantiation.
- Test files mirror source files: `routes/tasks.py` -> `tests/test_routes.py`.
