# [Task]: T021 [From]: specs/phase5-cloud/dapr-integration/spec.md §US3
# Dapr State Store wrapper — synchronous cache get/set/invalidate for task lists.
# All functions run via BackgroundTasks.add_task() or asyncio.to_thread() — never
# called directly in async context (DaprClient is synchronous-only).

import json
import logging
import os
from typing import Any

from dapr.clients import DaprClient

_log = logging.getLogger(__name__)

_STORE_NAME = "statestore"


def _cache_key(user_id: str) -> str:
    return f"tasks:{user_id}"


def get_cached_tasks_sync(user_id: str) -> list[dict[str, Any]] | None:
    """
    Retrieve cached task list from Dapr State Store.
    Returns None on cache miss or any error (fail-open).
    Skipped entirely when DAPR_ENABLED != "true".
    """
    if os.getenv("DAPR_ENABLED", "false").lower() != "true":
        return None
    key = _cache_key(user_id)
    try:
        with DaprClient() as client:
            state = client.get_state(store_name=_STORE_NAME, key=key)
            if not state.data:
                return None
            return json.loads(state.data)
    except Exception as exc:
        _log.warning("Cache get failed [key=%s]: %s", key, exc)
        return None


def set_cached_tasks_sync(user_id: str, tasks: list[dict[str, Any]]) -> None:
    """
    Store task list in Dapr State Store with 5-minute TTL.
    Fail-open: any exception is logged and swallowed.
    Skipped entirely when DAPR_ENABLED != "true".
    """
    if os.getenv("DAPR_ENABLED", "false").lower() != "true":
        return
    key = _cache_key(user_id)
    try:
        with DaprClient() as client:
            client.save_state(
                store_name=_STORE_NAME,
                key=key,
                value=json.dumps(tasks),
                state_metadata={"ttlInSeconds": "300"},
            )
    except Exception as exc:
        _log.warning("Cache set failed [key=%s]: %s", key, exc)


def invalidate_cache_sync(user_id: str) -> None:
    """
    Delete cached task list for a user after any write operation.
    Fail-open: any exception is logged and swallowed.
    Skipped entirely when DAPR_ENABLED != "true".
    """
    if os.getenv("DAPR_ENABLED", "false").lower() != "true":
        return
    key = _cache_key(user_id)
    try:
        with DaprClient() as client:
            client.delete_state(store_name=_STORE_NAME, key=key)
    except Exception as exc:
        _log.warning("Cache invalidate failed [key=%s]: %s", key, exc)
