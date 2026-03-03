# Data Model: Kafka Event Streaming

**Branch**: `001-kafka-events` | **Date**: 2026-03-03

---

## Event Envelopes

All events share the following base envelope structure (FR-007):

```
┌─────────────────────────────────────────────────────────┐
│ BASE ENVELOPE                                           │
│  event_type  : string  — discriminator                  │
│  task_id     : integer — from Task.id                   │
│  user_id     : string  — from Task.user_id (partition key)│
│  timestamp   : string  — ISO 8601 UTC (Z suffix)        │
│  payload     : object  — full Task snapshot             │
└─────────────────────────────────────────────────────────┘
```

---

## TaskEvent

Published to `task-events` AND `task-updates` for every lifecycle change.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event_type` | `string` | Yes | One of: `task.created`, `task.updated`, `task.deleted`, `task.completed`, `task.reopened` |
| `task_id` | `integer` | Yes | Task primary key |
| `user_id` | `string` | Yes | Used as Kafka partition key (FR-008) |
| `timestamp` | `string` | Yes | UTC ISO 8601, e.g. `"2026-03-03T12:00:00.000Z"` |
| `payload` | `TaskSnapshot` | Yes | Full task state at time of event |
| `changed_fields` | `string[]` | Conditional | Present and non-empty only on `task.updated` events. Flat list of field names that changed, e.g. `["title", "due_date"]` (FR-002, Clarification Q4) |

### TaskSnapshot (nested in `payload`)

| Field | Type | Nullable |
|-------|------|----------|
| `id` | `integer` | No |
| `user_id` | `string` | No |
| `title` | `string` | No |
| `description` | `string` | Yes |
| `completed` | `boolean` | No |
| `priority` | `string` | Yes — `"high"`, `"medium"`, `"low"` |
| `category` | `string` | Yes |
| `tags` | `string[]` | Yes — deserialized list |
| `due_date` | `string` | Yes — `"YYYY-MM-DD"` |
| `due_time` | `string` | Yes — `"HH:MM"` |
| `recurring` | `string` | Yes — `"daily"`, `"weekly"`, `"monthly"` |
| `reminder` | `boolean` | No — default `false` |
| `created_at` | `string` | No — ISO 8601 UTC |

### Example: task.created

```json
{
  "event_type": "task.created",
  "task_id": 42,
  "user_id": "user_clxxxxxxxxxx",
  "timestamp": "2026-03-03T12:00:00.000Z",
  "payload": {
    "id": 42,
    "user_id": "user_clxxxxxxxxxx",
    "title": "Buy groceries",
    "description": null,
    "completed": false,
    "priority": "high",
    "category": "personal",
    "tags": ["shopping", "urgent"],
    "due_date": "2026-03-04",
    "due_time": "09:00",
    "recurring": null,
    "reminder": true,
    "created_at": "2026-03-03T12:00:00.000Z"
  }
}
```

### Example: task.updated

```json
{
  "event_type": "task.updated",
  "task_id": 42,
  "user_id": "user_clxxxxxxxxxx",
  "timestamp": "2026-03-03T13:00:00.000Z",
  "payload": { "...": "full updated snapshot" },
  "changed_fields": ["title", "priority"]
}
```

---

## ReminderEvent

Published to `reminders` topic when a task is created or updated with `due_date ≤ 24 hours` from now, and not yet sent this session (FR-009, FR-010, Clarification Q1).

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event_type` | `string` | Yes | Always `"reminder.triggered"` |
| `task_id` | `integer` | Yes | Task primary key |
| `user_id` | `string` | Yes | Partition key |
| `title` | `string` | Yes | Task title for display |
| `due_date` | `string` | Yes | `"YYYY-MM-DD"` |
| `due_time` | `string` | Yes/null | `"HH:MM"` or `null` |
| `triggered_at` | `string` | Yes | UTC ISO 8601 timestamp of publish |

### Example: reminder.triggered

```json
{
  "event_type": "reminder.triggered",
  "task_id": 42,
  "user_id": "user_clxxxxxxxxxx",
  "title": "Doctor appointment",
  "due_date": "2026-03-04",
  "due_time": "14:00",
  "triggered_at": "2026-03-03T12:00:00.000Z"
}
```

---

## KafkaTopic Configuration

| Topic | Retention | Partitions | Replication | Consumer Group ID |
|-------|-----------|------------|-------------|-------------------|
| `task-events` | 7 days (604800000 ms) | 3 | 1 (local), 3 (prod) | `todo-consumer-task-events` |
| `reminders` | 24 hours (86400000 ms) | 3 | 1 (local), 3 (prod) | `todo-consumer-reminders` |
| `task-updates` | 1 hour (3600000 ms) | 3 | 1 (local), 3 (prod) | `todo-consumer-task-updates` |

**Topic naming**: If `KAFKA_TOPIC_PREFIX` is set (e.g., `"prod-"`), topic names become `prod-task-events`, etc.

---

## In-Memory De-duplication State

```
_reminded_tasks: set[int]
  Purpose    : Track task IDs that received a reminder.triggered this process lifetime
  Scope      : Module-level in backend/kafka/producer.py
  Reset      : On process restart (acceptable per Clarification Q3)
  Population : Add task.id after successful reminder publish
  Check      : Skip publish if task.id already in set
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Comma-separated broker list |
| `KAFKA_TOPIC_PREFIX` | `""` | Optional prefix for all topic names |

Both variables consumed by: `backend/kafka/producer.py`, `backend/kafka/topics.py`, `kafka-consumer/main.py`.
