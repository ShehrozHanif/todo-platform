# Backend pyproject.toml Template

## backend/pyproject.toml

```toml
[project]
name = "todo-backend"
version = "0.1.0"
description = "FastAPI backend for Todo Platform — Phase 2"
readme = "README.md"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlmodel>=0.0.22",
    "asyncpg>=0.30.0",
    "python-dotenv>=1.0.0",
    "pydantic-settings>=2.6.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=6.0.0",
    "aiosqlite>=0.20.0",
    "httpx>=0.28.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
asyncio_mode = "auto"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

## Key Points

- `sqlmodel>=0.0.22` — latest with Pydantic v2 support
- `asyncpg` — async PostgreSQL driver for Neon
- `aiosqlite` — dev only, used for SQLite async test fixtures
- `pytest-asyncio` with `asyncio_mode = "auto"` — no need for `@pytest.mark.asyncio` on every test
- `httpx` — dev only, used for FastAPI integration tests (TestClient)
- `pythonpath = ["."]` — enables `from backend.models import ...` style imports
