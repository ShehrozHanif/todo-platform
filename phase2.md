# Phase 2: Full-Stack Web Application — Execution Plan

## Overview

**Points:** 150
**Goal:** Transform the Phase 1 console app into a multi-user web application with persistent storage, REST API, authentication, and a responsive frontend.

---

## What Changes From Phase 1

| Phase 1 (Done) | Phase 2 (Building) |
|---|---|
| In-memory storage (Python list) | Neon PostgreSQL via SQLModel |
| Single user, single session | Multi-user with authentication |
| CLI `input()`/`print()` | Next.js web UI + FastAPI REST API |
| `src/` Python package | `backend/` (FastAPI) + `frontend/` (Next.js) |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16+ (App Router), TypeScript, Tailwind CSS |
| Backend | Python FastAPI (async) |
| ORM | SQLModel |
| Database | Neon Serverless PostgreSQL |
| Authentication | Better Auth + JWT plugin |
| Spec-Driven | Claude Code + Spec-Kit Plus |

---

## Phase 2 Feature Hierarchy (4 SDD Cycles)

Phase 2 has **4 features**, each getting its own complete SDD cycle (specify → clarify → plan → tasks → analyze → implement). They MUST be executed in order because each builds on the previous.

```
Phase 2 Execution Order
========================

Feature 1: Database Schema          ← Foundation (no dependencies)
    │
    ▼
Feature 2: REST API                 ← Depends on database models
    │
    ▼
Feature 3: Authentication           ← Depends on API endpoints existing
    │
    ▼
Feature 4: Frontend UI              ← Depends on API + Auth being ready
```

### Feature 1: Database Schema (`specs/phase2-web/database-schema/`)

**What:** Design and implement the Neon PostgreSQL database with SQLModel models.

**Scope:**
- SQLModel `Task` model with fields: id, user_id, title, description, completed, created_at, updated_at
- SQLModel `User` model (managed by Better Auth, but we define the schema)
- Database connection module (`backend/db.py`) using `DATABASE_URL` env var
- Neon serverless PostgreSQL setup
- Table creation / migration strategy

**Key Decisions:**
- `user_id` as string (Better Auth generates string IDs)
- Foreign key: `tasks.user_id → users.id`
- Indexes on `user_id` and `completed` for query performance

**SDD Cycle:**
```
/sp.specify  → Define schema requirements, constraints, relationships
/sp.clarify  → Resolve: migration strategy, field constraints, naming
/sp.plan     → Architecture: connection pooling, model inheritance, env config
/sp.tasks    → Atomic tasks: models, db.py, table creation, seed data tests
/sp.analyze  → Cross-check spec ↔ plan ↔ tasks alignment
/sp.implement → Write tests first, then models + db module
```

---

### Feature 2: REST API (`specs/phase2-web/rest-api/`)

**What:** Build 6 FastAPI endpoints for task CRUD operations.

**Scope:**
- `GET    /api/{user_id}/tasks`          — List all tasks
- `POST   /api/{user_id}/tasks`          — Create a new task
- `GET    /api/{user_id}/tasks/{id}`     — Get task details
- `PUT    /api/{user_id}/tasks/{id}`     — Update a task
- `DELETE /api/{user_id}/tasks/{id}`     — Delete a task
- `PATCH  /api/{user_id}/tasks/{id}/complete` — Toggle completion
- Pydantic request/response schemas
- Error handling with HTTPException (400, 404, 422)
- Input validation at API boundary

**Key Decisions:**
- User ID in URL path (will be validated against JWT later in Feature 3)
- All routes under `/api/` prefix
- Async endpoints with SQLModel async session
- Proper HTTP status codes (201 for create, 204 for delete, etc.)

**SDD Cycle:**
```
/sp.specify  → Define endpoints, request/response schemas, error codes
/sp.clarify  → Resolve: pagination, sorting, filtering query params
/sp.plan     → Architecture: router structure, dependency injection, middleware
/sp.tasks    → Atomic tasks: schemas, routes, integration tests per endpoint
/sp.analyze  → Cross-check endpoints match spec exactly
/sp.implement → Write integration tests first, then route handlers
```

---

### Feature 3: Authentication (`specs/phase2-web/authentication/`)

**What:** Implement Better Auth with JWT plugin for multi-user isolation.

