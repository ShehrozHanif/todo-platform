# Contract: State Store Cache (US3)

**Module**: `backend/dapr/state.py`
**Feature**: Dapr Integration | **Date**: 2026-03-04

---

## Public API

### `get_cached_tasks_sync(user_id: str) -> list[dict] | None`

**Purpose**: Retrieve cached task list from Dapr State Store. Synchronous — called via `BackgroundTasks` or `asyncio.to_thread`.

**Parameters**:
| Parameter | Type | Notes |
|-----------|------|-------|
| `user_id` | `str` | Cache key suffix; full key = `f"tasks:{user_id}"` |

**Returns**:
- `list[dict]` — deserialized task list on cache hit
- `None` — on cache miss or any error (fail-open)

**Error handling**: `RpcError`, `json.JSONDecodeError`, and all other exceptions are caught, logged as `WARNING`, and return `None`.

---

### `set_cached_tasks_sync(user_id: str, tasks: list[dict]) -> None`

**Purpose**: Store a task list snapshot in the cache with TTL.

**Parameters**:
| Parameter | Type | Notes |
|-----------|------|-------|
| `user_id` | `str` | Cache key suffix |
| `tasks` | `list[dict]` | Serializable task list (TaskRead dicts) |

**State metadata**: `{"ttlInSeconds": "300"}` — 5-minute TTL

**Error handling**: All exceptions caught and logged as `WARNING`. Never raises.

---

### `invalidate_cache_sync(user_id: str) -> None`

**Purpose**: Delete the cached task list for a user after any write operation.

**Parameters**:
| Parameter | Type | Notes |
|-----------|------|-------|
| `user_id` | `str` | Cache key suffix |

**Calls**: `DaprClient().delete_state(store_name="statestore", key=f"tasks:{user_id}")`

**Error handling**: All exceptions caught and logged as `WARNING`. Never raises.

---

## Usage Pattern (`list_tasks` route)

```python
from fastapi import BackgroundTasks
from dapr.state import get_cached_tasks_sync, set_cached_tasks_sync, invalidate_cache_sync
import asyncio

@router.get("/{user_id}/tasks", ...)
async def list_tasks(user_id: str, background_tasks: BackgroundTasks, ...) -> list[TaskRead]:
    # 1. Try cache (run sync function in thread)
    cached = await asyncio.to_thread(get_cached_tasks_sync, user_id)
    if cached is not None:
        return [TaskRead.model_validate(t) for t in cached]

    # 2. Cache miss: query DB
    tasks = [TaskRead.model_validate(t) for t in await db_query(...)]

    # 3. Store result in cache (fire-and-forget)
    raw = [t.model_dump(mode="json") for t in tasks]
    background_tasks.add_task(set_cached_tasks_sync, user_id, raw)
    return tasks

# Write handlers (create/update/delete/toggle):
background_tasks.add_task(invalidate_cache_sync, user_id)
```

---

## Dapr Component Contract

**Component name**: `statestore` (must match `metadata.name` in `statestore.yaml`)
**Component type**: `state.redis` v1
**Required metadata**:
- `redisHost`: `redis-master.todo-platform.svc.cluster.local:6379`
- `redisPassword`: from K8s secret `redis-secret`
- `keyPrefix: "appid"` (default) — keys stored as `todo-backend||tasks:{user_id}`

---

## Cache Key Scheme

```
Application key:  tasks:{user_id}
Redis actual key: todo-backend||tasks:{user_id}
```

Code uses only `f"tasks:{user_id}"` — Dapr handles the prefix automatically.

---

## Test Requirements

| Scenario | Expected |
|----------|----------|
| Cache hit | Returns deserialized list; `DaprClient.get_state` called with correct key |
| Cache miss (empty data) | Returns `None` |
| `DaprClient` raises `RpcError` | Returns `None`; error logged as WARNING |
| `set_cached_tasks_sync` success | `DaprClient.save_state` called with key, JSON value, and TTL metadata |
| `set_cached_tasks_sync` error | Exception caught; no re-raise |
| `invalidate_cache_sync` success | `DaprClient.delete_state` called with correct store + key |
| `list_tasks` cache hit | DB session `.exec()` NOT called |
| `list_tasks` cache miss | DB session `.exec()` called; background task adds `set_cached_tasks_sync` |
| Write operation | `invalidate_cache_sync` added as background task |
