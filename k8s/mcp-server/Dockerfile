# [Task]: T006 [From]: specs/phase4-k8s/containerization/spec.md §FR-003
# Multi-stage Dockerfile for MCP Server (Python + UV)
# Generated via docker-blueprint skill

# Stage 1: Builder — install dependencies with UV
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# Copy dependency files first (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --locked --no-install-project

# Copy source and finalize install
COPY . .
RUN uv sync --no-dev --locked --no-editable

# Stage 2: Runner — minimal production image
FROM python:3.13-slim AS runner

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Security: run as non-root user
RUN adduser --disabled-password --no-create-home appuser
USER appuser

WORKDIR /app
COPY --from=builder /app .

EXPOSE 8001

CMD ["python", "server.py"]