**Scope:**
- Better Auth setup in Next.js frontend (signup/signin pages)
- JWT plugin configuration (token issuance on login)
- FastAPI JWT verification middleware
- Shared secret (`BETTER_AUTH_SECRET`) between frontend and backend
- User isolation: every API call filtered by authenticated user's ID
- Protected routes: 401 for missing/invalid token

**Key Decisions:**
- JWT in `Authorization: Bearer <token>` header
- Better Auth manages user sessions + issues JWTs
- FastAPI middleware decodes JWT, extracts user_id, validates against URL param
- Token expiry (e.g., 7 days)
- No shared database session between frontend auth and backend

**Auth Flow:**
```
User → Login on Next.js → Better Auth creates session + JWT
     → Frontend sends API request with Bearer token
     → FastAPI middleware verifies JWT signature
     → Extracts user_id → Matches URL {user_id}
     → Returns only that user's tasks
```

**SDD Cycle:**
```
/sp.specify  → Define auth flow, token format, middleware behavior, error cases
/sp.clarify  → Resolve: token refresh, session management, CORS config
/sp.plan     → Architecture: middleware chain, env vars, secret sharing
/sp.tasks    → Atomic tasks: Better Auth config, JWT middleware, route protection
/sp.analyze  → Verify auth covers all endpoints, no unprotected routes
/sp.implement → Write auth tests first, then middleware + config
```

---

### Feature 4: Frontend UI (`specs/phase2-web/frontend-ui/`)

**What:** Build the Next.js web interface for the todo application.

**Scope:**
- Next.js 16+ App Router with TypeScript strict mode
- Pages: Login, Signup, Task Dashboard
- Components: TaskList, TaskItem, AddTaskForm, EditTaskModal
- API client (`lib/api.ts`) for backend communication
- Better Auth integration (session provider, login/signup forms)
- Responsive design with Tailwind CSS
- Optimistic UI updates
- Error states and loading indicators

**Key Decisions:**
- Server components by default, client components only for interactivity
- API client attaches JWT to every request automatically
- Tailwind CSS for styling (no CSS modules or styled-components)
- App Router file-based routing

**SDD Cycle:**
```
/sp.specify  → Define pages, components, user flows, responsive breakpoints
/sp.clarify  → Resolve: component hierarchy, state management, UX details
/sp.plan     → Architecture: file structure, data fetching strategy, auth guards
/sp.tasks    → Atomic tasks: pages, components, API client, auth integration
/sp.analyze  → Verify UI covers all user stories from spec
/sp.implement → Write component tests first, then pages + components
```

---

## Directory Structure (Phase 2 Additions)

```
todo-platform/
├── backend/                          ← NEW: FastAPI server
│   ├── CLAUDE.md                     # Backend-specific guidelines
│   ├── main.py                       # FastAPI app entry point
│   ├── models.py                     # SQLModel database models
│   ├── db.py                         # Database connection (Neon)
│   ├── routes/
│   │   └── tasks.py                  # Task CRUD endpoints
│   ├── middleware/
│   │   └── auth.py                   # JWT verification middleware
│   ├── schemas/
│   │   └── task.py                   # Pydantic request/response schemas
│   ├── tests/
│   │   ├── test_models.py
│   │   ├── test_routes.py
│   │   └── test_auth.py
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend/                         ← NEW: Next.js app
│   ├── CLAUDE.md                     # Frontend-specific guidelines
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing / redirect
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── dashboard/page.tsx        # Main task view
│   ├── components/
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   ├── AddTaskForm.tsx
│   │   └── EditTaskModal.tsx
│   ├── lib/
│   │   ├── api.ts                    # Backend API client
│   │   └── auth.ts                   # Better Auth client config
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env.example
│
├── specs/phase2-web/                 ← NEW: 4 SDD spec folders
│   ├── database-schema/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── rest-api/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   ├── authentication/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── tasks.md
│   └── frontend-ui/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
│
├── src/                              ← Phase 1 (preserved, not modified)
└── ...
```

---

## Execution Sequence

