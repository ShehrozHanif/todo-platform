# Tasks: Containerization

**Phase:** IV — Local K8s Deployment
**Feature:** Containerization
**Created:** 2026-02-28

---

## T001: Update next.config.ts for standalone output
**Spec:** FR-006
**File:** `frontend/next.config.ts`
**Change:** Add `output: "standalone"` to nextConfig
**Test:** `npm run build` produces `.next/standalone/server.js`
**Blocked by:** None

## T002: Create Backend Dockerfile
**Spec:** FR-001
**File:** `k8s/backend/Dockerfile`
**Change:** Multi-stage Python+UV Dockerfile based on docker-blueprint asset template
- Builder: python:3.13-slim, UV from ghcr.io, uv sync --no-dev --locked, UV_COMPILE_BYTECODE=1
- Runner: python:3.13-slim, copy .venv + source, non-root user, EXPOSE 8000
- CMD: uvicorn main:app --host 0.0.0.0 --port 8000
- Build context: `backend/`
**Test:** `docker build -f k8s/backend/Dockerfile backend/ -t todo-backend`
**Blocked by:** None

## T003: Create Backend .dockerignore
**Spec:** FR-005
**File:** `k8s/backend/.dockerignore`
**Change:** Ignore .venv, __pycache__, tests/, .env, .git, .pytest_cache, debug.log
**Blocked by:** None

## T004: Create Frontend Dockerfile
**Spec:** FR-002
**File:** `k8s/frontend/Dockerfile`
**Change:** Multi-stage Next.js standalone Dockerfile based on docker-blueprint asset template
- Deps stage: node:22-alpine, npm ci
- Builder stage: copy node_modules, npm run build
- Runner stage: copy standalone + static + public, non-root user, EXPOSE 3000
- Build context: `frontend/`
- ARG for NEXT_PUBLIC_API_URL (build-time)
**Test:** `docker build -f k8s/frontend/Dockerfile frontend/ -t todo-frontend`
**Blocked by:** T001 (needs standalone output)

## T005: Create Frontend .dockerignore
**Spec:** FR-005
**File:** `k8s/frontend/.dockerignore`
**Change:** Ignore node_modules, .next, .env.local, .git, .turbo
**Blocked by:** None

## T006: Create MCP Server Dockerfile
**Spec:** FR-003
**File:** `k8s/mcp-server/Dockerfile`
**Change:** Multi-stage Python+UV Dockerfile (same pattern as backend)
- Builder: python:3.13-slim, UV, uv sync --no-dev --locked
- Runner: python:3.13-slim, copy .venv + source, non-root user, EXPOSE 8001
- CMD: python server.py
- Build context: `agents/mcp-server/`
**Test:** `docker build -f k8s/mcp-server/Dockerfile agents/mcp-server/ -t todo-mcp`
**Blocked by:** None

## T007: Create MCP Server .dockerignore
**Spec:** FR-005
**File:** `k8s/mcp-server/.dockerignore`
**Change:** Ignore .venv, __pycache__, .env, .git, test_tools.py
**Blocked by:** None

## T008: Create docker-compose.yml
**Spec:** FR-004
**File:** `k8s/docker-compose.yml`
**Change:** Orchestrate all 3 services
- mcp-server: build agents/mcp-server, port 8001, healthcheck
- backend: build backend, port 8000, depends_on mcp-server, healthcheck, MCP_SERVER_URL=http://mcp-server:8001/sse
- frontend: build frontend, port 3000, depends_on backend, build args for NEXT_PUBLIC_*
- Shared network: todo-network
- env_file: ../.env.docker
**Test:** `docker compose -f k8s/docker-compose.yml up --build`
**Blocked by:** T002, T004, T006

## T009: Create .env.docker template
**Spec:** Plan D4
**File:** `.env.docker`
**Change:** Template with all required env vars (empty values for user to fill)
**Blocked by:** None

## T010: Test full stack locally
**Spec:** Acceptance criteria
**Test:**
1. `docker compose -f k8s/docker-compose.yml build` — all 3 images build
2. `docker compose -f k8s/docker-compose.yml up` — all 3 services start
3. `curl localhost:8000/health` — 200 OK
4. `curl localhost:3000` — 200 OK
5. `curl localhost:8001/sse` — SSE connection
6. Verify image sizes < targets
**Blocked by:** T008
