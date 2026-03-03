# Tasks: Dapr Integration

**Input**: Design documents from `specs/phase5-cloud/dapr-integration/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Implementation order**: US4 (Secrets) → US1 (Pub/Sub) → US2 (Jobs) → US3 (State Store) → US5 (Service Invocation)
*US4 first: `load_secrets_from_dapr()` must run before `get_engine()` in lifespan. US1 next: `_publish_sync` is used by US2 reminder publishing.*

**Tests**: Included per Constitution §III (TDD mandatory). Write RED tests before each implementation task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Which user story this task belongs to
- Constitution requires `# [Task]: Txxx [From]: specs/...` comment header in every new file

---

## Phase 1: Setup

**Purpose**: Add Dapr dependencies and create Dapr component YAML files. No code changes yet.

- [X] T001 Add `dapr==1.15.0`, `dapr-ext-fastapi==1.15.0`, `httpx>=0.27` to `backend/pyproject.toml` dependencies section and run `uv sync` to install
- [X] T002 [P] Create `backend/dapr/__init__.py` with package marker comment `# Dapr building-block wrappers`
- [X] T003 [P] Create `cloud/dapr/components/pubsub.yaml` — `pubsub.kafka` v1 component (brokers: kafka:9092, authType: none, consumerGroup: todo-platform-consumers, initialOffset: newest, namespace: todo-platform)
- [X] T004 [P] Create `cloud/dapr/components/statestore.yaml` — `state.redis` v1 component (redisHost: redis-master.todo-platform.svc.cluster.local:6379, redisPassword from secret redis-secret, enableTLS: false, keyPrefix: appid, namespace: todo-platform)
- [X] T005 [P] Create `cloud/dapr/components/kubernetes.yaml` — `secretstores.kubernetes` v1 component (empty metadata array, namespace: todo-platform)

**Checkpoint**: `uv sync` succeeds; 3 component YAML files created under `cloud/dapr/components/`

---

## Phase 2: User Story 4 — Secrets API (Foundational prerequisite)

**Goal**: Load `DATABASE_URL` and `BETTER_AUTH_SECRET` from Dapr Kubernetes Secret Store at application startup; inject into `os.environ` before engine initialization. Fail-fast if DATABASE_URL unavailable from both Dapr and env.

**Independent Test**: Run `uv run pytest backend/tests/test_dapr_secrets.py -v` — all cases GREEN.

- [X] T006 [US4] Write RED tests in `backend/tests/test_dapr_secrets.py` covering all scenarios from `contracts/secrets-contract.md`: (1) Dapr returns dict → values injected, (2) DaprClient raises RpcError → returns `{}` + WARNING logged, (3) inject with empty dict → os.environ unchanged, (4) inject with values → keys added to os.environ, (5) inject skips existing env keys
- [X] T007 [US4] Create `backend/dapr/secrets.py` with `load_secrets_from_dapr() -> dict[str, str]` (DaprClient.get_secret with store_name="kubernetes", key="todo-app-secrets", wrapped in try/except returning `{}` on failure) and `inject_secrets(secrets: dict[str, str]) -> None` (only sets keys not already in os.environ)
- [X] T008 [US4] Modify `backend/db.py` lifespan: import `load_secrets_from_dapr`, `inject_secrets` from `dapr.secrets`; at start of lifespan call `secrets = await asyncio.to_thread(load_secrets_from_dapr)` then `inject_secrets(secrets)` before the `get_engine()` call
- [X] T009 [US4] Run `uv run pytest backend/tests/test_dapr_secrets.py -v` — verify all secrets tests GREEN; run `uv run pytest -v` — verify all existing tests still pass (no regression)

**Checkpoint**: Secrets module exists; db.py injects Dapr secrets before engine init; all tests GREEN.

---

## Phase 3: User Story 1 — Pub/Sub (P1 — MVP)

**Goal**: Replace direct `asyncio.create_task(publish_task_event(...))` calls in routes with `BackgroundTasks.add_task(_publish_sync, ...)`. Each write operation dual-publishes to `task-events` and `task-updates`. Fail-open: API response unaffected by Dapr/Kafka availability.

**Independent Test**: Run `uv run pytest backend/tests/test_dapr_pubsub.py backend/tests/test_routes.py -v` — all GREEN. Verify no `kafka.producer` imports remain in `routes/tasks.py`.