```
Step 1: Feature 1 — Database Schema
       /sp.specify → /sp.clarify → /sp.plan → /sp.tasks → /sp.analyze → /sp.implement
       → git commit

Step 2: Feature 2 — REST API
       /sp.specify → /sp.clarify → /sp.plan → /sp.tasks → /sp.analyze → /sp.implement
       → git commit

Step 3: Feature 3 — Authentication
       /sp.specify → /sp.clarify → /sp.plan → /sp.tasks → /sp.analyze → /sp.implement
       → git commit

Step 4: Feature 4 — Frontend UI
       /sp.specify → /sp.clarify → /sp.plan → /sp.tasks → /sp.analyze → /sp.implement
       → git commit

Step 5: Integration Test + Deploy
       → End-to-end testing (frontend ↔ API ↔ DB)
       → Deploy frontend to Vercel
       → Deploy backend (or run locally)
       → Final git commit + push
```

---

## Environment Variables Needed

```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/todo_db
BETTER_AUTH_SECRET=your-shared-secret-key

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
BETTER_AUTH_SECRET=your-shared-secret-key
```

---

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Neon cold starts slow down API | Use connection pooling, keep-alive |
| JWT secret mismatch between frontend/backend | Single `BETTER_AUTH_SECRET` env var, documented in .env.example |
| CORS issues between Next.js and FastAPI | Configure FastAPI CORSMiddleware with frontend origin |
| Better Auth + FastAPI integration complexity | JWT is the bridge — no shared session DB needed |

---

## How This Connects to Phase 1

Phase 1's `src/` code (models, services, CLI) is **preserved but not directly reused** in Phase 2. The business logic patterns carry forward:
- `Task` dataclass → becomes `Task` SQLModel
- `TaskStore` CRUD → becomes FastAPI route handlers + SQLModel queries
- `TaskService` validation → moves into Pydantic schemas + route-level validation
- `CLIHandler` → replaced by Next.js frontend

The `core/` reuse strategy from AGENTS.md will materialize as shared patterns, not direct imports, since Phase 2 introduces a completely different storage and interface layer.

---

## New Skills & Sub-Agents Required for Phase 2

> SpecifyPlus SDD skills (`/sp.specify`, `/sp.clarify`, `/sp.plan`, `/sp.tasks`, `/sp.analyze`, `/sp.checklist`, `/sp.implement`, `/sp.git.commit_pr`, `/sp.adr`, `/sp.phr`) are **already installed** and excluded from this count.

---

### Summary: What We Need to Build

| What | Count | Purpose |
|---|---|---|
| **Custom Skills** | 4 | Reusable intelligence for each feature (like `todo-cli-generator` was for Phase 1) |
| **Sub-Agents** | 4 | One implementation agent per feature, spawned during `/sp.implement` |
| **Total new artifacts** | **8** | 4 skills + 4 sub-agents |

---

### 4 Custom Skills (Reusable Intelligence)

Each skill encodes proven architecture, code templates, test patterns, and critical invariants for its feature. They live under `.claude/skills/` and are created **after `/sp.plan`** so the architecture decisions inform the templates.

```
.claude/skills/
├── todo-cli-generator/          ← Phase 1 (exists)
│
├── neon-sqlmodel-generator/     ← Skill 1: Database Schema
│   ├── SKILL.md
│   ├── templates/
│   │   ├── sqlmodel-task.md         # Task SQLModel with fields, indexes
│   │   ├── db-connection.md         # Async engine, session factory, Neon pooling
│   │   └── pyproject-backend.md     # FastAPI + SQLModel + asyncpg deps
│   └── examples/
│       └── test-patterns.md         # Model tests, DB session fixtures
│
├── fastapi-crud-generator/      ← Skill 2: REST API
│   ├── SKILL.md
│   ├── templates/
│   │   ├── route-handlers.md        # 6 endpoint implementations
│   │   ├── pydantic-schemas.md      # TaskCreate, TaskUpdate, TaskResponse
│   │   ├── error-handling.md        # HTTPException patterns, status codes
│   │   └── app-factory.md           # FastAPI app with CORS, lifespan, routers
│   └── examples/
│       └── test-patterns.md         # httpx AsyncClient integration tests
│
├── better-auth-jwt-generator/   ← Skill 3: Authentication
│   ├── SKILL.md
│   ├── templates/
│   │   ├── jwt-middleware.md         # FastAPI dependency for JWT verification
│   │   ├── better-auth-config.md    # Next.js Better Auth + JWT plugin setup
│   │   ├── auth-client.md           # Frontend auth client (signup/signin)
│   │   └── env-setup.md             # BETTER_AUTH_SECRET, shared config
│   └── examples/
│       └── test-patterns.md         # Auth middleware tests, protected route tests
│
└── nextjs-todo-ui-generator/    ← Skill 4: Frontend UI
    ├── SKILL.md
    ├── templates/
    │   ├── app-layout.md             # Root layout, providers, auth guard
    │   ├── dashboard-page.md         # Task dashboard with CRUD operations
    │   ├── auth-pages.md             # Login + Signup pages
    │   ├── components.md             # TaskList, TaskItem, AddTaskForm, EditModal
    │   ├── api-client.md             # lib/api.ts with JWT header injection
    │   └── tailwind-config.md        # Tailwind setup
    └── examples/
        └── test-patterns.md          # Component tests, API client mocks
```

