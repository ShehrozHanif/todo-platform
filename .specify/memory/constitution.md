<!--
  Sync Impact Report
  ==================
  Version change: 0.0.0 → 1.0.0 (MAJOR — initial ratification)
  Modified principles: N/A (first version)
  Added sections:
    - 6 Core Principles (SDD, Shared Core, TDD, Per-Feature SDD, Clean Code & Security, Cloud-Native Ready)
    - Technology Stack & Standards
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md — ✅ compatible (Constitution Check section aligns)
    - .specify/templates/spec-template.md — ✅ compatible (SMART criteria, user stories align)
    - .specify/templates/tasks-template.md — ✅ compatible (TDD, checkpoints, dependency order align)
  Follow-up TODOs: None
-->

# Todo Platform Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

- No code MUST be written without a completed SDD cycle: specify → clarify → plan → tasks → analyze → implement.
- Every code file MUST reference its Task ID and Spec section in a comment (e.g., `# [Task]: T-001 [From]: spec.md §2.1`).
- Conflict resolution hierarchy: Constitution > Spec > Plan > Tasks. If artifacts conflict, the higher-level artifact wins.
- All SDD artifacts (spec.md, plan.md, tasks.md) MUST exist under `specs/<phase>/<feature>/` before implementation begins.
- No agent or developer may skip the clarification step (`/sp.clarify`) — gaps caught early prevent cascading errors.

### II. Shared Core Architecture

- All business logic MUST live in the `core/` module. Interface layers (`cli/`, `backend/`, `frontend/`, `agents/`) import from `core/` — never duplicate logic.
- `core/` evolves across phases:
  - Phase I: In-memory dict/list storage
  - Phase II: SQLModel + Neon PostgreSQL
  - Phase III: Same core, called by MCP tools
  - Phase IV: Same core, containerized
  - Phase V: Core publishes Kafka events after operations
- Adding a new interface layer MUST NOT require modifying `core/` internals — only extending its storage or event capabilities.

### III. Test-First (TDD Mandatory)

- Red-Green-Refactor cycle MUST be strictly enforced for all implementation work.
- Tests MUST be written before implementation code. Test tasks appear before implementation tasks in every tasks.md.
- Every spec success criterion MUST have a corresponding test case.
- Minimum 80% test coverage per feature (measured by pytest-cov for Python, vitest coverage for TypeScript).
- All API endpoints MUST have integration tests.
- Testing frameworks: `pytest` for Python, `vitest` for TypeScript/Next.js.
- No PR or commit MUST be made with failing tests.

### IV. Per-Feature SDD Cycles

- Each feature gets its own `spec.md`, `plan.md`, `tasks.md` under `specs/<phase>/<feature>/`.
- A feature's full SDD cycle (specify → clarify → plan → tasks → analyze → checklist → implement → commit) MUST be completed before starting the next feature.
- 14 total features across 5 phases:
  - Phase I: 1 feature (task-crud)
  - Phase II: 4 features (database-schema, rest-api, authentication, frontend-ui)
  - Phase III: 3 features (mcp-server, ai-agent, chat-ui)
  - Phase IV: 2 features (containerization, helm-deployment)
  - Phase V: 4 features (advanced-features, kafka-events, dapr-integration, cloud-deployment)
- Within a phase, features MUST be implemented in dependency order (e.g., Phase II: database → API → auth → frontend).

### V. Clean Code & Security

- No hardcoded secrets — all credentials MUST use `.env` files and environment variables.
- `.env` files MUST be listed in `.gitignore` and MUST NOT be committed.
- Input validation MUST be applied at all system boundaries (API endpoints, CLI input, MCP tool parameters).
- All Python functions MUST have type hints.
- All TypeScript code MUST use strict mode (`"strict": true` in tsconfig.json).
- Error handling MUST provide meaningful messages — no bare `except:` or silent failures.
- Every API endpoint MUST return proper HTTP status codes (200, 201, 400, 401, 404, 500).

### VI. Cloud-Native Ready