- [X] T010 [US1] Write RED tests in `backend/tests/test_dapr_pubsub.py` covering all scenarios from `contracts/pub-sub-contract.md`: (1) `_publish_sync` calls DaprClient.publish_event with correct pubsub_name/topic_name/data/metadata, (2) exception in DaprClient → logged, no re-raise, (3) `build_task_event("task.updated", ...)` includes `changed_fields` key, (4) `build_task_event("task.created", ...)` omits `changed_fields`, (5) `build_reminder_event(task)` has event_type="reminder.triggered"
- [X] T011 [US1] Create `backend/sidecar/pubsub.py` with: `_publish_sync(pubsub, topic, data, partition_key)` using `with DaprClient() as c: c.publish_event(...)` wrapped in try/except; `build_task_event(event_type, task, changed_fields=None) -> dict`; `build_reminder_event(task) -> dict`
- [X] T012 [US1] Modify `backend/routes/tasks.py`: (1) remove `from kafka.producer import publish_reminder_if_needed, publish_task_event`; (2) add `from sidecar.pubsub import _publish_sync, build_task_event`; (3) add `BackgroundTasks` parameter to `create_task`, `update_task`, `delete_task`, `toggle_complete`; (4) replace each `asyncio.create_task(publish_task_event(...))` with two `background_tasks.add_task(_publish_sync, ...)` calls; (5) remove all `asyncio.create_task(publish_reminder_if_needed(...))` calls
- [X] T013 [US1] Run `uv run pytest backend/tests/test_dapr_pubsub.py backend/tests/test_routes.py -v` — verify pubsub tests GREEN; verify routes tests still GREEN (route tests updated to mock `sidecar.pubsub._publish_sync`; autouse conftest fixture prevents real Dapr connections)

**Checkpoint**: All writes dual-publish via Dapr. No kafka.producer import in routes/tasks.py. 94+ tests GREEN.

---

## Phase 4: User Story 2 — Jobs API (P2)

**Goal**: Register `reminder-scan` job with Dapr Jobs API at startup. Expose `POST /job/reminder-scan` endpoint that Dapr calls every 5 minutes. Scan tasks with `due_date <= now+24h AND completed=False`, publish `reminder.triggered` to `reminders` topic for each unreminded task.

**Independent Test**: `POST /job/reminder-scan` returns 204; run `uv run pytest backend/tests/test_dapr_jobs.py -v` — all GREEN.

- [X] T014 [US2] Write RED tests in `backend/tests/test_dapr_jobs.py` covering all scenarios from `contracts/jobs-contract.md`: (1) `register_reminder_job()` calls httpx.post with correct URL/schedule/data, (2) sidecar unavailable → WARNING logged, no re-raise, (3) `scan_and_publish_reminders` — task due today → `_publish_sync` called + task.id in dedup set, (4) already reminded task → `_publish_sync` NOT called, (5) completed task → `_publish_sync` NOT called, (6) task due >24h → `_publish_sync` NOT called, (7) `POST /job/reminder-scan` → 204 response
- [X] T015 [US2] Create `backend/sidecar/jobs.py` with: module-level `_reminded_task_ids: set[int] = set()`; `register_reminder_job() -> None` (async, httpx.AsyncClient POST to `http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/jobs/reminder-scan`); `scan_and_publish_reminders(session: AsyncSession) -> None` (query + dedup + call `asyncio.to_thread(_publish_sync, ...)` per qualifying task)
- [X] T016 [US2] Create `backend/routes/jobs.py` with `router = APIRouter(tags=["jobs"])` and `@router.post("/job/reminder-scan", status_code=204)` handler that calls `await scan_and_publish_reminders(session)` via `Depends(get_session)`
- [X] T017 [US2] Modify `backend/main.py` to import and include `jobs_router` from `routes.jobs` (mount without prefix — Dapr calls `/job/reminder-scan` at app root)
- [X] T018 [US2] Already wired in T008: `db.py` lifespan imports `register_reminder_job` from `sidecar.jobs` and calls `await register_reminder_job()` (wrapped in try/except for fail-open)
- [X] T019 [US2] Run `uv run pytest backend/tests/test_dapr_jobs.py -v` — 11/11 GREEN; full suite 124/124 GREEN, no regression

**Checkpoint**: `/job/reminder-scan` endpoint mounted; job registration in lifespan; dedup set prevents duplicate reminders. All tests GREEN.

---

## Phase 5: User Story 3 — State Store (P3)

**Goal**: Cache per-user task list in Redis via Dapr State Store (5-min TTL). Cache hit skips DB query (<100ms). Any write invalidates cache. Cache unavailability is transparent to users (fail-open DB fallback).

**Independent Test**: Run `uv run pytest backend/tests/test_dapr_state.py backend/tests/test_routes.py -v` — all GREEN. Verify `list_tasks` test confirms DB not called on cache hit.

