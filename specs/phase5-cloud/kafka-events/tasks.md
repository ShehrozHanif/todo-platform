# Tasks: Kafka Event Streaming

**Branch**: `001-kafka-events` | **Date**: 2026-03-03
**Input**: Design documents from `specs/phase5-cloud/kafka-events/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no interdependencies)
- **[US#]**: User story this task belongs to
- **TDD**: Tests (RED) precede implementation (GREEN) — see Constitution §III

## User Stories → Priority Map

| Story | Priority | Summary |
|-------|----------|---------|
| US1 | P1 | Task CRUD operations publish events to `task-events` |
| US2 | P2 | Reminder events published at save time for tasks due ≤24h |
| US3 | P3 | Every lifecycle event also published to `task-updates` |
| US4 | P2 | Standalone consumer service processes all 3 topics |
| US5 | P1 | Local Kafka dev stack via Docker Compose (KRaft mode) |

---

## Phase 1: Setup

**Purpose**: Add aiokafka dependency, scaffold new directory structures. No logic yet.

**Independent test**: `uv run pytest -q` in backend still passes after dependency add.

- [ ] T001 Add `aiokafka>=0.11` to `backend/pyproject.toml` dependencies and run `uv sync`
- [ ] T002 Create `backend/kafka/` package: empty `backend/kafka/__init__.py` and placeholder files `events.py`, `topics.py`, `producer.py`
- [ ] T003 [P] Create `kafka-consumer/` project with `pyproject.toml` (Python 3.13+, aiokafka>=0.11), `kafka-consumer/consumers/__init__.py`, `kafka-consumer/tests/__init__.py`, `kafka-consumer/.env.example`

---

## Phase 2: Foundational — Event Model & Topic Creation

**Purpose**: Shared building blocks required by all user stories — event serialization and topic provisioning.

**Independent test**: `uv run pytest backend/tests/test_kafka_events.py backend/tests/test_kafka_topics.py -v` — all tests pass.

- [ ] T004 [P] Write RED tests for event serialization in `backend/tests/test_kafka_events.py`: assert `build_task_event()` returns correct envelope shape (event_type, task_id, user_id, ISO timestamp, payload dict with all TaskSnapshot fields); assert `changed_fields` only present on `task.updated`; assert `build_reminder_event()` returns `reminder.triggered` envelope with task_id, user_id, title, due_date, due_time, triggered_at
- [ ] T005 [P] Write RED tests for topic creation in `backend/tests/test_kafka_topics.py`: mock `AIOKafkaAdminClient`; assert `create_topics()` calls `admin.start()` before any API call; assert 3 NewTopic objects created with correct names (task-events, reminders, task-updates), retention values (604800000ms, 86400000ms, 3600000ms), 3 partitions; assert `TopicAlreadyExistsError` is silently ignored; assert `admin.close()` called in finally block
- [ ] T006 Implement `backend/kafka/events.py`: define `build_task_event(event_type: str, task: Task, changed_fields: list[str] | None = None) -> dict` and `build_reminder_event(task: Task) -> dict`; serialize `due_date` as `"YYYY-MM-DD"` string, `tags` as list (deserialize from JSON string), `created_at` as ISO UTC; timestamp field uses `datetime.utcnow().isoformat() + "Z"`
- [ ] T007 [P] Implement `backend/kafka/topics.py`: define `async def create_topics(bootstrap_servers: str) -> None` using `AIOKafkaAdminClient`; call `await admin.start()` before any API call; create 3 `NewTopic` objects with `topic_configs={"retention.ms": "...", "cleanup.policy": "delete"}`; wrap each creation in try/except `TopicAlreadyExistsError`; always call `await admin.close()` in finally; read prefix from `os.getenv("KAFKA_TOPIC_PREFIX", "")`; include `# [Task]: T007 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-016 §FR-017` header
- [ ] T008 Run `uv run pytest backend/tests/test_kafka_events.py backend/tests/test_kafka_topics.py -v` — confirm T006 + T007 pass all RED tests (GREEN phase done)

---

## Phase 3: US5 (P1) — Local Development Docker Compose

**Purpose**: Developer experience gate. Kafka must be runnable locally before any integration testing.

**Independent test**: `docker compose -f cloud/kafka/docker-compose.kafka.yml up -d` → Kafka healthy within 60s → `docker exec todo-kafka kafka-topics.sh --list --bootstrap-server localhost:9092` returns 0.

