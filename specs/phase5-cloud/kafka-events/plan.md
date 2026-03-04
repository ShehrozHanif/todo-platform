# Implementation Plan: Kafka Event Streaming

**Branch**: `001-kafka-events` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/phase5-cloud/kafka-events/spec.md`

---

## Summary

Add Kafka event streaming to the todo platform. Every task CRUD operation in the FastAPI backend publishes a structured JSON event to two topics (`task-events` and `task-updates`). Reminder events are published synchronously at task save time when the due date is within 24 hours. A standalone consumer service subscribes to all three topics and logs events to stdout. Infrastructure: Bitnami Kafka in KRaft mode (no ZooKeeper) via Docker Compose for local dev; Helm subchart for Kubernetes.

**Stack**: aiokafka 0.11+, Python 3.13+, Bitnami Kafka 3.7 (KRaft), Docker Compose, Helm

---

## Technical Context

**Language/Version**: Python 3.13+ with UV package manager (backend + consumer service)
**Primary Dependencies**: aiokafka 0.11+ (producer + consumer + admin client), FastAPI (existing), aiofiles (N/A)
**Storage**: Kafka append-only (no DB changes); existing Neon PostgreSQL unchanged
**Testing**: pytest + pytest-asyncio + AsyncMock (backend), pytest (consumer service)
**Target Platform**: Linux container (Docker Compose local, Kubernetes/Helm production)
**Project Type**: Web application (extending existing FastAPI backend + new standalone service)
**Performance Goals**: Event publish within 1s of API response (SC-001); consumer processes within 2s of publish
**Constraints**: Zero API failures from Kafka (SC-002); fire-and-forget publish; producer fail-open at startup
**Scale/Scope**: 3 topics, 3 partitions each; single-broker local; 1 consumer service with 3 async tasks

---

## Constitution Check

*GATE: Must pass before implementation begins. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| SDD cycle complete (specify → clarify → plan) | ✅ PASS | spec.md + clarifications done; this is plan |
| No code without Task ID | ✅ PASS | tasks.md will be created next via `/sp.tasks` |
| All code files reference Task + Spec | ✅ PASS | enforced at implementation time |
| No hardcoded secrets | ✅ PASS | `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_TOPIC_PREFIX` via `.env` |
| Type hints on all Python functions | ✅ PASS | enforced at implementation time |
| TDD — tests written before implementation | ✅ PASS | test tasks precede impl tasks in tasks.md |
| 80% test coverage minimum | ✅ PASS | producer + consumer unit tests + routes integration |
| Stateless server design | ✅ PASS | in-memory `_reminded_tasks` is acceptable (spec FR-010, Clarification Q3) |
| Smallest viable change | ✅ PASS | extending existing lifespan, no new frameworks |
| Shared core architecture | ⚠️ NOTE | Constitution §II says "Phase V: Core publishes Kafka events". Producer lives in `backend/kafka/` not `core/`. Justified: Kafka is an I/O side-effect of the API layer, not business logic. `core/` contains task CRUD logic only. |

**Constitution Check: PASS** (with noted deviation justified above)

---

## Project Structure

### Documentation (this feature)

```text
specs/phase5-cloud/kafka-events/
├── spec.md              # Feature requirements (+ clarifications)
├── plan.md              # This file
├── research.md          # Phase 0 decisions
├── data-model.md        # Event schemas + entity definitions
├── quickstart.md        # Local dev setup guide
├── contracts/
│   ├── producer-api.md  # Producer function contracts
│   └── consumer-api.md  # Consumer service contract
└── tasks.md             # (created by /sp.tasks — not yet)
```

### Source Code (new files)

```text
backend/
└── kafka/
    ├── __init__.py          # T002: exports publish_task_event, publish_reminder_if_needed
    ├── events.py            # T003: event dataclasses + serialize helpers
    ├── topics.py            # T004: AIOKafkaAdminClient topic creation
    └── producer.py          # T005: AIOKafkaProducer singleton, fire-and-forget

