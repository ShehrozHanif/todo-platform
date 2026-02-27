# Feature Specification: Containerization

**Phase:** IV — Local K8s Deployment
**Feature:** Containerization
**Status:** Draft
**Created:** 2026-02-28

---

## 1. Overview

Containerize the todo-platform's three services (backend, frontend, MCP server) using Docker multi-stage builds and orchestrate them with Docker Compose for local development and as a foundation for Kubernetes deployment.

## 2. Goals

- G1: Create production-ready Dockerfiles for all three services
- G2: Minimize image sizes via multi-stage builds
- G3: Orchestrate services with Docker Compose
- G4: Enable local development with `docker compose up`
- G5: Prepare images for Helm/K8s deployment in Feature 2

## 3. Non-Goals

- NG1: Kubernetes deployment (Feature 2)
- NG2: CI/CD pipeline (Phase V)
- NG3: Local database container (uses external Neon DB)
- NG4: Production-grade secrets management (Phase V)

## 4. Services

### 4.1 Backend (FastAPI + UV)

| Property | Value |
|----------|-------|
| Runtime | Python 3.13+ |
| Package Manager | UV (pyproject.toml + uv.lock) |
| Framework | FastAPI + Uvicorn |
| Entry Point | `uvicorn main:app --host 0.0.0.0 --port 8000` |
| Port | 8000 |
| Health Check | `GET /health` |
| Source Dir | `backend/` |
| Dependencies | pyproject.toml, uv.lock |

**Environment Variables (runtime):**
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — JWT signing secret
- `ALLOWED_ORIGINS` — CORS origins (comma-separated)
- `OPENAI_API_KEY` — OpenAI API key (for agents + chatkit)
- `MCP_SERVER_URL` — MCP server SSE endpoint

### 4.2 Frontend (Next.js 16 + Standalone)

| Property | Value |
|----------|-------|
| Runtime | Node.js 22 |
| Package Manager | npm (package.json + package-lock.json) |
| Framework | Next.js 16 (App Router) |
| Build Output | Standalone (`.next/standalone`) |
| Entry Point | `node server.js` |
| Port | 3000 |
| Health Check | `GET /` (returns 200) |
| Source Dir | `frontend/` |

**Environment Variables (build-time + runtime):**
- `DATABASE_URL` — Neon PostgreSQL (Better Auth server-side)
- `BETTER_AUTH_SECRET` — JWT signing secret
- `BETTER_AUTH_URL` — Better Auth base URL
- `NEXT_PUBLIC_APP_URL` — Public frontend URL
- `NEXT_PUBLIC_API_URL` — Backend API URL

**Requires:** `output: "standalone"` in `next.config.ts`

### 4.3 MCP Server

| Property | Value |
|----------|-------|
| Runtime | Python 3.13+ |
| Package Manager | UV (pyproject.toml + uv.lock) |
| Framework | MCP SDK (SSE transport) |
| Entry Point | `uv run server.py` or `python server.py` |
| Port | 8001 |
| Source Dir | `agents/mcp-server/` |

**Environment Variables (runtime):**
- `DATABASE_URL` — Neon PostgreSQL connection string

## 5. Functional Requirements

### FR-001: Backend Dockerfile
- Multi-stage build: builder (UV + deps) → runner (slim)
- Copy UV binary from `ghcr.io/astral-sh/uv:latest`
- Install deps with `uv sync --no-dev --locked`
- Compile bytecode (`UV_COMPILE_BYTECODE=1`)
- Run as non-root user
- EXPOSE 8000
- HEALTHCHECK via `/health`

### FR-002: Frontend Dockerfile
- Multi-stage build: deps → builder → runner
- Install deps with `npm ci`
- Build with `npm run build` (standalone output)
- Copy only `.next/standalone`, `.next/static`, `public`
- Run as non-root user
- EXPOSE 3000

### FR-003: MCP Server Dockerfile
- Multi-stage build: builder (UV + deps) → runner (slim)
- Same UV pattern as backend
- EXPOSE 8001

### FR-004: Docker Compose
- Define all 3 services with build contexts
- Port mappings: 8000, 3000, 8001
- Environment variables via `env_file: .env`
- Health checks for backend and MCP server
- `depends_on` ordering: MCP → Backend → Frontend
- Shared network for inter-service communication
- Backend env `MCP_SERVER_URL=http://mcp-server:8001/sse`

### FR-005: .dockerignore Files
- Backend: `.venv`, `__pycache__`, `tests/`, `.env`, `.git`
- Frontend: `node_modules`, `.next`, `.env.local`, `.git`
- MCP: `.venv`, `__pycache__`, `.env`, `.git`

### FR-006: Next.js Standalone Config
- Update `next.config.ts` to add `output: "standalone"`

## 6. Non-Functional Requirements

### NFR-001: Image Size
- Backend: < 200MB
- Frontend: < 250MB
- MCP Server: < 200MB

### NFR-002: Build Time
- All images build in < 3 minutes (cached deps)

### NFR-003: Security
- No root user in runner stages
- No secrets baked into images
- No `.env` files copied into images

## 7. Acceptance Criteria

- [ ] `docker build` succeeds for backend, frontend, MCP server
- [ ] `docker compose up` starts all 3 services
- [ ] Backend health check passes at `localhost:8000/health`
- [ ] Frontend loads at `localhost:3000`
- [ ] MCP server accessible at `localhost:8001/sse`
- [ ] Backend can reach MCP server via Docker network
- [ ] Frontend can reach backend via Docker network
- [ ] All images run as non-root users
- [ ] No secrets in Docker images
- [ ] Image sizes meet NFR-001 targets

## 8. File Outputs

```
k8s/
├── backend/
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── Dockerfile
│   └── .dockerignore
├── mcp-server/
│   ├── Dockerfile
│   └── .dockerignore
└── docker-compose.yml
```

Plus: update `frontend/next.config.ts` with `output: "standalone"`.