- [ ] T009 [US5] Create `cloud/kafka/docker-compose.kafka.yml` with `bitnami/kafka:3.9` in KRaft mode: set `KAFKA_CFG_NODE_ID=0`, `KAFKA_CFG_PROCESS_ROLES=broker,controller`, `KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093`, `KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092`, `KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT`, `KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT`, `KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093`, `KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER`, `KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=false`, `KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR=1`, `KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1`, `KAFKA_CFG_TRANSACTION_STATE_LOG_MIN_ISR=1`; port `9092:9092`; healthcheck: `kafka-topics.sh --list --bootstrap-server localhost:9092`; volume `kafka-data:/bitnami/kafka`; include `# [Task]: T009 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-018` comment at top
- [ ] T010 [US5] Add `KAFKA_BOOTSTRAP_SERVERS` and `KAFKA_TOPIC_PREFIX` entries to `backend/.env.example` with comments explaining defaults and usage

---

## Phase 4: US1 (P1) — Task Operations Emit Events

**Purpose**: Core producer — every CRUD operation publishes to `task-events` (and `task-updates` per FR-005, covering US3).

**Independent test**: Create a task via `POST /api/{user_id}/tasks` → mock producer asserts `send()` called twice (task-events + task-updates) with correct `task.created` envelope; API returns 201 even when producer raises.

- [ ] T011 [US1] Write RED unit tests for Kafka producer in `backend/tests/test_kafka_producer.py`: use `AsyncMock` to mock `AIOKafkaProducer`; test `publish_task_event("task.created", task)` calls `send()` exactly twice (once for task-events, once for task-updates) with partition key = `task.user_id.encode()`; test `publish_task_event("task.updated", task, changed_fields=["title"])` includes `changed_fields` in payload; test that raising inside `send()` does NOT propagate to caller (fail-open FR-006); test `publish_task_event` is no-op when producer is None; test `publish_task_event("task.deleted", task)` envelope has no `changed_fields` key
- [ ] T012 [US1] Write RED routes integration tests extending `backend/tests/test_routes.py`: patch `backend.kafka.producer.publish_task_event` as `AsyncMock`; assert it is called after successful `POST /api/{uid}/tasks` with event_type `"task.created"`; assert it is called after `PUT` with event_type `"task.updated"`; assert it is called after `DELETE` with event_type `"task.deleted"`; assert it is called after `PATCH` toggle with `"task.completed"` or `"task.reopened"`; assert all route responses are still 200/201/204 even when `publish_task_event` raises `Exception`
- [ ] T013 [US1] Implement `backend/kafka/producer.py`: module-level `_producer: AIOKafkaProducer | None = None` and `_reminded_tasks: set[int] = set()`; implement `async def init_producer() -> None` that creates and starts `AIOKafkaProducer(bootstrap_servers=..., acks=1, request_timeout_ms=5000)`; implement `async def shutdown_producer() -> None`; implement `async def publish_task_event(event_type: str, task: Task, changed_fields: list[str] | None = None) -> None` using `asyncio.create_task()` for fire-and-forget on both topics; catch all exceptions inside the inner coroutine, log with `logger.error`, never re-raise; partition key = `task.user_id.encode("utf-8")`; topic names read from env with prefix support; include `# [Task]: T013 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-001–FR-008` header
- [ ] T014 [US1] Implement `backend/kafka/__init__.py`: export `publish_task_event` and `publish_reminder_if_needed` and `init_producer` and `shutdown_producer` from `backend/kafka/producer`; export `create_topics` from `backend/kafka/topics`; include `# [Task]: T014 [From]: specs/phase5-cloud/kafka-events/spec.md` header
- [ ] T015 [US1] Extend `backend/db.py` lifespan: after `_migrate_task_columns`, read `bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "")`; if bootstrap is non-empty, wrap `from kafka.topics import create_topics; await create_topics(bootstrap); from kafka.producer import init_producer; await init_producer()` in try/except that logs warning on failure (fail-open — app must start even if Kafka is down); in shutdown block after `yield`, call `from kafka.producer import shutdown_producer; await shutdown_producer()` (also in try/except); include `# Phase 5: Kafka producer lifecycle (FR-017, FR-006)` comment
- [ ] T016 [US1] Inject `publish_task_event` calls in `backend/routes/tasks.py`: after successful task creation, call `asyncio.create_task(publish_task_event("task.created", task))`; after successful update, compute `changed_fields` list by comparing old vs new field values then call `asyncio.create_task(publish_task_event("task.updated", task, changed_fields=changed))`; after successful delete, call `asyncio.create_task(publish_task_event("task.deleted", task))`; after toggle, call `asyncio.create_task(publish_task_event("task.completed" if task.completed else "task.reopened", task))`; add `import asyncio` and `from kafka import publish_task_event`; update header comment to include `# Phase 5: Kafka events §FR-001–FR-005`
- [ ] T017 [US1] Run `uv run pytest backend/ -v` — confirm all RED tests from T011+T012 now pass (GREEN), existing 53 tests still pass