- Server design MUST be stateless from Phase II onward — no in-process session state.
- All application state MUST be persisted to Neon PostgreSQL (tasks, conversations, messages).
- No local filesystem dependencies — the app MUST run identically in Docker, Minikube, and cloud K8s.
- All configuration MUST be environment-based: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `OPENAI_API_KEY`, etc.
- Container images MUST be minimal (multi-stage builds preferred) and MUST NOT include dev dependencies.

## Technology Stack & Standards

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Language (Backend) | Python | 3.13+ with UV package manager |
| Language (Frontend) | TypeScript | Strict mode enabled |
| Backend Framework | FastAPI | Async endpoints required |
| Frontend Framework | Next.js | 16+ with App Router |
| ORM | SQLModel | For all database operations |
| Database | Neon Serverless PostgreSQL | Free tier for development |
| Authentication | Better Auth | With JWT plugin for cross-service auth |
| AI Framework | OpenAI Agents SDK | For Phase III chatbot logic |
| MCP Server | Official MCP SDK (Python) | Exposes task operations as tools |
| Chat UI | OpenAI ChatKit | Frontend chat interface |
| Containerization | Docker | Multi-stage builds |
| Orchestration | Kubernetes (Minikube local, AKS/GKE/OKE cloud) | Helm charts for deployment |
| Event Streaming | Kafka (Strimzi/Redpanda) | Phase V event-driven architecture |
| Distributed Runtime | Dapr | Pub/Sub, State, Service Invocation, Jobs, Secrets |
| Python Testing | pytest + pytest-cov | Minimum 80% coverage |
| TypeScript Testing | vitest | Minimum 80% coverage |
| CI/CD | GitHub Actions | Phase V requirement |

## Development Workflow

### SDD Cascade (Every Feature)

```
/sp.specify   → Define WHAT (outcomes, criteria, non-goals)
/sp.clarify   → Find gaps (ambiguous terms, missing assumptions)
/sp.plan      → Design HOW (architecture, components, phases)
/sp.adr       → (On-demand) Document significant architectural decisions
/sp.tasks     → Break into atomic work units (15-30 min each)
/sp.analyze   → Verify spec ↔ plan ↔ tasks alignment
/sp.checklist → Generate validation checklist
/sp.implement → Execute tasks with human checkpoints (TDD: Red → Green → Refactor)
/sp.git.commit_pr → Commit and ship
```

### Git Discipline

- Constitution MUST be committed before any feature spec work begins.
- Each feature's SDD artifacts MUST be committed before implementation starts.
- Commits MUST reference the feature and phase (e.g., `feat(phase2/rest-api): implement task CRUD endpoints`).
- Feature branches MUST follow the pattern: `phase<N>/<feature-name>`.

### Checkpoint Pattern

At every implementation checkpoint, validate:
1. Do task outputs meet the spec's success criteria?
2. Do outputs meet constitutional standards (TDD, type hints, no secrets)?
3. Can the next task safely build on this output?

Decisions: **Approve** (commit + proceed) | **Iterate** (give feedback) | **Revise** (adjust plan).

### PHR (Prompt History Records)

- A PHR MUST be created automatically after every user interaction.
- PHR routing: constitution → `history/prompts/constitution/`, feature work → `history/prompts/<phase>-<feature>/`, general → `history/prompts/general/`.

## Governance

- This constitution supersedes all other project practices. If any spec, plan, or task conflicts with a constitutional principle, the constitution wins.
- Amendments to this constitution MUST be documented with rationale, versioned semantically (MAJOR.MINOR.PATCH), and committed to git before taking effect.
- All implementation work MUST be verified against this constitution at checkpoints. Non-compliance MUST be flagged and resolved before proceeding.
- Complexity MUST be justified — prefer the smallest viable change that fulfills the requirement. No premature abstractions, no gold-plating.
- See `AGENTS.md` for the complete project roadmap, phase breakdown, and feature dependency order.

**Version**: 1.0.0 | **Ratified**: 2026-02-18 | **Last Amended**: 2026-02-18
