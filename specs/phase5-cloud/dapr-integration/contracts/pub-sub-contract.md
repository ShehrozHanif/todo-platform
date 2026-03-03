# Contract: Pub/Sub Publishing (US1)

**Module**: `backend/dapr/pubsub.py`
**Feature**: Dapr Integration | **Date**: 2026-03-04

---

## Public API

### `_publish_sync(pubsub: str, topic: str, data: dict, partition_key: str) -> None`

**Purpose**: Thread-safe synchronous wrapper around `DaprClient.publish_event()`. Called via `BackgroundTasks.add_task()` from route handlers — runs in FastAPI's internal thread pool executor.

**Parameters**:
| Parameter | Type | Example | Notes |
|-----------|------|---------|-------|
| `pubsub` | `str` | `"kafka-pubsub"` | Dapr component name from `pubsub.yaml` |
| `topic` | `str` | `"task-events"` | Kafka topic name (verbatim, no prefix) |
| `data` | `dict` | `{"event_type": "task.created", ...}` | Event payload (see PubSubEvent in data-model.md) |
| `partition_key` | `str` | `"user-abc123"` | Routes to consistent Kafka partition |

**Returns**: `None`

**Error handling**: All exceptions caught inside function body; logged via `logging.getLogger(__name__).error(...)`. Never re-raised — fire-and-forget semantics.

**Thread safety**: Creates a new `DaprClient` instance per call (context manager). No shared mutable state.

---

### `build_task_event(event_type: str, task: Task, changed_fields: list[str] | None = None) -> dict`

**Purpose**: Build the canonical event payload dict from a Task ORM instance.

**Parameters**:
| Parameter | Type | Notes |
|-----------|------|-------|
| `event_type` | `str` | One of 5 lifecycle event types |
| `task` | `Task` | SQLModel Task instance (must still be in-session; not deleted) |
| `changed_fields` | `list[str] \| None` | Only for `task.updated`; derived from `data.model_fields_set` |

**Returns**: `dict` matching `PubSubEvent` schema in data-model.md

---

### `build_reminder_event(task: Task) -> dict`

**Purpose**: Build a `reminder.triggered` event payload.

**Returns**: `dict` matching `ReminderEvent` schema in data-model.md

---

## Usage Pattern (route handler)

```python
from fastapi import BackgroundTasks
from dapr.pubsub import _publish_sync, build_task_event

@router.post("/{user_id}/tasks", ...)
async def create_task(
    ...,
    background_tasks: BackgroundTasks,
) -> TaskRead:
    # ... create task, commit, refresh ...
    event = build_task_event("task.created", task)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", event, user_id)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-updates", event, user_id)
    return TaskRead.model_validate(task)
```

---

## Dapr Component Contract

**Component name**: `kafka-pubsub` (must match `metadata.name` in `pubsub.yaml`)
**Component type**: `pubsub.kafka` v1
**Required metadata**:
- `brokers`: Kafka bootstrap address (`kafka:9092` in cluster)
- `authType: "none"` (internal cluster, no SASL)
- `consumerGroup: "todo-platform-consumers"`

---

## Test Requirements

| Scenario | Expected |
|----------|----------|
| Successful publish | `DaprClient.publish_event()` called with correct `pubsub_name`, `topic_name`, `data`, `metadata` |
| Publish exception | Exception is logged, function returns None (no re-raise) |
| `build_task_event` for `task.updated` | Returned dict contains `changed_fields` key |
| `build_task_event` for non-update | Returned dict does NOT contain `changed_fields` key |
| Route calls background task | `BackgroundTasks.add_task` invoked twice per write (task-events + task-updates) |