---

## Phase 5: US2 (P2) — Reminder Events for Approaching Due Dates

**Purpose**: When a task is saved with `due_date ≤ 24h`, publish `reminder.triggered` to the `reminders` topic (event-driven, not scheduled).

**Independent test**: Create a task with `due_date = today` → mock producer asserts `publish_reminder_if_needed` was called → `reminder.triggered` event appears in reminders topic with correct schema; create a completed task with today's due_date → assert NO reminder published.

- [ ] T018 [US2] Write RED tests for reminder logic (add to `backend/tests/test_kafka_producer.py`): test `publish_reminder_if_needed(task)` sends to `reminders` topic when `task.due_date = today`, `task.completed = False`, `task.id` not in `_reminded_tasks`; test no send when `task.completed = True`; test no send when `task.due_date = None`; test no send when `task.due_date > today + 1 day`; test de-duplication: calling twice with same `task.id` only sends once; test reminder envelope has correct fields (event_type=`"reminder.triggered"`, task_id, user_id, title, due_date, due_time, triggered_at)
- [ ] T019 [US2] Add `publish_reminder_if_needed(task: Task) -> None` to `backend/kafka/producer.py`: check `task.completed`, `task.due_date`, delta `(task.due_date - datetime.utcnow().date()).days` in `[0, 1]`; check `task.id not in _reminded_tasks`; if qualifies, build reminder event via `build_reminder_event(task)` from `events.py`, fire-and-forget send to `reminders` topic, add `task.id` to `_reminded_tasks`; all exceptions caught + logged; include spec reference in docstring (FR-009, FR-010)
- [ ] T020 [US2] Inject `publish_reminder_if_needed` calls in `backend/routes/tasks.py`: after create_task success, add `asyncio.create_task(publish_reminder_if_needed(task))`; after update_task success, add same call; import from `from kafka import publish_reminder_if_needed`
- [ ] T021 [US2] Run `uv run pytest backend/tests/test_kafka_producer.py -v` — confirm T018 reminder tests pass (GREEN)

---

## Phase 6: US4 (P2) — Consumer Service Processes All Topics

**Purpose**: Standalone Python service that subscribes to all 3 topics, processes events, logs to stdout, handles malformed events (DLQ to stderr), commits offsets manually.

**Independent test**: Start consumer service → perform create/update/delete via API → consumer logs show 3 distinct event entries on stdout; feed malformed JSON bytes → consumer logs to stderr and does NOT crash.

