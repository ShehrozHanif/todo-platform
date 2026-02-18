# App Factory Template

## backend/main.py

```python
# [Task]: T00X [From]: specs/phase2-web/rest-api/plan.md §AppFactory
"""FastAPI application factory for the Todo Platform backend.

Wires together: CORS → Lifespan → Router → Health check.
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db import lifespan
from backend.routes.tasks import router as tasks_router

load_dotenv()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Todo Platform API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS — origins from env, defaults to localhost:3000
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in origins],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(tasks_router, prefix="/api")

    # Health check
    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    return app


app = create_app()
```

## Key Points

- `create_app()` factory pattern — testable, importable
- `app = create_app()` at module level — uvicorn finds it as `backend.main:app`
- CORS origins from `ALLOWED_ORIGINS` env var, comma-separated
- `lifespan` imported from `db.py` — handles table creation + engine disposal
- Tasks router mounted at `/api` prefix — endpoints become `/api/{user_id}/tasks`
- Health check at `/health` — useful for k8s liveness probes later (Phase 4)

## Running the Server

```bash
# Development
cd backend
uv run uvicorn backend.main:app --reload --port 8000

# Or from project root
uv run uvicorn backend.main:app --reload --port 8000 --app-dir backend
```

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.us-east-2.aws.neon.tech/todo_db?sslmode=require
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```
