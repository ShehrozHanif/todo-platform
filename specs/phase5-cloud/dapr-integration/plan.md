# Implementation Plan: Dapr Integration

**Branch**: `002-dapr-integration` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/phase5-cloud/dapr-integration/spec.md`

---

## Summary

Replace direct Kafka producer calls, add distributed caching, secrets loading, scheduled job scanning, and name-based service routing using Dapr 1.14 building blocks. The backend (`FastAPI + Python 3.13`) gains a new `backend/dapr/` module providing thin wrappers over the Dapr sidecar HTTP/gRPC APIs. Routes receive minor augmentation (BackgroundTasks injection for publish, cache read/write around `list_tasks`). Kubernetes pod specs receive `dapr.io/` annotations for sidecar injection. New Dapr component YAML files are added under `cloud/dapr/components/`. No breaking changes to the public API surface.

---

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript strict (frontend)
**Primary Dependencies**:
- `dapr==1.15.0` — Python SDK (N-2: covers Dapr runtime 1.13–1.15)
- `dapr-ext-fastapi==1.15.0` — DaprApp wrapper for subscription handlers
- `httpx>=0.27` — async HTTP for Jobs API (SDK has no Jobs API until 1.16)
- `python-dotenv` — existing local dev secret loading
- Existing: FastAPI, SQLModel, asyncpg, aiokafka, pytest

**Storage**:
- Neon PostgreSQL (existing, authoritative task data)
- Redis — Dapr State Store (`state.redis`) for per-user task list cache (5-min TTL)
- Kafka — Dapr Pub/Sub transport (`pubsub.kafka`), topology unchanged

**Testing**: pytest + pytest-asyncio + httpx AsyncClient (existing)
**Target Platform**: Kubernetes (Minikube local dev, AKS/GKE production); Dapr sidecar injected per pod
**Project Type**: Web backend (FastAPI) + Kubernetes manifests
**Performance Goals**: Cache hit responses <100ms (SC-002); publish latency zero impact on API (SC-006)
**Constraints**:
- DaprClient is **synchronous only** through SDK 1.15 — must offload to thread pool (BackgroundTasks)
- Jobs API unavailable in Python SDK for Dapr 1.14 — use `httpx` HTTP to `localhost:3500/v1.0-alpha1/jobs/{name}`
- Secrets fail-fast at startup; Pub/Sub + Cache fail-open at runtime
**Scale/Scope**: Per-user cache keys (one Redis key per user), 3 Kafka topics, 1 scheduled job

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| SDD artifacts exist before code | ✅ PASS | spec.md + research.md complete |
| No hardcoded secrets | ✅ PASS | Dapr Secrets replaces env vars; fallback to `.env` for local dev only |
| Type hints on all functions | ✅ PASS | All new `dapr/` module functions will have type hints |
| TDD: Tests written before implementation | ✅ PASS | Test tasks precede impl tasks in tasks.md |
| Minimum 80% test coverage | ✅ PASS | dapr/ module unit-tested with DaprClient mock |
| Stateless server | ✅ PASS | Reminder dedup set is in-process (acceptable: spec allows within session) |
| No local filesystem dependencies | ✅ PASS | Dapr components use YAML config, not filesystem |
| API endpoints return proper HTTP codes | ✅ PASS | `/job/reminder-scan` returns 204 or 200 |
| No breaking changes to existing public API | ✅ PASS | All current endpoint contracts preserved |

**Post-design re-check**: All gates pass. DaprClient sync-to-thread offloading satisfies stateless + async constraints. Fail-open (cache/pub-sub) + fail-fast (secrets) distinction matches spec FR-008 + FR-011.

---

## Project Structure

### Documentation (this feature)

```text
specs/phase5-cloud/dapr-integration/
├── plan.md              # This file
├── research.md          # Phase 0 — R1–R8 decisions
├── data-model.md        # Phase 1 — Dapr entity model
├── quickstart.md        # Phase 1 — Local dev with Dapr CLI
├── contracts/           # Phase 1 — Component contracts
│   ├── pub-sub-contract.md
│   ├── state-store-contract.md
│   ├── jobs-contract.md
│   └── secrets-contract.md
└── tasks.md             # Phase 2 — /sp.tasks output (not created here)
```

### Source Code (repository root)

```text
backend/
├── dapr/
│   ├── __init__.py           # Package marker
│   ├── pubsub.py             # _publish_sync() — thread-safe DaprClient wrapper
│   ├── state.py              # get_cached_tasks(), set_cached_tasks(), invalidate_cache()
│   ├── secrets.py            # load_secrets_from_dapr() — startup secret loading
│   └── jobs.py               # register_reminder_job(), scan_and_publish_reminders()
├── routes/
│   ├── tasks.py              # MODIFIED: BackgroundTasks + cache read/write/invalidate
│   └── jobs.py               # NEW: POST /job/reminder-scan handler
├── db.py                     # MODIFIED: Dapr secrets + job registration in lifespan
├── main.py                   # MODIFIED: mount jobs router
├── tests/
│   ├── test_dapr_pubsub.py   # Unit tests for pubsub.py (DaprClient mocked)
│   ├── test_dapr_state.py    # Unit tests for state.py (DaprClient mocked)
│   ├── test_dapr_secrets.py  # Unit tests for secrets.py
│   ├── test_dapr_jobs.py     # Unit tests for jobs.py + /job/reminder-scan endpoint
│   └── test_routes.py        # EXTENDED: cache behavior assertions
└── pyproject.toml            # MODIFIED: add dapr, dapr-ext-fastapi, httpx

