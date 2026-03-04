# [Task]: T003/T011/T017 [From]: specs/phase2-web/rest-api/spec.md §FR-008, specs/phase5-cloud/cloud-deployment/spec.md §FR-011
# FastAPI application with CORS, lifespan, task routes, and Prometheus metrics.

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from db import lifespan
from routes.tasks import router as tasks_router
from routes.chat import router as chat_router
from routes.chatkit import router as chatkit_router
from routes.jobs import router as jobs_router

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
    app.include_router(chatkit_router)
    # Dapr Jobs callback — no prefix; Dapr calls /job/reminder-scan at app root
    app.include_router(jobs_router)

    @app.get("/health")
    async def health_check() -> dict[str, str]:
        """Health check endpoint — useful for k8s liveness probes (Phase IV)."""
        return {"status": "ok"}

    return app


app = create_app()
# [Task]: T017 [From]: specs/phase5-cloud/cloud-deployment/spec.md §FR-011
# Expose /metrics endpoint for Prometheus scraping (kube-prometheus-stack ServiceMonitor).
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
