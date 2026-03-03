---
id: 009
title: Dapr Integration Architecture Plan
stage: plan
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: dapr-integration
branch: 002-dapr-integration
user: Shehroz Hanif
command: /sp.plan
labels: ["dapr","pub-sub","state-store","jobs-api","secrets","service-invocation","phase5","plan"]
links:
  spec: specs/phase5-cloud/dapr-integration/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/dapr-integration/plan.md
  - specs/phase5-cloud/dapr-integration/data-model.md
  - specs/phase5-cloud/dapr-integration/quickstart.md
  - specs/phase5-cloud/dapr-integration/contracts/pub-sub-contract.md
  - specs/phase5-cloud/dapr-integration/contracts/state-store-contract.md
  - specs/phase5-cloud/dapr-integration/contracts/jobs-contract.md
  - specs/phase5-cloud/dapr-integration/contracts/secrets-contract.md
tests: []
---

## Prompt

/sp.plan

## Response snapshot

Completed full Phase 0 + Phase 1 planning for Dapr Integration feature.

**Phase 0 — Research (research.md, 8 decisions)**:
- R1: `dapr==1.15.0` SDK (N-2 policy covers runtime 1.14); DaprClient is synchronous — must use BackgroundTasks thread pool
- R2: `pubsub.kafka` v1 component, `authType: "none"`, partition key via `metadata={"partitionKey": user_id}`
- R3: `BackgroundTasks.add_task(_publish_sync, ...)` fire-and-forget pattern
- R4: Jobs API NOT in Python SDK for 1.14 — use `httpx` HTTP to `localhost:3500/v1.0-alpha1/jobs/{name}`
- R5: `state.redis` with `state_metadata={"ttlInSeconds": "300"}`, `delete_state()` for cache invalidation
- R6: `secretstores.kubernetes` component, `get_secret(store_name="kubernetes", key="todo-app-secrets")`
- R7: Frontend uses `http://localhost:3500/v1.0/invoke/todo-backend/method/{path}` — no FastAPI changes
- R8: Dapr control plane Helm 1.14.0, `dapr.io/enabled: "true"` annotation on pods

**Phase 1 — Design (plan.md + 5 artifacts)**:

Architecture introduces a new `backend/dapr/` module:
- `pubsub.py`: `_publish_sync()` + `build_task_event()` + `build_reminder_event()`
- `state.py`: `get_cached_tasks_sync()`, `set_cached_tasks_sync()`, `invalidate_cache_sync()`
- `secrets.py`: `load_secrets_from_dapr()` + `inject_secrets()`
- `jobs.py`: `register_reminder_job()` + `scan_and_publish_reminders()`

**New files**: `backend/routes/jobs.py` (POST /job/reminder-scan)
**Modified files**: `backend/routes/tasks.py` (BackgroundTasks injection + cache), `backend/db.py` (secrets loading + job registration), `backend/main.py` (mount jobs router)
**New K8s files**: `cloud/dapr/components/` (pubsub.yaml, statestore.yaml, kubernetes.yaml)
**Modified Helm**: backend/frontend/kafka-consumer deployments get `dapr.io/` annotations

**Implementation order**: US4 (Secrets) → US1 (Pub/Sub) → US2 (Jobs) → US3 (State Store) → US5 (Service Invocation)

**All Constitution gates pass**: TDD enforced, fail-open runtime + fail-fast startup, no secrets in manifests, type hints required.

## Outcome

- ✅ Impact: Complete implementation plan for all 5 Dapr building blocks — architecture resolves DaprClient sync constraint, Jobs API SDK gap, and secrets fail-fast vs cache fail-open distinction
- 🧪 Tests: n/a (plan stage — test requirements documented in each contract)
- 📁 Files: plan.md, data-model.md, quickstart.md, 4 contract files = 7 artifacts
- 🔁 Next prompts: /sp.tasks (generate tasks.md), then /sp.implement
- 🧠 Reflection: Most critical research finding was R4 — Jobs API absent from Python SDK for Dapr 1.14; httpx direct HTTP approach is clean and isolatable. Secrets startup sequence (inject → get_engine) cleanly reuses existing ValueError fail-fast without any new error handling code.

## Evaluation notes (flywheel)

- Failure modes observed: update-agent-context.ps1 read from unfilled template `specs/002-dapr-integration/plan.md` instead of canonical path; inconsequential since plan is in correct location
- Graders run and results (PASS/FAIL): all 7 Phase 1 artifacts written — structural review PASS
- Prompt variant (if applicable): /sp.plan with pre-completed research.md (Phase 0 already done)
- Next experiment: /sp.tasks — verify task count aligns with ~40-50 estimate across 5 user story phases