- [X] T020 [US3] Write RED tests in `backend/tests/test_dapr_state.py` covering all scenarios from `contracts/state-store-contract.md`: (1) cache hit → deserialized list returned, (2) cache miss (empty data) → None returned, (3) DaprClient raises RpcError → None returned + WARNING, (4) `set_cached_tasks_sync` calls save_state with TTL metadata, (5) `set_cached_tasks_sync` error → no re-raise, (6) `invalidate_cache_sync` calls delete_state with correct store+key
- [X] T021 [US3] Create `backend/sidecar/state.py` with `get_cached_tasks_sync(user_id: str) -> list[dict] | None`, `set_cached_tasks_sync(user_id: str, tasks: list[dict]) -> None` (state_metadata={"ttlInSeconds": "300"}), `invalidate_cache_sync(user_id: str) -> None` — all with DaprClient context manager, all exceptions caught + logged as WARNING
- [X] T022 [US3] Modify `backend/routes/tasks.py` `list_tasks`: add `BackgroundTasks` parameter; add cache-check block: `cached = await asyncio.to_thread(get_cached_tasks_sync, user_id)` → if not None return early; after DB query add `background_tasks.add_task(set_cached_tasks_sync, user_id, ...)`
- [X] T023 [US3] Modify `backend/routes/tasks.py` write handlers (`create_task`, `update_task`, `delete_task`, `toggle_complete`): add `background_tasks.add_task(invalidate_cache_sync, user_id)` call in each handler
- [X] T024 [US3] Add `from sidecar.state import get_cached_tasks_sync, set_cached_tasks_sync, invalidate_cache_sync` import to `backend/routes/tasks.py`
- [X] T025 [US3] Run `uv run pytest backend/tests/test_dapr_state.py backend/tests/test_routes.py -v` — 45/45 GREEN; full suite 138/138 GREEN; sidecar/ coverage 100% (≥80% gate passed)

**Checkpoint**: Cache layer active in list_tasks; writes invalidate cache; fail-open verified. dapr/ coverage ≥80%.

---

## Phase 6: User Story 5 — Service Invocation (P3)

**Goal**: Add Dapr sidecar injection annotations to backend and frontend Helm charts. No FastAPI or Next.js application code changes required — the sidecar is transparent.

**Independent Test**: `helm lint k8s/helm/todo-platform/` passes with 0 errors. Backend deployment YAML contains `dapr.io/enabled: "true"` annotation.

- [X] T026 [P] [US5] Modify `k8s/helm/todo-platform/charts/backend/templates/deployment.yaml` — add Dapr annotations conditionally guarded by `{{ if .Values.dapr.enabled }}`
- [X] T027 [P] [US5] Modify `k8s/helm/todo-platform/charts/frontend/templates/deployment.yaml` — add Dapr annotations conditionally guarded by `{{ if .Values.dapr.enabled }}`
- [X] T028 [P] [US5] Add `dapr: { enabled: false }` section to backend and frontend values.yaml (default false for local dev without Dapr)
- [X] T029 [US5] `helm lint k8s/helm/todo-platform/ --set backend.dapr.enabled=true --set frontend.dapr.enabled=true` — 1 chart linted, 0 failed

**Checkpoint**: Dapr annotations render when `dapr.enabled=true`; Helm lint passes. No Next.js or FastAPI code changed.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, comment headers, full test suite verification, coverage gate.

- [X] T030 [P] All new files in `backend/sidecar/` and `backend/routes/jobs.py` have `# [Task]: Txxx [From]: specs/...` comment headers per Constitution §V
- [X] T031 [P] `helm lint k8s/helm/todo-platform/ --set backend.dapr.enabled=true --set frontend.dapr.enabled=true` — 0 errors confirmed
- [X] T032 Full `uv run pytest -v --tb=short` from `backend/` — 138 passed, 0 failed
- [X] T033 `sidecar/` coverage: jobs.py 100%, pubsub.py 100%, secrets.py 100%, state.py 100% — ≥80% gate PASSED

**Checkpoint**: Full test suite GREEN; dapr/ coverage ≥80%; all new files have task/spec comment headers.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (US4 — Secrets) ← BLOCKS all other user stories (db.py lifespan wiring)
    ↓
Phase 3 (US1 — Pub/Sub, P1) ← MVP deliverable
    ↓
Phase 4 (US2 — Jobs, P2)  ← Depends on US1: uses _publish_sync from dapr/pubsub.py
    ↓