kafka-consumer/
├── consumers/
│   ├── __init__.py
│   ├── task_events.py       # T009: task-events handler
│   ├── reminders.py         # T010: reminders handler
│   └── task_updates.py      # T011: task-updates handler
├── main.py                  # T012: asyncio runner, 3 tasks, graceful shutdown
├── pyproject.toml           # T013: aiokafka dependency, Python 3.13+
├── Dockerfile               # T014: multi-stage Python image
└── .env.example             # KAFKA_BOOTSTRAP_SERVERS, KAFKA_TOPIC_PREFIX

cloud/kafka/
├── docker-compose.kafka.yml     # T015: Bitnami Kafka KRaft single-broker
└── helm/
    └── kafka-consumer/          # T016: Helm subchart for consumer K8s deployment
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
            ├── deployment.yaml
            ├── configmap.yaml
            └── secret.yaml
```

### Modified Files

```text
backend/
├── db.py               # T006: extend lifespan → init/shutdown Kafka producer
└── routes/tasks.py     # T007: add publish_task_event + publish_reminder calls
```

### Test Files

```text
backend/tests/
└── test_kafka_producer.py   # T001: producer unit tests (mock AIOKafkaProducer)
    + test_routes.py         # T008: extend existing routes tests with publish assertions

kafka-consumer/tests/
├── __init__.py
└── test_consumers.py        # T001 (consumer): handler unit tests, DLQ, offset commit
```

---

## Complexity Tracking

| Component | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Standalone consumer service | FR-012, FR-020 — consumer must be independently deployable | Embedding consumer in backend breaks FR-020 and couples restart lifecycles |
| Module-level producer singleton | Reused across all route handlers; lifespan managed | Dependency injection per-request would create/destroy a producer per request (very slow) |
| AIOKafkaAdminClient at startup | FR-017 — topics must exist before first message | Auto-creation via broker config risks race conditions on first message |

---

## Phase 0: Research Summary

All unknowns resolved. See [research.md](research.md) for full rationale.

| Decision | Outcome | Reference |
|----------|---------|-----------|
| Kafka client library | aiokafka 0.11+ (native asyncio) | R1 |
| Producer pattern | Module singleton, fire-and-forget `send()` | R2 |
| Topic creation | AIOKafkaAdminClient at startup | R3 |
| Consumer pattern | 3 asyncio Tasks, manual offset commit | R4 |
| Kafka Docker image | bitnami/kafka:3.7 KRaft mode | R5 |
| Reminder de-duplication | In-memory set (Clarification Q3) | R6 |
| Lifespan integration | Extend existing db.py lifespan | R7 |
| Testing strategy | AsyncMock producer, handler unit tests | R8 |

---

## Phase 1: Design

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI Backend (backend/)                                     │
│                                                                 │
│  routes/tasks.py                                                │
│  ├── create_task()  → publish_task_event("task.created", task)  │
│  │                    publish_reminder_if_needed(task)          │
│  ├── update_task()  → publish_task_event("task.updated", task,  │
│  │                        changed_fields=[...])                 │
│  │                    publish_reminder_if_needed(task)          │
│  ├── delete_task()  → publish_task_event("task.deleted", task)  │
│  └── toggle()       → publish_task_event("task.completed" /     │
│                           "task.reopened", task)               │
│                                                                 │
│  kafka/producer.py                                              │
│  ├── _producer: AIOKafkaProducer (singleton)                    │
│  ├── _reminded_tasks: set[int]  (in-memory dedup)               │
│  ├── publish_task_event(event_type, task, changed_fields)       │
│  │   └── send to task-events + task-updates (fire-and-forget)   │
│  └── publish_reminder_if_needed(task)                           │
│      └── send to reminders (if qualifies + not deduped)        │
│                                                                 │
│  kafka/topics.py                                                │
│  └── create_topics(bootstrap_servers) → AIOKafkaAdminClient    │
│                                                                 │
│  db.py::lifespan()                                              │
│  └── startup: create_topics → init_producer                    │
│      shutdown: shutdown_producer                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ publishes to
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Kafka Broker (bitnami/kafka:3.7, KRaft mode)                   │
│  ├── task-events   (3 partitions, retention: 7d)                │
│  ├── reminders     (3 partitions, retention: 24h)               │
│  └── task-updates  (3 partitions, retention: 1h)                │
└────────────────────────┬────────────────────────────────────────┘
                         │ consumed by
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Kafka Consumer Service (kafka-consumer/)                       │
│                                                                 │
│  main.py                                                        │
│  └── asyncio.gather(                                            │
│        consume("task-events", "todo-consumer-task-events",      │
│                handle_task_event),                              │
│        consume("reminders", "todo-consumer-reminders",          │
│                handle_reminder_event),                          │
│        consume("task-updates", "todo-consumer-task-updates",    │
│                handle_task_update)                              │
│      )                                                          │
│                                                                 │
│  Processing loop (per consumer):                                │
│  ├── Decode + parse JSON                                        │
│  ├── Call handler → log to stdout                               │
│  ├── On error → log to stderr (DLQ) (Clarification Q2)          │
│  └── commit() always — at-least-once (FR-013)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Lifespan Extension

```python
# backend/db.py — extend existing lifespan()
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- existing DB setup ---
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Task.__table__.create, checkfirst=True)
        # ... other tables
    if "sqlite" not in str(engine.url):
        await _migrate_task_columns(engine)

    # --- NEW: Kafka setup ---
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")
    if bootstrap:
        try:
            from kafka.topics import create_topics
            from kafka.producer import init_producer
            await create_topics(bootstrap)
            await init_producer()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Kafka unavailable at startup — events disabled: %s", exc
            )

    yield

    # --- NEW: Kafka teardown ---
    from kafka.producer import shutdown_producer
    await shutdown_producer()

    # --- existing DB teardown ---
    await engine.dispose()
    set_engine(None)