| # | Skill | Feature | What It Encodes | Output Files |
|---|---|---|---|---|
| 1 | `neon-sqlmodel-generator` | Database Schema | SQLModel models, async Neon connection, session management | `backend/models.py`, `backend/db.py` |
| 2 | `fastapi-crud-generator` | REST API | 6 endpoints, Pydantic schemas, error handling, CORS | `backend/routes/tasks.py`, `backend/schemas/task.py`, `backend/main.py` |
| 3 | `better-auth-jwt-generator` | Authentication | JWT middleware, Better Auth config, user isolation | `backend/middleware/auth.py`, `frontend/lib/auth.ts` |
| 4 | `nextjs-todo-ui-generator` | Frontend UI | App Router pages, components, API client with JWT | `frontend/app/`, `frontend/components/`, `frontend/lib/` |

---

### 4 Sub-Agents (Implementation Workers)

Each sub-agent is spawned during `/sp.implement` for its feature. It reads the corresponding custom skill, writes code following TDD (tests first), and runs the test suite.

| # | Sub-Agent | Spawned During | What It Does |
|---|---|---|---|
| 1 | **DB Schema Agent** | Feature 1 `/sp.implement` | Reads `neon-sqlmodel-generator` → writes models + db module → runs model tests |
| 2 | **REST API Agent** | Feature 2 `/sp.implement` | Reads `fastapi-crud-generator` → writes routes + schemas → runs endpoint tests |
| 3 | **Auth Agent** | Feature 3 `/sp.implement` | Reads `better-auth-jwt-generator` → writes JWT middleware + auth config → runs auth tests |
| 4 | **Frontend Agent** | Feature 4 `/sp.implement` | Reads `nextjs-todo-ui-generator` → writes pages + components → runs frontend tests |

---

### Execution Flow (Skills + Agents in Context)

```
Feature 1: Database Schema
├── SDD cascade: specify → clarify → plan
├── CREATE SKILL: .claude/skills/neon-sqlmodel-generator/
├── SDD cascade: tasks → analyze → checklist
├── /sp.implement → spawns DB Schema Agent (uses skill)
└── /sp.git.commit_pr

Feature 2: REST API
├── SDD cascade: specify → clarify → plan
├── CREATE SKILL: .claude/skills/fastapi-crud-generator/
├── SDD cascade: tasks → analyze → checklist
├── /sp.implement → spawns REST API Agent (uses skill)
└── /sp.git.commit_pr

Feature 3: Authentication
├── SDD cascade: specify → clarify → plan
├── CREATE SKILL: .claude/skills/better-auth-jwt-generator/
├── SDD cascade: tasks → analyze → checklist
├── /sp.implement → spawns Auth Agent (uses skill)
└── /sp.git.commit_pr

Feature 4: Frontend UI
├── SDD cascade: specify → clarify → plan
├── CREATE SKILL: .claude/skills/nextjs-todo-ui-generator/
├── SDD cascade: tasks → analyze → checklist
├── /sp.implement → spawns Frontend Agent (uses skill)
└── /sp.git.commit_pr
```

---

### Why Custom Skills? (Bonus Points)

Creating these 4 skills earns the **+200 bonus** for "Reusable Intelligence — Create and use reusable intelligence via Claude Code Subagents and Agent Skills." Once built, each skill can be reused in any future project that needs the same pattern (e.g., `fastapi-crud-generator` works for any FastAPI CRUD app, not just this todo project).
