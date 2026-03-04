# Phase 0 Research: Kafka Event Streaming

**Branch**: `001-kafka-events` | **Date**: 2026-03-03
**Feature**: `specs/phase5-cloud/kafka-events/spec.md`

---

## R1 — aiokafka vs confluent-kafka-python

**Decision**: Use `aiokafka` (0.11+)

**Rationale**: The FastAPI backend is fully async (asyncpg, AsyncSession). `aiokafka` provides a native asyncio API — `AIOKafkaProducer` and `AIOKafkaConsumer` integrate directly into the asyncio event loop. `confluent-kafka-python` wraps the C librdkafka library and requires thread executors for async usage, adding complexity and overhead.

**Alternatives considered**:
- `confluent-kafka-python`: Battle-tested, better Confluent Cloud support. Rejected for Phase 5 due to async impedance mismatch.
- `kafka-python`: Pure Python but unmaintained for async patterns. Rejected.

---

## R2 — AIOKafkaProducer Singleton Pattern

**Decision**: Module-level singleton initialized in FastAPI lifespan, stored as `app.state.kafka_producer`.

**Pattern**:
```python
# backend/kafka/producer.py
_producer: AIOKafkaProducer | None = None

async def init_producer() -> AIOKafkaProducer:
    global _producer
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    _producer = AIOKafkaProducer(
        bootstrap_servers=bootstrap,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        acks=1,                          # wait for leader ack only (balance latency vs durability)
        request_timeout_ms=5000,         # fail fast if broker unreachable
        enable_idempotence=False,        # at-least-once is sufficient (spec FR constraint)
    )
    await _producer.start()
    return _producer

async def shutdown_producer() -> None:
    global _producer
    if _producer:
        await _producer.stop()
        _producer = None
```

**Fire-and-forget publish**:
```python
async def publish_event(topic: str, event: dict, partition_key: str) -> None:
    if _producer is None:
        logger.warning("Kafka producer not initialized — event dropped: %s", event.get("event_type"))
        return
    try:
        await _producer.send(topic, value=event, key=partition_key)
        # No await on send_and_wait — fire-and-forget for API latency
    except Exception as exc:
        logger.error("Kafka publish failed (topic=%s): %s", topic, exc)
        # FR-006: Never propagate to caller
```

**Rationale for `acks=1`**: Leader acknowledgement (not `acks="all"`) keeps latency low for fire-and-forget. For at-least-once guarantee, `acks=1` is sufficient — the spec doesn't require exactly-once.

---

## R3 — Topic Auto-Creation via AIOKafkaAdminClient

**Decision**: Create topics at backend startup using `AIOKafkaAdminClient` with `IF NOT EXISTS` semantics.

**Pattern**:
```python
from aiokafka.admin import AIOKafkaAdminClient, NewTopic

TOPICS = [
    NewTopic("task-events",  num_partitions=3, replication_factor=1,
             topic_configs={"retention.ms": str(7 * 24 * 60 * 60 * 1000)}),   # 7 days
    NewTopic("reminders",    num_partitions=3, replication_factor=1,
             topic_configs={"retention.ms": str(24 * 60 * 60 * 1000)}),        # 24 hours
    NewTopic("task-updates", num_partitions=3, replication_factor=1,
             topic_configs={"retention.ms": str(60 * 60 * 1000)}),             # 1 hour
]

async def create_topics(bootstrap_servers: str) -> None:
    admin = AIOKafkaAdminClient(bootstrap_servers=bootstrap_servers)
    await admin.start()
    try:
        existing = set(await admin.list_topics())
        new_topics = [t for t in TOPICS if t.name not in existing]
        if new_topics:
            await admin.create_topics(new_topics)
    finally:
        await admin.close()
```

**KAFKA_TOPIC_PREFIX support**: Topic names are built as `f"{prefix}{base_name}"` where prefix comes from `KAFKA_TOPIC_PREFIX` env var (default: `""`).

---

## R4 — Consumer Group Pattern (Standalone Service)

**Decision**: One `AIOKafkaConsumer` per topic, each in a separate `asyncio.Task`, sharing a single Python process. Manual offset commit after processing.

**Pattern**:
```python
from aiokafka import AIOKafkaConsumer, TopicPartition

async def consume_topic(topic: str, group_id: str, handler: Callable) -> None:
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        group_id=group_id,
        auto_offset_reset="earliest",      # catch up after restart (FR-015)
        enable_auto_commit=False,          # manual commit after processing (FR-013)
        session_timeout_ms=30_000,
        heartbeat_interval_ms=10_000,
    )
    await consumer.start()
    try:
        async for msg in consumer:
            tp = TopicPartition(msg.topic, msg.partition)
            try:
                event = json.loads(msg.value.decode("utf-8"))
                await handler(event)
                await consumer.commit({tp: msg.offset + 1})  # explicit offset+1
            except json.JSONDecodeError as exc:
                # FR-014: malformed message → skip forward
                print(f"[DLQ] topic={topic} offset={msg.offset} error={exc} raw={msg.value!r}",
                      file=sys.stderr, flush=True)
                await consumer.commit({tp: msg.offset + 1})  # skip poison pill
            except Exception as exc:
                # Handler error → log, do NOT commit (retry on restart)
                print(f"[DLQ] topic={topic} offset={msg.offset} error={exc} raw={msg.value!r}",
                      file=sys.stderr, flush=True)
    finally:
        await consumer.stop()
```