cloud/dapr/
├── components/
│   ├── pubsub.yaml           # pubsub.kafka v1 — Kafka pub/sub component
│   ├── statestore.yaml       # state.redis v1 — Redis state store
│   └── kubernetes.yaml       # secretstores.kubernetes v1 — K8s secret store
└── subscriptions/
    └── (empty — consumers use Dapr subscription model, not producer)

k8s/helm/todo-platform/
├── templates/
│   ├── backend-deployment.yaml    # MODIFIED: add dapr.io/ annotations
│   ├── frontend-deployment.yaml   # MODIFIED: add dapr.io/ annotations (US5)
│   └── kafka-consumer-deployment.yaml  # MODIFIED: add dapr.io/ annotations
└── values.yaml                    # MODIFIED: dapr.enabled toggle
```

---

## Component Architecture

### US1 — Pub/Sub (Replace Direct Kafka Producer)

**Current flow** (to replace):
```
routes/tasks.py → asyncio.create_task(publish_task_event("task.created", task))
                → kafka/producer.py → AIOKafkaProducer.send()
```

**New flow**:
```
routes/tasks.py → background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", data, user_id)
               → dapr/pubsub.py._publish_sync() → DaprClient().publish_event() [thread pool]
                                                 → Dapr sidecar → Kafka broker
```

**Key design decisions** (from R1, R3):
- `BackgroundTasks.add_task()` delegates `_publish_sync` to FastAPI's internal thread executor — avoids blocking the asyncio event loop
- `DaprClient` is instantiated inside `_publish_sync` using context manager (`with DaprClient() as c:`) — no long-lived client singleton
- Each route that previously called `publish_task_event` now adds two background tasks: one for `task-events`, one for `task-updates` (dual-publish per FR-002)
- `publish_reminder_if_needed` logic moves to `dapr/jobs.py` and is triggered by the scheduler, not by route handlers

**Dapr component** (`cloud/dapr/components/pubsub.yaml`):
- `type: pubsub.kafka`, `version: v1`
- `brokers: kafka:9092`, `authType: none`, `consumerGroup: todo-platform-consumers`
- `initialOffset: newest`

---

### US2 — Jobs API (Scheduled Reminder Scan)

**Registration** (lifespan startup):
```python
# db.py lifespan → calls register_reminder_job()
async def register_reminder_job() -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/jobs/reminder-scan",
            json={"schedule": "@every 5m", "data": {"type": "reminder_scan"}},
        )
```

**Job handler** (new endpoint):
```python
# routes/jobs.py
@router.post("/job/reminder-scan", status_code=204)
async def handle_reminder_scan(session: AsyncSession = Depends(get_session)):
    await scan_and_publish_reminders(session)
```

**Scan logic** (`dapr/jobs.py`):
- Query: `Task.due_date <= today + 24h AND Task.completed == False`
- In-process dedup set `_reminded_task_ids: set[int]` (process lifetime, per spec assumption)
- For each qualifying task not in set: call `_publish_sync("kafka-pubsub", "reminders", payload, user_id)` + add to set

---

### US3 — State Store (Per-User Task Cache)

**Cache key**: `f"tasks:{user_id}"` (stored as `todo-backend||tasks:{user_id}` in Redis)
**TTL**: 300 seconds (5 minutes), passed via `state_metadata={"ttlInSeconds": "300"}`

**`list_tasks` flow**:
```python
# 1. Try cache
cached = await get_cached_tasks(user_id)
if cached is not None:
    return cached  # <100ms cache hit

# 2. Cache miss: query DB
tasks = await db_query(...)

