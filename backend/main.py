# [Task]: T003/T011 [From]: specs/phase2-web/rest-api/spec.md §FR-008
# FastAPI application with CORS, lifespan, and task routes.

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import lifespan
from routes.tasks import router as tasks_router
from routes.chat import router as chat_router

load_dotenv()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Todo Platform API",
        version="0.1.0",
        description="Phase II — FastAPI + SQLModel + Neon DB",
        lifespan=lifespan,
    )

    # FR-008: CORS — origins from env, defaults to localhost:3000
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
    app.include_router(chat_router, prefix="/api")

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        """Health check endpoint — useful for k8s liveness probes (Phase IV)."""
        return {"status": "ok"}

    return app


app = create_app()
