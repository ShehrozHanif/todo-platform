# Contract: Jobs API — Reminder Scan (US2)

**Modules**: `backend/dapr/jobs.py`, `backend/routes/jobs.py`
**Feature**: Dapr Integration | **Date**: 2026-03-04

---

## HTTP Endpoint

### `POST /job/reminder-scan`

**Purpose**: Dapr sidecar callback — fires every 5 minutes to scan for due tasks and publish reminders.

**Auth**: None (Dapr sidecar calls internally — not exposed via API gateway)

**Request body**: `{"type": "reminder_scan"}` (from job registration `data` field) — ignored by handler

**Response**:
- `204 No Content` — scan completed successfully
- `500 Internal Server Error` — unexpected scan failure (logged, Dapr will retry)

**FastAPI handler**:
```python
@router.post("/job/reminder-scan", status_code=204)
async def handle_reminder_scan(session: AsyncSession = Depends(get_session)) -> Response:
    await scan_and_publish_reminders(session)
    return Response(status_code=204)
```

---

## `dapr/jobs.py` Functions

### `register_reminder_job() -> None`

**Purpose**: Register the `reminder-scan` job with Dapr Jobs API at application startup.

**Called from**: `db.py` lifespan after DB tables are ready.

**HTTP call**:
```
POST http://localhost:{DAPR_HTTP_PORT}/v1.0-alpha1/jobs/reminder-scan
Content-Type: application/json

{
  "schedule": "@every 5m",
  "data": {"type": "reminder_scan"}
}
```

**Idempotent**: Re-registering an existing job with same schedule is safe (Dapr upserts).

**Error handling**: Logs `WARNING` if sidecar unavailable (e.g., local dev without Dapr). Does not raise — app starts normally without the scheduler.

---

### `scan_and_publish_reminders(session: AsyncSession) -> None`

**Purpose**: Query tasks with `due_date <= now + 24h AND completed == False`, publish `reminder.triggered` for each not already reminded.

**Deduplication**: In-process set `_reminded_task_ids: set[int]` at module level. Prevents duplicate reminders within a single process lifetime (per spec assumption §Assumptions).

**Publish path**: Calls `_publish_sync("kafka-pubsub", "reminders", payload, task.user_id)` via `asyncio.to_thread`.

**Query**:
```python
from datetime import datetime, timedelta
cutoff = datetime.utcnow().date() + timedelta(hours=24)
stmt = select(Task).where(
    Task.completed == False,
    Task.due_date != None,
    Task.due_date <= cutoff,
)
```

---

## Job Registration Contract

| Field | Value | Notes |
|-------|-------|-------|
| Job name | `reminder-scan` | Must match URL segment in callback `POST /job/reminder-scan` |
| Schedule | `@every 5m` | Go duration; first trigger within 5 min of registration |
| Dapr API version | `v1.0-alpha1` | SDK has no Jobs API; use httpx HTTP directly |
| Dapr port env var | `DAPR_HTTP_PORT` | Default `3500` |

---

## Dedup Set Lifecycle

```
_reminded_task_ids = set()   # module-level; survives requests, not pod restarts

scan runs:
  for task in qualifying_tasks:
    if task.id not in _reminded_task_ids:
      publish reminder
      _reminded_task_ids.add(task.id)
```

**Limitation**: Pod restart resets the set → a task may receive one reminder per pod lifetime. Spec explicitly accepts this (§Assumptions).

---

## Test Requirements

| Scenario | Expected |
|----------|----------|
| `register_reminder_job()` success | `httpx.AsyncClient.post` called with correct URL, schedule, data |
| `register_reminder_job()` sidecar down | Exception logged as WARNING; no re-raise |
| `scan_and_publish_reminders` — task due today, not reminded | `_publish_sync` called for that task; task.id added to dedup set |
| `scan_and_publish_reminders` — task already reminded | `_publish_sync` NOT called |
| `scan_and_publish_reminders` — completed task | `_publish_sync` NOT called |
| `scan_and_publish_reminders` — task due in >24h | `_publish_sync` NOT called |
| `POST /job/reminder-scan` | Returns 204; `scan_and_publish_reminders` called |