- [ ] T022 [US4] Write RED tests for consumer handlers in `kafka-consumer/tests/test_consumers.py`: test `handle_task_event(event)` logs to stdout when called with valid `task.created` dict; test `handle_task_event` does not raise on missing optional fields; test `handle_reminder_event(event)` logs to stdout with correct user + task info; test `handle_task_update(event)` logs to stdout; test malformed JSON message causes stderr log + no exception propagation in the consume loop (mock message with `msg.value = b"not-json"`); test valid message commits offset+1 via `consumer.commit({tp: offset+1})`
- [ ] T023 [P] [US4] Implement `kafka-consumer/consumers/task_events.py`: define `async def handle_task_event(event: dict) -> None` that prints structured log to stdout: `[task-events] {event_type} | task_id={task_id} | user_id={user_id} | ts={timestamp}`; for `task.updated` also print `changed={",".join(changed_fields)}`; include `# [Task]: T023 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012` header
- [ ] T024 [P] [US4] Implement `kafka-consumer/consumers/reminders.py`: define `async def handle_reminder_event(event: dict) -> None` that prints `[reminders] REMINDER | task_id={task_id} | user={user_id} | title="{title}" | due={due_date}`; include spec reference header
- [ ] T025 [P] [US4] Implement `kafka-consumer/consumers/task_updates.py`: define `async def handle_task_update(event: dict) -> None` that prints `[task-updates] sync | task_id={task_id} | event={event_type} | user_id={user_id}`; include spec reference header
- [ ] T026 [US4] Implement `kafka-consumer/main.py`: define `async def consume_topic(topic: str, group_id: str, handler: Callable) -> None` using `AIOKafkaConsumer` with `enable_auto_commit=False`, `auto_offset_reset="earliest"`, `session_timeout_ms=30000`, `heartbeat_interval_ms=10000`; process loop: decode UTF-8 → `json.loads()` → call handler → `consumer.commit({TopicPartition(msg.topic, msg.partition): msg.offset + 1})`; on `json.JSONDecodeError`: print DLQ line to stderr, commit offset+1 (skip poison pill); on other `Exception`: print DLQ line to stderr, do NOT commit (retry on restart); implement `async def main()` using `asyncio.gather()` on 3 `create_task()` calls; handle `asyncio.CancelledError` for graceful shutdown; bootstrap + prefix from env; include `# [Task]: T026 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012–FR-015` header
- [ ] T027 [US4] Create `kafka-consumer/Dockerfile`: multi-stage Python 3.13 slim build; stage 1 uses `uv sync --frozen --no-dev` to install deps; stage 2 copies installed packages + source; `CMD ["python", "main.py"]`; no dev dependencies in final image; include `# [Task]: T027 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-020` comment
- [ ] T028 [US4] Update `cloud/kafka/docker-compose.kafka.yml` to add `kafka-consumer` service with `build: {context: ../../kafka-consumer, dockerfile: Dockerfile}`, `depends_on: kafka: {condition: service_healthy}`, env `KAFKA_BOOTSTRAP_SERVERS: kafka:9092`, `KAFKA_TOPIC_PREFIX: ""`, and `profiles: ["consumer"]` (opt-in)
- [ ] T029 [US4] Run consumer tests: `cd kafka-consumer && uv run pytest tests/ -v` — confirm T022 handler tests pass (GREEN)

---

## Phase 7: US3 (P3) — Real-Time Sync via task-updates

**Purpose**: Verify that every lifecycle event published to `task-events` is also published to `task-updates` (already implemented in T013; this phase adds explicit test coverage and validation).

**Independent test**: After any task CRUD op, mock producer asserts `send()` called exactly twice — once per topic.

- [ ] T030 [US3] Add targeted tests to `backend/tests/test_kafka_producer.py` asserting `publish_task_event()` calls `send()` for BOTH `task-events` AND `task-updates` topics in a single invocation (covers FR-005); assert partition key and payload are identical for both calls; assert `task-updates` topic uses prefix when `KAFKA_TOPIC_PREFIX` is set
- [ ] T031 [US3] Run `uv run pytest backend/tests/test_kafka_producer.py -k "task_updates" -v` — confirm all task-updates assertions pass

---

## Phase 8: Infrastructure — Helm Subchart

**Purpose**: Package the consumer service as a Kubernetes-deployable Helm subchart (FR-020).

**Independent test**: `helm lint cloud/kafka/helm/kafka-consumer/` exits 0; `helm template` renders a valid Deployment manifest with correct env vars.

- [ ] T032 Create `cloud/kafka/helm/kafka-consumer/Chart.yaml`: `apiVersion: v2`, `name: kafka-consumer`, `description: Kafka consumer service for todo platform`, `version: 0.1.0`, `appVersion: "0.1.0"`
- [ ] T033 [P] Create `cloud/kafka/helm/kafka-consumer/values.yaml`: `replicaCount: 1`, `image.repository: todo-kafka-consumer`, `image.tag: latest`, `image.pullPolicy: IfNotPresent`, `env.KAFKA_BOOTSTRAP_SERVERS: ""`, `env.KAFKA_TOPIC_PREFIX: ""`, `resources.requests.cpu: 100m`, `resources.requests.memory: 128Mi`, `resources.limits.cpu: 500m`, `resources.limits.memory: 256Mi`
- [ ] T034 [P] Create `cloud/kafka/helm/kafka-consumer/templates/configmap.yaml`: ConfigMap with `KAFKA_BOOTSTRAP_SERVERS` and `KAFKA_TOPIC_PREFIX` from `.Values.env`; follow pattern from `k8s/helm/todo-platform/charts/backend/templates/configmap.yaml`
- [ ] T035 [P] Create `cloud/kafka/helm/kafka-consumer/templates/deployment.yaml`: Deployment with 1 container, `image`, `envFrom` pointing to ConfigMap; no HTTP liveness probe (stdout service); follow pattern from `k8s/helm/todo-platform/charts/backend/templates/deployment.yaml`; include `{{/* [Task]: T035 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-020 */}}` header
- [ ] T036 Run `helm lint cloud/kafka/helm/kafka-consumer/` — confirm 0 errors

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, type hint audit, constitution compliance check.

