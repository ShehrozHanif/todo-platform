---
name: docker-blueprint
description: |
  Generates production-ready Dockerfiles and docker-compose.yml from service specifications.
  This skill should be used when users need to containerize applications, create multi-stage
  Docker builds, or set up Docker Compose orchestration for multi-service projects.
---

# Docker Blueprint

Generate production-ready Dockerfiles and Docker Compose configurations from service specs.

## What This Skill Does

- Generates multi-stage Dockerfiles for Python (UV/pip) and Node.js (npm/pnpm) apps
- Creates docker-compose.yml for multi-service orchestration
- Applies Docker best practices: small images, non-root users, layer caching, health checks
- Supports .dockerignore generation

## What This Skill Does NOT Do

- Build or push Docker images (use `docker build` / `docker push`)
- Manage Docker registries or CI/CD pipelines
- Handle Kubernetes deployments (use `helm-blueprint` skill)

---

## Before Implementation

Gather context to ensure successful implementation:

| Source | Gather |
|--------|--------|
| **Codebase** | Existing package managers (UV/pip/npm), framework, entry points, static assets |
| **Conversation** | User's runtime, port, env vars, services needed |
| **Skill References** | Best practices from `references/best-practices.md` |
| **User Guidelines** | Project CLAUDE.md for stack details |

Only ask user for THEIR specific requirements (domain expertise is in this skill).

---

## Clarifications

Ask before generating:

| Question | Why |
|----------|-----|
| Runtime + framework? | Python/FastAPI, Node/Next.js, etc. |
| Package manager? | UV, pip, npm, pnpm |
| Port(s)? | Exposed ports for the service |
| Environment variables? | What env vars are needed at runtime |
| Multi-service? | Need docker-compose.yml? How many services? |

---

## Generation Workflow

```
1. Detect runtime → select base image strategy
2. Generate multi-stage Dockerfile (builder → runner)
3. Generate .dockerignore
4. If multi-service → generate docker-compose.yml
5. Validate against checklist
```

### Step 1: Runtime Detection

| Runtime | Base Image | Builder Image |
|---------|-----------|---------------|
| Python 3.13+ (UV) | `python:3.13-slim` | Same + UV binary from `ghcr.io/astral-sh/uv` |
| Python 3.13+ (pip) | `python:3.13-slim` | Same |
| Node.js (Next.js) | `node:22-alpine` | Same |
| Node.js (generic) | `node:22-alpine` | Same |

### Step 2: Dockerfile Generation

Apply patterns from `references/best-practices.md`. Key rules:
- Always use multi-stage builds (builder + runner)
- Copy dependency files first (layer caching)
- Install deps before copying source code
- Use non-root user in runner stage
- Set `EXPOSE` for documentation
- Compile bytecode for Python (`UV_COMPILE_BYTECODE=1`)
- Use `output: "standalone"` for Next.js

### Step 3: .dockerignore

Generate appropriate ignores: `node_modules`, `.venv`, `.git`, `.env`, `__pycache__`, `.next` (except standalone).

### Step 4: Docker Compose

If multi-service, generate `docker-compose.yml` with:
- Service definitions with build context
- Port mappings
- Environment variables (via `env_file` or `environment`)
- Depends_on for service ordering
- Health checks
- Shared networks

### Step 5: Validation Checklist

- [ ] Multi-stage build (builder → runner)
- [ ] Dependencies installed before source code (layer caching)
- [ ] Non-root user in runner stage
- [ ] No secrets in image (use env vars / .env)
- [ ] .dockerignore excludes dev files
- [ ] EXPOSE matches actual port
- [ ] Health check defined
- [ ] Image size optimized (slim/alpine base)

---

## Output Spec

### Dockerfile

```
# Stage 1: Builder
FROM <base> AS builder
# Install deps, copy source, build

# Stage 2: Runner
FROM <base> AS runner
# Copy artifacts, set user, expose, cmd
```

### docker-compose.yml

```yaml
services:
  <service-name>:
    build:
      context: ./<service-dir>
      dockerfile: Dockerfile
    ports:
      - "<host>:<container>"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:<port>/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Reference Files

| File | Content |
|------|---------|
| `references/best-practices.md` | Docker multi-stage build patterns, layer caching, security |
| `assets/python-uv.Dockerfile` | Template for Python + UV + FastAPI |
| `assets/nextjs-standalone.Dockerfile` | Template for Next.js standalone |
| `assets/docker-compose.template.yml` | Template for multi-service compose |
