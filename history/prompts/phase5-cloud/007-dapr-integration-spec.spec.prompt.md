---
id: 007
title: Dapr Integration Feature Specification
stage: spec
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: dapr-integration
branch: 002-dapr-integration
user: Shehroz Hanif
command: /sp.specify
labels: ["dapr","pub-sub","state-store","secrets","jobs-api","service-invocation","phase5","spec"]
links:
  spec: specs/phase5-cloud/dapr-integration/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/dapr-integration/spec.md
  - specs/phase5-cloud/dapr-integration/checklists/requirements.md
  - specs/002-dapr-integration/spec.md
tests: []
---

## Prompt

/sp.specify specs/phase5-cloud/dapr-integration/ — Dapr integration for the todo platform. Replace direct Kafka producer calls with Dapr Pub/Sub (using the existing 3 topics: task-events, reminders, task-updates). Add Dapr State Store for caching task reads. Use Dapr Service Invocation between frontend and backend. Add Dapr Jobs API for scheduled reminder scanning (replace event-driven reminders). Add Dapr Secrets for DATABASE_URL and BETTER_AUTH_SECRET. Stack: Dapr 1.14+, Python Dapr SDK (dapr-python), running via Dapr sidecar on Kubernetes (Minikube local + AKS/GKE in production). Backend is FastAPI (Python). Kafka remains as the underlying message broker for Pub/Sub.

## Response snapshot

Created full feature specification for Dapr Integration at `specs/phase5-cloud/dapr-integration/spec.md`.

**Branch**: `002-dapr-integration` (created via create-new-feature.ps1)

**5 User Stories mapped to Dapr building blocks**:
- US1 (P1): Pub/Sub — replace direct Kafka with Dapr abstraction; 5 acceptance scenarios; fail-open
- US2 (P2): Jobs API — scheduled 5-min reminder scan replacing event-driven reminder; 5 acceptance scenarios
- US3 (P3): State Store — per-user task list cache, 5-min TTL, write invalidation, fail-open fallback; 5 scenarios
- US4 (P2): Secrets API — DATABASE_URL + BETTER_AUTH_SECRET from vault; fail-fast at startup; 4 scenarios
- US5 (P3): Service Invocation — name-based routing frontend→backend; 3 scenarios

**15 Functional Requirements (FR-001–FR-015)**:
- FR-001–FR-003: Pub/Sub fire-and-forget publishing to both topics
- FR-004–FR-005: Jobs API 5-min scan with reminder dedup
- FR-006–FR-008: State Store with TTL + write invalidation + fail-open
- FR-009–FR-011: Secrets fail-fast startup, no plaintext in manifests
- FR-012–FR-013: Service Invocation name-based routing across envs
- FR-014–FR-015: Component file configuration, graceful degradation

**7 Success Criteria (SC-001–SC-007)**: 100% event delivery, <100ms cache hits, ≤5min reminder delivery, zero plaintext secrets, env-agnostic routing, zero API errors during broker downtime, zero user-visible errors during cache downtime

**Edge cases**: sidecar unavailable, publish timeout, state race condition, scheduler miss, missing secret key

**Checklist**: All 15 items pass — spec ready for /sp.clarify or /sp.plan

## Outcome

- ✅ Impact: Complete Dapr integration spec covering all 5 building blocks for Phase V cloud deployment
- 🧪 Tests: n/a (spec stage)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.clarify (optional — no NEEDS CLARIFICATION markers), /sp.plan
- 🧠 Reflection: Jobs API replaces event-driven reminders — key architectural shift since a 5-min poll catches tasks that weren't modified recently; Secrets fail-fast vs cache fail-open distinction is correct UX tradeoff

## Evaluation notes (flywheel)

- Failure modes observed: PowerShell script parameter parsing error for long argument strings (workaround: branch was still created correctly)
- Graders run and results (PASS/FAIL): checklist 15/15 PASS
- Prompt variant (if applicable): /sp.specify with explicit building blocks in description
- Next experiment: /sp.clarify to check if Jobs API interval or State Store TTL need confirmation
