---
id: 011
title: Dapr Integration Full Implementation
stage: green
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: dapr-integration
branch: 002-dapr-integration
user: Shehroz Hanif
command: /sp.implement
labels: ["dapr","pubsub","state-store","jobs","secrets","tdd","fastapi","helm"]
links:
  spec: specs/phase5-cloud/dapr-integration/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - backend/sidecar/__init__.py
  - backend/sidecar/secrets.py
  - backend/sidecar/pubsub.py
  - backend/sidecar/jobs.py
  - backend/sidecar/state.py
  - backend/routes/jobs.py
  - backend/routes/tasks.py
  - backend/main.py
  - backend/db.py
  - backend/tests/conftest.py
  - backend/tests/test_dapr_secrets.py
  - backend/tests/test_dapr_pubsub.py
  - backend/tests/test_dapr_jobs.py
  - backend/tests/test_dapr_state.py
  - backend/tests/test_routes.py
  - cloud/dapr/components/pubsub.yaml
  - cloud/dapr/components/statestore.yaml
  - cloud/dapr/components/kubernetes.yaml
  - k8s/helm/todo-platform/charts/backend/templates/deployment.yaml
  - k8s/helm/todo-platform/charts/frontend/templates/deployment.yaml
  - k8s/helm/todo-platform/charts/backend/values.yaml
  - k8s/helm/todo-platform/charts/frontend/values.yaml
  - specs/phase5-cloud/dapr-integration/tasks.md
tests:
  - backend/tests/test_dapr_secrets.py (8 tests — 100% coverage)
  - backend/tests/test_dapr_pubsub.py (11 tests — 100% coverage)
  - backend/tests/test_dapr_jobs.py (11 tests — 100% coverage)
  - backend/tests/test_dapr_state.py (14 tests — 100% coverage)
  - backend/tests/test_routes.py (31 tests — updated to Dapr mocking pattern)
  - Full suite: 138 passed, 0 failed
---

## Prompt

/sp.implement (continued from previous session)

Executing all 33 tasks in specs/phase5-cloud/dapr-integration/tasks.md for the Dapr Integration feature. Implementation covers: Pub/Sub replacement of direct Kafka producer calls, Dapr Jobs API for scheduled reminder scanning, Dapr State Store for task list caching, Dapr Secrets for DATABASE_URL/BETTER_AUTH_SECRET injection, and Service Invocation via Helm chart annotations.

## Response snapshot

Completed all 33 tasks (T001-T033) across 7 phases:

**Phase 1 (Setup)**: Added dapr==1.15.0, dapr-ext-fastapi==1.15.0 to pyproject.toml; created Dapr component YAMLs for pubsub (kafka), statestore (redis), and kubernetes secrets.

**Critical fix**: Renamed `backend/dapr/` → `backend/sidecar/` to prevent the local package from shadowing the installed `dapr` SDK (pythonpath="." in pyproject.toml caused `from dapr.clients import DaprClient` to resolve to the local package). All imports use `sidecar.*`.

**Phase 2 (US4 — Secrets)**: Created `sidecar/secrets.py` with `load_secrets_from_dapr()` and `inject_secrets()`. Modified `db.py` lifespan to load secrets before `get_engine()`. 8/8 tests GREEN.

**Phase 3 (US1 — Pub/Sub)**: Created `sidecar/pubsub.py` with `_publish_sync()`, `build_task_event()`, `build_reminder_event()`. Replaced all `asyncio.create_task(publish_task_event(...))` in routes/tasks.py with dual `background_tasks.add_task(_publish_sync, "kafka-pubsub", {topic}, event, user_id)` calls. Updated 6 test_routes.py tests to mock `routes.tasks._publish_sync` instead of old `publish_task_event` AsyncMock. Added `stub_dapr_client` autouse fixture in conftest.py to prevent real Dapr sidecar connections during background task execution. 11/11 pubsub tests GREEN, all 31 route tests GREEN.

**Phase 4 (US2 — Jobs)**: Created `sidecar/jobs.py` with `register_reminder_job()` (httpx POST to Dapr Jobs API) and `scan_and_publish_reminders()` (DB query + dedup set + asyncio.to_thread publish). Created `routes/jobs.py` and mounted it in main.py without prefix. 11/11 jobs tests GREEN.

**Phase 5 (US3 — State Store)**: Created `sidecar/state.py` with `get_cached_tasks_sync()`, `set_cached_tasks_sync()` (5-min TTL), `invalidate_cache_sync()`. Modified `list_tasks` to check cache first (unfiltered queries only) and added cache invalidation to all 4 write handlers. Extended conftest autouse fixture to also stub `sidecar.state.DaprClient`. 14/14 state tests GREEN.

**Phase 6 (US5 — Service Invocation)**: Added `dapr.io/` annotations to backend and frontend Helm deployment.yaml (guarded by `{{ if .Values.dapr.enabled }}`). Added `dapr: { enabled: false }` to both values.yaml. `helm lint` passed with 0 errors.

**Phase 7 (Polish)**: All files have `# [Task]: Txxx` headers. 138/138 tests GREEN. sidecar/ coverage 100% (all 4 modules).

**Key patterns established**:
- DaprClient is sync-only → always use BackgroundTasks.add_task() or asyncio.to_thread()
- Test stubs: autouse `stub_dapr_client` fixture patches both sidecar.pubsub.DaprClient and sidecar.state.DaprClient globally; individual tests override with inner patch()
- AsyncMock.exec().all() returns coroutine (not list) → mock exec.return_value as plain MagicMock

## Outcome

- ✅ Impact: All 5 Dapr building blocks implemented (Secrets, Pub/Sub, Jobs, State Store, Service Invocation). Direct Kafka producer calls replaced with Dapr Pub/Sub. Task list caching active. Scheduled reminder scanning via Dapr Jobs API. Helm charts annotated for sidecar injection.
- 🧪 Tests: 138 passed (8 secrets + 11 pubsub + 11 jobs + 14 state + 31 routes + 63 existing). sidecar/ modules at 100% coverage.
- 📁 Files: 8 new files (4 sidecar modules, 1 route, 3 Dapr YAML components); 8 modified files (routes/tasks.py, main.py, db.py, conftest.py, test_routes.py, 2 Helm deployments, 2 values.yaml)
- 🔁 Next prompts: /sp.git.commit_pr to commit and push the dapr-integration branch; then start cloud-deployment feature
- 🧠 Reflection: Package naming conflict (local dapr/ shadowing SDK) was the critical early blocker. AsyncMock.return_value chain behavior requires explicit MagicMock assignment for sync .all() calls. BackgroundTasks with sync functions run via thread pool in ASGI test environment — no asyncio.sleep() needed but DaprClient connections must be stubbed to prevent hangs.

## Evaluation notes (flywheel)

- Failure modes observed: (1) dapr/ package name shadows SDK — resolved by renaming to sidecar/; (2) BackgroundTasks without a default must precede optional params in Python function signatures; (3) AsyncMock child attributes are AsyncMock — exec().all() returns coroutine, not list
- Graders run and results (PASS/FAIL): uv run pytest -v → 138 PASS; helm lint → 0 errors PASS; sidecar/ coverage 100% PASS
- Prompt variant (if applicable): sp.implement continuation from compacted session
- Next experiment: Test cache hit path with real Redis in integration environment
