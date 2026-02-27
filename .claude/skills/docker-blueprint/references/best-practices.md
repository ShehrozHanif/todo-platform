# Docker Multi-Stage Build Best Practices

## Layer Caching Strategy

1. Copy dependency files FIRST (package.json, pyproject.toml, uv.lock)
2. Install dependencies (cached if lock files unchanged)
3. THEN copy source code (invalidates only this layer on code changes)

## Python + UV Pattern

```dockerfile
# Builder: install UV, sync deps, compile bytecode
FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --locked --no-install-project
COPY . .
RUN uv sync --no-dev --locked --no-editable

# Runner: copy only .venv, run as non-root
FROM python:3.13-slim AS runner
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
RUN adduser --disabled-password --no-create-home appuser
USER appuser
WORKDIR /app
COPY --from=builder /app .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Next.js Standalone Pattern

```dockerfile
# Builder: install deps, build standalone
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Runner: copy standalone output only
FROM node:22-alpine AS runner
WORKDIR /app
RUN adduser -D -H appuser
USER appuser
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Requires** `output: "standalone"` in `next.config.mjs`.

## Security Rules

- Never run as root in production (use `adduser` + `USER`)
- Never embed secrets in images (use env vars at runtime)
- Use specific image tags (not `latest` in production)
- Scan images with `docker scout` or `trivy`

## Image Size Targets

| Stack | Single-stage | Multi-stage | Target |
|-------|-------------|-------------|--------|
| Python FastAPI | ~400MB | ~150MB | <200MB |
| Next.js | ~2GB | ~200MB | <250MB |

## Health Check Pattern

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

## Docker Compose Best Practices

- Use `env_file` over inline `environment` for many vars
- Define `depends_on` with `condition: service_healthy`
- Use named networks for service isolation
- Set `restart: unless-stopped` for production
- Use build cache with `cache_from` in CI

Sources:
- https://digon.io/en/blog/2025_07_28_python_docker_images_with_uv
- https://dev.to/angojay/optimizing-nextjs-docker-images-with-standalone-mode-2nnh
- https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/