# 3. Store in cache (background — non-blocking)
background_tasks.add_task(_save_cache_sync, user_id, tasks)
return tasks
```

**Write invalidation** (create/update/delete/toggle):
```python
# At end of each write handler (after DB commit):
background_tasks.add_task(_invalidate_cache_sync, user_id)
```

**Fail-open wrapper** (`dapr/state.py`):
```python
def get_cached_tasks(user_id: str) -> list[dict] | None:
    try:
        with DaprClient() as c:
            resp = c.get_state("statestore", f"tasks:{user_id}")
            if resp.data:
                return json.loads(resp.data)
    except Exception as exc:
        logger.warning("State store get failed: %s", exc)
    return None  # triggers DB fallback
```

---

### US4 — Secrets API (Startup Secret Loading)

**Execution order in `db.py` lifespan**:
```
1. load_secrets_from_dapr()  → returns {"DATABASE_URL": "...", "BETTER_AUTH_SECRET": "..."}
2. Inject into os.environ     → existing get_engine() reads os.environ["DATABASE_URL"]
3. get_engine()               → builds AsyncEngine with correct DATABASE_URL
4. create tables + migrations
5. init Kafka producer (if KAFKA_BOOTSTRAP_SERVERS set)
6. register_reminder_job()
```

**Fail-fast**: If Dapr secrets unavailable AND `DATABASE_URL` not in env → `ValueError` → app exits non-zero (matches FR-011, existing `get_engine()` already raises ValueError).

**Local dev fallback**: `load_secrets_from_dapr()` wraps in `try/except`; on failure returns `{}` (empty dict). `python-dotenv` has already loaded `.env` before lifespan runs → `os.environ` already has `DATABASE_URL` → no failure.

---

### US5 — Service Invocation (Kubernetes Annotations Only)

**No application code changes required.** FastAPI receives forwarded requests on port 8000 — the Dapr sidecar is transparent.

Kubernetes deployment annotation additions:
```yaml
# backend-deployment.yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "todo-backend"
  dapr.io/app-port: "8000"
  dapr.io/log-level: "info"

# frontend-deployment.yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "todo-frontend"
  dapr.io/app-port: "3000"
  dapr.io/log-level: "info"
```

Frontend calling pattern (Next.js API routes, no hardcoded backend URL):
```typescript
const DAPR_PORT = process.env.DAPR_HTTP_PORT ?? "3500";
const res = await fetch(
  `http://localhost:${DAPR_PORT}/v1.0/invoke/todo-backend/method/api/${userId}/tasks`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## Implementation Phases

### Phase 0 — Research ✅ (complete)
All 8 unknowns resolved in `research.md`.

### Phase 1 — Design & Contracts ✅ (this document)

Deliverables:
- [x] `plan.md` — architecture plan (this document)
- [x] `data-model.md` — Dapr entity model
- [x] `contracts/pub-sub-contract.md`
- [x] `contracts/state-store-contract.md`
- [x] `contracts/jobs-contract.md`
- [x] `contracts/secrets-contract.md`
- [x] `quickstart.md` — local dev with Dapr CLI

### Phase 2 — Tasks (`/sp.tasks`)
To be generated by `/sp.tasks` command. Estimated 40–50 tasks across 6 user story phases plus setup.

---

## Dependency Graph

```
US4 (Secrets) → must complete before engine init → blocks all other US
US1 (Pub/Sub) → independent of US2/US3/US5
US2 (Jobs)    → depends on US1 (uses same _publish_sync for reminders)
US3 (State)   → depends on DB (list_tasks must exist) → add cache layer
US5 (Service Invocation) → independent (annotations only, no code deps)
```

Recommended implementation order: US4 → US1 → US2 → US3 → US5

---

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| `backend/dapr/` module | Isolate Dapr concerns from routes; allows mocking in tests | Inline DaprClient in routes would make testing impractical and violate separation of concerns |
| `routes/jobs.py` separate file | Dapr job callback endpoint is distinct from task CRUD | Adding to `routes/tasks.py` would conflate two separate concerns |
| `httpx` for Jobs API | Python SDK has no Jobs API until 1.16 | Cannot use `DaprClient.schedule_job()` — method does not exist in 1.15 |
| Thread-based publish | DaprClient is synchronous | No async DaprClient exists; cannot `await client.publish_event()` |

---

## Risk Analysis

1. **Dapr sidecar not available in local dev** — Mitigated by fail-open design for all runtime calls (pub-sub, cache); fail-fast only at startup for secrets. Developers without Dapr CLI can still run app via `python-dotenv` fallback.
2. **Redis unavailable in Kubernetes** — Cache miss falls through to DB (FR-008); zero user-visible errors (SC-007).
3. **Jobs API alpha endpoint changes** — `/v1.0-alpha1/jobs/` may change in Dapr 1.16. Mitigated by isolating in `dapr/jobs.py`; upgrade path is `DaprClient.schedule_job()` swap with no behavioral changes.
