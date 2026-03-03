# Contract: Kafka Consumer Service

**Service**: `kafka-consumer/`
**Branch**: `001-kafka-events` | **Date**: 2026-03-03

---

## Service Overview

Standalone Python service. Entry point: `kafka-consumer/main.py`. Subscribes to all 3 topics as separate consumer group tasks. Logs all events to stdout. Logs malformed events to stderr. Never writes to the task database.

---

## Consumer Groups

| Topic | Consumer Group ID | Auto-offset-reset | Commit Strategy |
|-------|------------------|-------------------|-----------------|
| `task-events` | `todo-consumer-task-events` | `earliest` | Manual, after processing |
| `reminders` | `todo-consumer-reminders` | `earliest` | Manual, after processing |
| `task-updates` | `todo-consumer-task-updates` | `earliest` | Manual, after processing |

---

## Message Processing Contract

For each received message:

```
1. Decode: msg.value.decode("utf-8")
2. Parse:  json.loads(decoded)
3. Validate: check required fields (event_type, task_id, user_id)
4. Handle: dispatch to event-type-specific handler
5. Log:   print structured log to stdout
6. Commit: consumer.commit() — always, even on error

On any exception in steps 1–4:
  → print raw message + error to stderr (FR-014, Clarification Q2)
  → consumer.commit()  ← skip message, continue loop
  → do NOT crash
```

---

## Handler Contracts

### `handle_task_event(event: dict) -> None`

Processes events from `task-events` topic.

**Expected fields**: `event_type`, `task_id`, `user_id`, `timestamp`, `payload`

**Output** (stdout):
```
[task-events] task.created | task_id=42 | user_id=user_clxxx | ts=2026-03-03T12:00:00Z
[task-events] task.updated | task_id=42 | user_id=user_clxxx | changed=title,due_date
[task-events] task.deleted | task_id=42 | user_id=user_clxxx
```

---

### `handle_reminder_event(event: dict) -> None`

Processes events from `reminders` topic.

**Expected fields**: `event_type`, `task_id`, `user_id`, `title`, `due_date`, `triggered_at`

**Output** (stdout):
```
[reminders] REMINDER | task_id=42 | user=user_clxxx | title="Doctor appointment" | due=2026-03-04
```

---

### `handle_task_update(event: dict) -> None`

Processes events from `task-updates` topic.

**Output** (stdout):
```
[task-updates] sync | task_id=42 | event=task.created | user_id=user_clxxx
```

---

## Startup & Shutdown

**Startup**: `main.py` creates 3 asyncio tasks (one per topic). All start concurrently.

**Graceful shutdown**: On `SIGTERM` / `SIGINT`, cancel all tasks, await `consumer.stop()` on each.

**Restart / offset resume**: `enable_auto_commit=False` + `auto_offset_reset="earliest"` ensures the consumer resumes from the last committed offset, never skipping messages (FR-015).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Broker connection string |
| `KAFKA_TOPIC_PREFIX` | `""` | Must match producer prefix |

---

## Dead-Letter Format (stderr)

```
[DLQ] topic=task-events offset=1234 partition=0 error=<error message> raw=b'<raw bytes>'
```

This satisfies FR-014 and SC-007.
