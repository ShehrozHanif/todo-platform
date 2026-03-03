# Data Model: Dapr Integration

**Feature**: Dapr Integration | **Branch**: `002-dapr-integration` | **Date**: 2026-03-04

---

## Overview

This feature introduces five Dapr building-block entities. None are stored in the application database (Neon PostgreSQL). They exist as:
- **Runtime objects** (PubSub events, State entries) — managed by the Dapr sidecar and Redis
- **Configuration objects** (Component definitions, Scheduled job) — Kubernetes YAML files
- **Transient objects** (Secret references) — resolved at startup, injected into `os.environ`

---

## Entity 1: PubSubEvent

Represents a task lifecycle event published to a named Dapr Pub/Sub channel.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `event_type` | `str` | route handler | One of: `task.created`, `task.updated`, `task.deleted`, `task.completed`, `task.reopened` |
| `task_id` | `int` | Task model | Database primary key |
| `user_id` | `str` | URL path param | Used as Kafka partition key |
| `title` | `str` | Task.title | Task display name |
| `completed` | `bool` | Task.completed | Current completion state |
| `priority` | `str \| None` | Task.priority | `"high"`, `"medium"`, `"low"`, or null |
| `due_date` | `str \| None` | Task.due_date | ISO-8601 date string (`YYYY-MM-DD`) |
| `changed_fields` | `list[str] \| None` | `data.model_fields_set` | Present only for `task.updated`; omitted otherwise |
| `timestamp` | `str` | `datetime.utcnow()` | ISO-8601 UTC datetime |

**Published to**:
- Channel `task-events` (all lifecycle events)
- Channel `task-updates` (identical payload — dual publish per FR-002)
- Channel `reminders` (reminder-only payload; see ReminderEvent below)

**Transport envelope**: Dapr wraps in CloudEvents 1.0. The consumer receives the `data` field as the original payload dict.

---

## Entity 2: ReminderEvent

A sub-type of PubSubEvent published only to the `reminders` channel.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `event_type` | `str` | hardcoded | Always `"reminder.triggered"` |
| `task_id` | `int` | Task.id | |
| `user_id` | `str` | Task.user_id | Kafka partition key |
| `title` | `str` | Task.title | |
| `due_date` | `str` | Task.due_date | ISO-8601 date string |
| `timestamp` | `str` | `datetime.utcnow()` | ISO-8601 UTC |

**Published by**: `dapr/jobs.py scan_and_publish_reminders()` — NOT by route handlers (scheduler only).

---

## Entity 3: StateEntry

A per-user cache snapshot stored in Redis via Dapr State Store.

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `key` | `str` | `f"tasks:{user_id}"` | Dapr prefixes with `todo-backend\|\|` in Redis |
| `value` | `bytes` | `json.dumps(task_list)` | JSON-serialized `list[dict]` matching `TaskRead` schema |
| `ttl` | `int` | `300` | Seconds; passed as `state_metadata={"ttlInSeconds": "300"}` |
| `etag` | `str` | Dapr-assigned | Used for optimistic concurrency (not needed for cache invalidation) |

**Lifecycle**:
1. **Created/Updated**: on `list_tasks` cache miss — stored after DB query
2. **Deleted**: on any write operation (create/update/delete/toggle) — explicit `delete_state()`
3. **Auto-expired**: after TTL elapses (5 minutes) — Redis handles expiry

**Fail-open**: If Redis is unavailable, `get_state()` / `save_state()` / `delete_state()` raise `RpcError`. These are caught and logged; the operation proceeds with DB fallback. Users never see an error.

---

## Entity 4: ScheduledJob

A Dapr Jobs API registration representing the recurring reminder scan.

| Field | Type | Value | Notes |
|-------|------|-------|-------|
| `name` | `str` | `"reminder-scan"` | Unique job identifier; used in callback URL `/job/reminder-scan` |
| `schedule` | `str` | `"@every 5m"` | Go duration format; equivalent to `*/5 * * * *` cron |
| `data` | `dict` | `{"type": "reminder_scan"}` | Payload sent to callback on trigger |
| `ttl` | `str \| None` | `None` | Job does not expire |
| `repeats` | `int \| None` | `None` | Runs indefinitely |

**Registration**: `POST http://localhost:3500/v1.0-alpha1/jobs/reminder-scan` — called once in FastAPI lifespan startup.

**Callback endpoint**: `POST /job/reminder-scan` — called by Dapr sidecar every 5 minutes. Returns `204 No Content`.

**State**: Job registration is idempotent — re-registering with same name and schedule is safe (Dapr upserts).

---

## Entity 5: SecretReference

A transient reference resolved at application startup from the Kubernetes Secret Store.

| Secret Key | `os.environ` Key | Required | Notes |
|------------|------------------|----------|-------|
| `DATABASE_URL` | `DATABASE_URL` | Yes | Neon asyncpg connection string; fail-fast if missing |
| `BETTER_AUTH_SECRET` | `BETTER_AUTH_SECRET` | Yes | JWT signing secret for PyJWT middleware; fail-fast if missing |

**Source Kubernetes Secret** (name: `todo-app-secrets`, namespace: `todo-platform`):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: todo-app-secrets
  namespace: todo-platform
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  BETTER_AUTH_SECRET: <base64-encoded>
```

**Resolution order**:
1. `load_secrets_from_dapr()` → calls `DaprClient().get_secret(store_name="kubernetes", key="todo-app-secrets")`
2. If success: inject into `os.environ`
3. If failure (sidecar unavailable, local dev): return `{}` → `python-dotenv` `.env` values already in `os.environ`
4. `get_engine()` reads `os.environ["DATABASE_URL"]` → raises `ValueError` if still not set (fail-fast)

---

## Entity Relationships

```
Task (PostgreSQL)
  ├─ publishes → PubSubEvent [on CRUD] → task-events + task-updates topics
  ├─ cached as → StateEntry [on list_tasks] → Redis
  └─ triggers  → ReminderEvent [on scan] → reminders topic

ScheduledJob (Dapr Jobs)
  └─ fires every 5m → scan Task table → emits ReminderEvent

SecretReference (Kubernetes)
  └─ resolved once at startup → populates DATABASE_URL + BETTER_AUTH_SECRET in os.environ
```

---

## Validation Rules

| Entity | Rule |
|--------|------|
| PubSubEvent | `event_type` must be one of the 5 known values; `task_id` must be positive int |
| ReminderEvent | `due_date` must be a valid ISO date; task must have `completed == False` |
| StateEntry | `value` must be valid JSON array; TTL must be positive int string |
| ScheduledJob | `name` must match the callback URL segment exactly |
| SecretReference | Fail-fast if either required secret is absent from both Dapr and env after startup |
