# Contract: Kafka Producer API

**Module**: `backend/kafka/`
**Branch**: `001-kafka-events` | **Date**: 2026-03-03

---

## Public Interface

All functions are async. Callers in `backend/routes/tasks.py` use fire-and-forget calls (no `await` on return value).

---

### `init_producer() -> AIOKafkaProducer`

Initialize the module-level producer singleton and create topics.

| | |
|---|---|
| **Called by** | `db.py::lifespan()` on startup |
| **Side effects** | Starts AIOKafkaProducer, creates 3 topics via AIOKafkaAdminClient |
| **On Kafka unavailable** | Logs warning; returns None; app continues (fail-open) |
| **Idempotent** | Yes — no-op if already initialized |

---

### `shutdown_producer() -> None`

Gracefully stop the producer, flushing any pending messages.

| | |
|---|---|
| **Called by** | `db.py::lifespan()` on shutdown |
| **On None producer** | No-op |

---

### `publish_task_event(event_type, task, changed_fields=None) -> None`

Publish a task lifecycle event to `task-events` AND `task-updates`.

| Parameter | Type | Required | Notes |
|-----------|------|----------|-------|
| `event_type` | `str` | Yes | `"task.created"` \| `"task.updated"` \| `"task.deleted"` \| `"task.completed"` \| `"task.reopened"` |
| `task` | `Task` | Yes | SQLModel Task instance (full snapshot serialized into `payload`) |
| `changed_fields` | `list[str] \| None` | No | Required for `task.updated`; flat list of changed field names |

**Behavior**:
1. Serialize task to `TaskSnapshot` dict
2. Build envelope: `{event_type, task_id, user_id, timestamp, payload, changed_fields}`
3. Send to `task-events` with partition key = `task.user_id`
4. Send to `task-updates` with same payload and partition key
5. Any exception → log error, return (never raise)

**Guarantees**: FR-006 — caller never receives an exception from this function.

---

### `publish_reminder_if_needed(task) -> None`

Publish a `reminder.triggered` event if the task qualifies and hasn't been sent this session.

| Parameter | Type | Required |
|-----------|------|----------|
| `task` | `Task` | Yes |

**Qualification rules** (all must be true):
- `task.due_date` is not None
- `task.completed` is False
- `(task.due_date - today).days` is 0 or 1 (within 24 hours)
- `task.id` not in `_reminded_tasks` (de-duplication)

**Behavior**:
1. Check qualification — return immediately if fails
2. Build `ReminderEvent` dict
3. Send to `reminders` topic with partition key = `task.user_id`
4. Add `task.id` to `_reminded_tasks`
5. Any exception → log error, return (never raise)

---

## Error Contract

All functions in this module follow the **fail-open** pattern:

```
try:
    await producer.send(topic, value=payload, key=key)
except Exception as exc:
    logger.error("Kafka publish failed [topic=%s event=%s]: %s", topic, event_type, exc)
    return  # NEVER re-raise
```

This implements FR-006 and SC-002: zero API failures caused by Kafka unavailability.

---

## Constants

```python
TASK_EVENTS_TOPIC  = f"{prefix}task-events"
REMINDERS_TOPIC    = f"{prefix}reminders"
TASK_UPDATES_TOPIC = f"{prefix}task-updates"
```

where `prefix = os.getenv("KAFKA_TOPIC_PREFIX", "")`.
