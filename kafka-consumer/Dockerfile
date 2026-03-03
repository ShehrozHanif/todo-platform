# [Task]: T027 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-020
# Multi-stage build: UV installs deps in builder, final image copies only what's needed.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM python:3.13-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml ./
COPY consumers/ ./consumers/
COPY main.py ./

# Install runtime deps only (no dev dependencies in final image)
RUN uv sync --frozen --no-dev

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM python:3.13-slim AS runtime

WORKDIR /app

# Copy installed packages and source from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/consumers /app/consumers
COPY --from=builder /app/main.py /app/main.py

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

CMD ["python", "main.py"]