- [ ] T037 Audit all new Python files in `backend/kafka/` and `kafka-consumer/` for: type hints on all function signatures (Constitution §V), `# [Task]: Txxx [From]: specs/...` header comment, no hardcoded secrets, no bare `except:` clauses
- [ ] T038 Run full backend test suite `uv run pytest backend/ -v --cov=backend/kafka --cov-report=term-missing` — confirm ≥80% coverage on `backend/kafka/` (Constitution §III)
- [ ] T039 [P] Run `uv run pytest kafka-consumer/ -v --cov=kafka-consumer --cov-report=term-missing` — confirm ≥80% coverage on consumer handlers
- [ ] T040 Manual end-to-end smoke test per `specs/phase5-cloud/kafka-events/quickstart.md`: start Kafka, start backend, create/update/delete tasks, verify consumer logs show all events, verify stderr is empty

---

## Dependency Graph

```
Phase 1 (T001–T003)
    ↓
Phase 2 (T004–T008)  — foundational event model + topics
    ↓                       ↓
Phase 3 (T009–T010)   Phase 4 (T011–T017)  ← US1 (P1), can start after Phase 2
[US5 Docker Compose]  ← required for manual tests of US1
    ↓
Phase 5 (T018–T021)   ← US2 depends on producer from US1
    ↓
Phase 6 (T022–T029)   ← US4 consumer can start parallel with US2
    ↓
Phase 7 (T030–T031)   ← US3 validates task-updates (already in producer)
    ↓
Phase 8 (T032–T036)   ← Helm (infra, can run parallel with Phase 7)
    ↓
Final (T037–T040)
```

---

## Parallel Execution Examples

**US1 block (Phase 4)**:
```
T011 [test_kafka_producer.py RED]  ─┐
T012 [test_routes.py RED]          ─┤ all writable in parallel (different files)
                                    ↓
T013 [producer.py GREEN]           ─┐
T014 [__init__.py GREEN]           ─┤ parallel
                                    ↓
T015 [db.py GREEN]
T016 [routes/tasks.py GREEN]       ← depends on T013/T014
```

**US4 consumer handlers (Phase 6)**:
```
T023 [task_events.py]  ─┐
T024 [reminders.py]    ─┤ all parallel — different files, no deps
T025 [task_updates.py] ─┘
```

**Helm subchart (Phase 8)**:
```
T033 [values.yaml]     ─┐
T034 [configmap.yaml]  ─┤ all parallel — different files
T035 [deployment.yaml] ─┘
```

---

## Implementation Strategy

**MVP Scope** (US1 + US5 only — P1 stories):
- Complete Phase 1 → Phase 2 → Phase 3 (Docker Compose) → Phase 4 (producer + routes)
- End state: every task CRUD publishes events to Kafka; local dev works
- Tasks: T001–T017 (17 tasks)

**Full Scope**:
- All phases: T001–T040 (40 tasks)
- Includes reminders (US2), consumer service (US4), task-updates validation (US3), Helm chart (US5 prod)

---

## Acceptance Verification

| Story | Criterion | Verifying Task |
|-------|-----------|----------------|
| US1 | `task.created` event within 1s of API response (SC-001) | T017 (routes integration test) |
| US1 | Zero API failures from Kafka unavailability (SC-002) | T011 (fail-open test) |
| US2 | `reminder.triggered` published for due ≤24h tasks (SC-004) | T021 (reminder tests) |
| US2 | De-duplication: same task not re-published (FR-010) | T018 (dedup test) |
| US3 | `task-updates` receives same payload as `task-events` (FR-005) | T030 |
| US4 | Consumer resumes from last offset on restart (FR-015) | T022 (offset commit test) |
| US4 | Malformed event logged, not crashed (SC-007) | T022 (DLQ test) |
| US5 | Kafka ready within 60s of `docker compose up` (SC-005) | T040 (manual smoke test) |