```

### Routes Integration

After each successful DB operation in `routes/tasks.py`, add fire-and-forget publish calls:

```python
# After create:
await publish_task_event("task.created", task)
await publish_reminder_if_needed(task)

# After update:
await publish_task_event("task.updated", task, changed_fields=changed)
await publish_reminder_if_needed(task)  # re-check on update

# After delete:
await publish_task_event("task.deleted", task)

# After toggle complete:
event_type = "task.completed" if task.completed else "task.reopened"
await publish_task_event(event_type, task)
```

### Docker Compose (Kafka only)

```yaml
# cloud/kafka/docker-compose.kafka.yml
services:
  kafka:
    image: bitnami/kafka:3.9
    container_name: todo-kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_CFG_NODE_ID: "0"
      KAFKA_CFG_PROCESS_ROLES: "broker,controller"
      KAFKA_CFG_LISTENERS: "PLAINTEXT://:9092,CONTROLLER://:9093"
      KAFKA_CFG_ADVERTISED_LISTENERS: "PLAINTEXT://kafka:9092"
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
      KAFKA_CFG_INTER_BROKER_LISTENER_NAME: "PLAINTEXT"
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: "0@kafka:9093"
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR: "1"
      KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: "1"
      KAFKA_CFG_TRANSACTION_STATE_LOG_MIN_ISR: "1"
    volumes:
      - kafka-data:/bitnami/kafka
    healthcheck:
      test: ["CMD-SHELL", "kafka-topics.sh --list --bootstrap-server localhost:9092 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 30s

  kafka-consumer:
    build:
      context: ../../kafka-consumer
      dockerfile: Dockerfile
    depends_on:
      kafka:
        condition: service_healthy
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    profiles: ["consumer"]   # opt-in: docker compose --profile consumer up

volumes:
  kafka-data:
```

### Helm Subchart Design

New subchart at `cloud/kafka/helm/kafka-consumer/` following the same pattern as `k8s/helm/todo-platform/charts/backend/`:

- `Chart.yaml`: name: kafka-consumer, version 0.1.0
- `values.yaml`: image, replicaCount=1, env.KAFKA_BOOTSTRAP_SERVERS, resources
- `templates/deployment.yaml`: single container, no liveness HTTP probe (stdout service) — use process check
- `templates/configmap.yaml`: KAFKA_BOOTSTRAP_SERVERS, KAFKA_TOPIC_PREFIX
- `templates/secret.yaml`: placeholder (no secrets needed in Phase 5)

---

## Implementation Order (Task Sequence)

```
T001 — Tests: producer unit tests (mock AIOKafkaProducer)       [RED]
T002 — Tests: consumer handler unit tests (DLQ, offset commit)  [RED]
T003 — Tests: routes integration — assert publish called        [RED]
T004 — Impl:  backend/kafka/events.py (dataclasses, serializer) [GREEN]
T005 — Impl:  backend/kafka/topics.py (AIOKafkaAdminClient)     [GREEN]
T006 — Impl:  backend/kafka/producer.py (singleton, fire-and-forget) [GREEN]
T007 — Impl:  backend/kafka/__init__.py (public exports)        [GREEN]
T008 — Impl:  backend/db.py — extend lifespan (fail-open)       [GREEN]
T009 — Impl:  backend/routes/tasks.py — inject publish calls    [GREEN]
T010 — Impl:  kafka-consumer/consumers/task_events.py           [GREEN]
T011 — Impl:  kafka-consumer/consumers/reminders.py             [GREEN]
T012 — Impl:  kafka-consumer/consumers/task_updates.py          [GREEN]
T013 — Impl:  kafka-consumer/main.py (runner, graceful shutdown) [GREEN]
T014 — Impl:  kafka-consumer/pyproject.toml + Dockerfile        [GREEN]
T015 — Impl:  cloud/kafka/docker-compose.kafka.yml              [GREEN]
T016 — Impl:  cloud/kafka/helm/kafka-consumer/ (Helm subchart)  [GREEN]
T017 — Refactor: review all Kafka code for DRY + error handling [REFACTOR]
```

---

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| aiokafka version incompatibility with Python 3.13 | High | Pin to aiokafka 0.11; test in CI |
| Kafka producer blocks event loop during broker reconnect | Medium | `request_timeout_ms=5000` + fire-and-forget with `ensure_future` pattern |
| In-memory `_reminded_tasks` grows unboundedly | Low | Phase 5 scope; set can be capped or scheduled for cleanup (deferred to Phase 5 maintenance) |
| Consumer restart re-processes events | Low | Consumer handlers are idempotent (log-only, SC-006) |

---

## Artifacts Summary

| Artifact | Path | Status |
|----------|------|--------|
| Spec | `specs/phase5-cloud/kafka-events/spec.md` | ✅ Complete |
| Clarifications | `specs/phase5-cloud/kafka-events/spec.md §Clarifications` | ✅ 4 questions resolved |
| Research | `specs/phase5-cloud/kafka-events/research.md` | ✅ Complete |
| Data Model | `specs/phase5-cloud/kafka-events/data-model.md` | ✅ Complete |
| Producer Contract | `specs/phase5-cloud/kafka-events/contracts/producer-api.md` | ✅ Complete |
| Consumer Contract | `specs/phase5-cloud/kafka-events/contracts/consumer-api.md` | ✅ Complete |
| Quickstart | `specs/phase5-cloud/kafka-events/quickstart.md` | ✅ Complete |
| Plan | `specs/phase5-cloud/kafka-events/plan.md` | ✅ This file |
| Tasks | `specs/phase5-cloud/kafka-events/tasks.md` | ⏳ Next: `/sp.tasks` |