Phase 5 (US3 — State Store, P3) ← Independent of US1/US2; can start after Phase 2
Phase 6 (US5 — Service Invocation, P3) ← Fully independent; annotations only
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|-----------|---------------------|
| US4 (Secrets) | Setup complete | — |
| US1 (Pub/Sub) | US4 complete | — |
| US2 (Jobs) | US1 complete (`_publish_sync` imported) | US3 in parallel |
| US3 (State Store) | US4 complete (db.py lifespan stable) | US2 in parallel |
| US5 (Service Invocation) | Setup complete (annotations only) | US2, US3 in parallel |

### Within Each User Story

1. Write RED tests first — verify they FAIL before implementation
2. Create module file (implement to GREEN)
3. Modify integration points (routes, db.py, main.py)
4. Run tests — verify GREEN + no regression

### Parallel Opportunities

- **Phase 1**: T002-T005 can all run in parallel (different files)
- **Phase 6**: T026-T028 can run in parallel (different YAML files)
- **After Phase 2**: US3 (T020-T025) and US5 (T026-T029) can run in parallel with US2 (T014-T019)
- **Phase 7**: T030-T031 can run in parallel

---

## Parallel Example: Phase 1 Setup

```
Parallel batch 1:
  T002: Create backend/dapr/__init__.py
  T003: Create cloud/dapr/components/pubsub.yaml
  T004: Create cloud/dapr/components/statestore.yaml
  T005: Create cloud/dapr/components/kubernetes.yaml

Then sequential:
  T001: Add dependencies + uv sync (after T002 confirms package path)
```

## Parallel Example: Phase 3 (US1) + Phase 6 (US5) after Phase 2

```
Track A (US1):              Track B (US5, annotations only):
  T010: RED tests             T026: backend deployment.yaml
  T011: pubsub.py             T027: frontend deployment.yaml
  T012: routes/tasks.py       T028: values.yaml
  T013: Run tests             T029: helm lint
```

---

## Implementation Strategy

### MVP First (US4 + US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: US4 Secrets (foundational)
3. Complete Phase 3: US1 Pub/Sub
4. **STOP and VALIDATE**: `uv run pytest -v` — all GREEN; verify dual-publish behavior
5. Deliverable: Dapr replaces direct Kafka producer calls

### Incremental Delivery

1. Phase 1 + 2 → Secrets loading wired
2. Phase 3 → Pub/Sub live (MVP!)
3. Phase 4 → Scheduled reminders active
4. Phase 5 → Cache layer reducing DB load
5. Phase 6 → K8s service routing via Dapr
6. Each phase adds value without breaking previous

### Parallel Team Strategy

After Phase 2 (US4) completes:
- Dev A: US1 Pub/Sub (Phase 3) → US2 Jobs (Phase 4)
- Dev B: US3 State Store (Phase 5) in parallel
- Dev C: US5 Service Invocation (Phase 6) in parallel

---

## Summary

| Phase | Story | Priority | Tasks | Key Files |
|-------|-------|----------|-------|-----------|
| Phase 1 | Setup | — | T001–T005 | pyproject.toml, cloud/dapr/components/ |
| Phase 2 | US4 Secrets | P2 (foundational) | T006–T009 | backend/dapr/secrets.py, db.py |
| Phase 3 | US1 Pub/Sub | P1 (MVP) | T010–T013 | backend/dapr/pubsub.py, routes/tasks.py |
| Phase 4 | US2 Jobs | P2 | T014–T019 | backend/dapr/jobs.py, routes/jobs.py, main.py, db.py |
| Phase 5 | US3 State Store | P3 | T020–T025 | backend/dapr/state.py, routes/tasks.py |
| Phase 6 | US5 Service Invocation | P3 | T026–T029 | charts/*/deployment.yaml, values.yaml |
| Phase 7 | Polish | — | T030–T033 | All new files |

**Total tasks**: 33 (T001–T033)
**TDD**: RED tests before every implementation (T006, T010, T014, T020)
**Parallel opportunities**: 8 tasks marked [P] across phases 1, 6, 7

---

## Notes

- `[P]` tasks operate on different files with no incomplete dependencies — safe to parallelize
- Constitution §III: write tests FIRST and verify they FAIL before writing implementation
- Constitution §V: every new `.py` file needs `# [Task]: Txxx [From]: specs/...` header
- `DaprClient` is synchronous — never call it directly in `async def` without `asyncio.to_thread()` or `BackgroundTasks.add_task()`
- Fail-open default: all Dapr calls at runtime (pub-sub, cache) wrapped in try/except; only `DATABASE_URL` missing triggers fail-fast
- Run `uv run pytest -v` after EACH phase to catch regressions early
