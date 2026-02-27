# Architecture Plan: Containerization

**Phase:** IV — Local K8s Deployment
**Feature:** Containerization
**Created:** 2026-02-28

---

## 1. Approach

Use the `docker-blueprint` Agent Skill to generate initial Dockerfiles from the asset templates, then customize for each service's specific needs. All Dockerfiles use multi-stage builds (builder → runner) with production best practices.

## 2. Key Decisions

### D1: Base Images

| Service | Builder Base | Runner Base | Rationale |
|---------|-------------|-------------|-----------|
| Backend | `python:3.13-slim` | `python:3.13-slim` | Slim over alpine — asyncpg needs glibc |
| Frontend | `node:22-alpine` | `node:22-alpine` | Alpine fine — no native deps |
| MCP Server | `python:3.13-slim` | `python:3.13-slim` | Same as backend |

### D2: UV Binary Source

Copy UV from `ghcr.io/astral-sh/uv:latest` in builder stage only. UV stays out of the runner image.

### D3: Docker Compose Networking

All services on a single bridge network (`todo-network`). Inter-service communication uses Docker DNS names:
- Backend → MCP: `http://mcp-server:8001/sse`
- Frontend → Backend: `http://backend:8000` (at build time via NEXT_PUBLIC_API_URL)

**Note:** Frontend env vars with `NEXT_PUBLIC_` prefix must be set at BUILD time (baked into JS bundle). For Docker, we pass them as build args.

### D4: Environment Variable Strategy

- Runtime vars: `env_file: .env` in docker-compose
- Build-time vars (frontend): `args` in docker-compose build section
- `.env.docker` template provided for users

### D5: Dockerfile Location

Dockerfiles live in `k8s/<service>/Dockerfile` (not in service dirs) to keep K8s artifacts together per AGENTS.md deliverables. Build contexts point to the service source dirs.

## 3. Architecture

```
docker-compose.yml
    │
    ├── mcp-server (port 8001)
    │     └── agents/mcp-server/ → k8s/mcp-server/Dockerfile
    │
    ├── backend (port 8000)
    │     └── backend/ → k8s/backend/Dockerfile
    │     └── depends_on: mcp-server
    │
    └── frontend (port 3000)
          └── frontend/ → k8s/frontend/Dockerfile
          └── depends_on: backend
```

## 4. Build Pipeline Per Service

### Backend
```
python:3.13-slim (builder)
  → COPY uv from ghcr.io/astral-sh/uv
  → COPY pyproject.toml + uv.lock
  → uv sync --no-dev --locked
  → COPY source code

python:3.13-slim (runner)
  → COPY .venv from builder
  → COPY source from builder
  → adduser, USER, EXPOSE 8000
  → CMD uvicorn
```

### Frontend
```
node:22-alpine (deps)
  → COPY package.json + lock
  → npm ci

node:22-alpine (builder)
  → COPY node_modules from deps
  → COPY source
  → npm run build (standalone)

node:22-alpine (runner)
  → COPY .next/standalone
  → COPY .next/static
  → COPY public
  → adduser, USER, EXPOSE 3000
  → CMD node server.js
```

### MCP Server
```
python:3.13-slim (builder)
  → COPY uv, pyproject.toml, uv.lock
  → uv sync --no-dev --locked
  → COPY source

python:3.13-slim (runner)
  → COPY .venv + source
  → adduser, USER, EXPOSE 8001
  → CMD python server.py
```

## 5. Risks

| Risk | Mitigation |
|------|-----------|
| asyncpg fails on alpine | Use slim (glibc), not alpine for Python |
| Frontend build-time env vars | Pass as Docker build args |
| MCP server needs DB access | Same DATABASE_URL env var via .env |

## 6. Implementation Order

1. Update `next.config.ts` with `output: "standalone"`
2. Backend Dockerfile + .dockerignore
3. Frontend Dockerfile + .dockerignore
4. MCP Server Dockerfile + .dockerignore
5. docker-compose.yml
6. `.env.docker` template
7. Test `docker compose build && docker compose up`