**Consumer group IDs**:
- `todo-consumer-task-events`
- `todo-consumer-reminders`
- `todo-consumer-task-updates`

---

## R5 — Bitnami Kafka KRaft Mode (Docker Compose)

**Decision**: Use `bitnami/kafka:3.7` with KRaft mode (no ZooKeeper).

**Required environment variables** (confirmed via bitnami/kafka README):
```yaml
KAFKA_CFG_NODE_ID: "0"
KAFKA_CFG_PROCESS_ROLES: "broker,controller"
KAFKA_CFG_LISTENERS: "PLAINTEXT://:9092,CONTROLLER://:9093"
KAFKA_CFG_ADVERTISED_LISTENERS: "PLAINTEXT://kafka:9092"   # use service name, not localhost
KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: "CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT"
KAFKA_CFG_INTER_BROKER_LISTENER_NAME: "PLAINTEXT"
KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: "0@kafka:9093"
KAFKA_CFG_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "false"  # admin client creates topics explicitly
KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR: "1"  # required for single-broker dev
KAFKA_CFG_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: "1"
KAFKA_CFG_TRANSACTION_STATE_LOG_MIN_ISR: "1"
# KAFKA_KRAFT_CLUSTER_ID: auto-generated on first boot if not set
```

**Note on `ADVERTISED_LISTENERS`**: Use the Docker service name `kafka:9092` (not `localhost:9092`) so containers on the same network can connect. For host access, add a separate `EXTERNAL://:9094` listener.

**Port mapping**: `9092:9092` exposes broker to host. Consumer service on the same Docker network uses `kafka:9092` internally.

**Health check**: `kafka-topics.sh --list --bootstrap-server localhost:9092` — wait until exit 0.

---

## R6 — Reminder De-duplication (In-Memory Set)

**Decision**: `_reminded_tasks: set[int]` module-level set in the producer module. Reset on process restart.

**Pattern**:
```python
_reminded_tasks: set[int] = set()

async def publish_reminder_if_needed(task: Task) -> None:
    if task.id in _reminded_tasks:
        return  # already sent this session
    if not _qualifies_for_reminder(task):
        return
    event = build_reminder_event(task)
    await publish_event(REMINDERS_TOPIC, event, task.user_id)
    _reminded_tasks.add(task.id)

def _qualifies_for_reminder(task: Task) -> bool:
    if task.completed or task.due_date is None:
        return False
    now = datetime.utcnow().date()
    delta = (task.due_date - now).days
    return 0 <= delta <= 1   # today or tomorrow (within 24h)
```

**Restart behavior**: On process restart, `_reminded_tasks` is empty. Tasks within the 24h window will get one re-trigger. SC-006 (idempotent consumer) ensures this is safe.

---

## R7 — Lifespan Integration Strategy

**Decision**: Extend the existing `db.py` lifespan to initialize/shutdown Kafka producer inline. No separate lifespan context manager.

**Rationale**: FastAPI only supports one `lifespan` function. Nesting or chaining additional lifespans requires the `anyio` task group pattern or extracting a shared lifespan. Extending the existing `lifespan` in `db.py` is the simplest viable change per constitution principle ("prefer the smallest viable change").

**Startup order**: DB tables → migrations → topic creation → producer start → yield → producer stop → engine dispose.

**Fail-open**: If Kafka is unavailable at startup, log a warning and continue. The app MUST start even without Kafka (FR-006, SC-002).

---

## R8 — Testing Strategy

**Producer tests** (`backend/tests/test_kafka_producer.py`):
- Mock `AIOKafkaProducer` with `AsyncMock`
- Assert `send()` called with correct topic, key, and event shape
- Assert no exception raised when producer is None (fail-open)

**Routes integration tests** (extend `backend/tests/test_routes.py`):
- Patch `backend.kafka.producer.publish_event` to `AsyncMock`
- Verify publish called after create/update/delete/toggle
- Verify API returns 200/201 even when publish raises

**Consumer tests** (`kafka-consumer/tests/test_consumers.py`):
- Feed mock messages to handler functions directly (no broker needed)
- Assert malformed JSON is caught, stderr contains raw message, no exception propagates
- Assert offset committed after both success and error paths
