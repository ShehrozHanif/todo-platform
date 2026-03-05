# [Task]: T020 [From]: specs/phase5-cloud/dapr-integration/spec.md §US3
# RED tests for sidecar/state.py — get_cached_tasks_sync, set_cached_tasks_sync,
# invalidate_cache_sync and cache integration with the list_tasks route.

import json
import logging
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient

from models import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_dapr(data: bytes = b"") -> MagicMock:
    """Build a DaprClient context-manager mock with configurable get_state data."""
    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get_state.return_value.data = data
    return mock_client


# ---------------------------------------------------------------------------
# get_cached_tasks_sync()
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"DAPR_ENABLED": "true"})
class TestGetCachedTasksSync:
    def test_cache_hit_returns_deserialized_list(self):
        """Cache hit → deserializes JSON bytes and returns list of dicts."""
        from sidecar.state import get_cached_tasks_sync

        tasks = [{"id": 1, "title": "Task A"}, {"id": 2, "title": "Task B"}]
        data = json.dumps(tasks).encode()

        with patch("sidecar.state.DaprClient", return_value=_mock_dapr(data)):
            result = get_cached_tasks_sync("user-1")

        assert result == tasks

    def test_cache_hit_calls_get_state_with_correct_key(self):
        """Cache hit → DaprClient.get_state called with key='tasks:{user_id}'."""
        from sidecar.state import get_cached_tasks_sync

        mock_client = _mock_dapr(b'[{"id":1}]')

        with patch("sidecar.state.DaprClient", return_value=mock_client):
            get_cached_tasks_sync("user-42")

        mock_client.get_state.assert_called_once()
        call_kwargs = mock_client.get_state.call_args
        assert call_kwargs.kwargs.get("key") == "tasks:user-42"

    def test_cache_miss_empty_data_returns_none(self):
        """Cache miss (empty state data) → returns None."""
        from sidecar.state import get_cached_tasks_sync

        with patch("sidecar.state.DaprClient", return_value=_mock_dapr(b"")):
            result = get_cached_tasks_sync("user-1")

        assert result is None

    def test_dapr_exception_returns_none(self):
        """DaprClient raises → returns None (fail-open)."""
        from sidecar.state import get_cached_tasks_sync

        with patch("sidecar.state.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("redis unavailable")
            result = get_cached_tasks_sync("user-1")

        assert result is None

    def test_dapr_exception_logs_warning(self, caplog):
        """DaprClient raises → WARNING logged."""
        from sidecar.state import get_cached_tasks_sync

        with patch("sidecar.state.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("redis unavailable")
            with caplog.at_level(logging.WARNING, logger="sidecar.state"):
                get_cached_tasks_sync("user-1")

        assert any("redis unavailable" in r.message or "tasks:user-1" in r.message
                   for r in caplog.records)


# ---------------------------------------------------------------------------
# set_cached_tasks_sync()
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"DAPR_ENABLED": "true"})
class TestSetCachedTasksSync:
    def test_calls_save_state_with_correct_store_and_key(self):
        """save_state called with store='statestore' and key='tasks:{user_id}'."""
        from sidecar.state import set_cached_tasks_sync

        mock_client = _mock_dapr()

        with patch("sidecar.state.DaprClient", return_value=mock_client):
            set_cached_tasks_sync("user-7", [{"id": 1}])

        mock_client.save_state.assert_called_once()
        kw = mock_client.save_state.call_args.kwargs
        assert kw["store_name"] == "statestore"
        assert kw["key"] == "tasks:user-7"

    def test_calls_save_state_with_ttl_metadata(self):
        """save_state includes TTL metadata of 300 seconds."""
        from sidecar.state import set_cached_tasks_sync

        mock_client = _mock_dapr()

        with patch("sidecar.state.DaprClient", return_value=mock_client):
            set_cached_tasks_sync("user-7", [])

        kw = mock_client.save_state.call_args.kwargs
        assert kw.get("state_metadata", {}).get("ttlInSeconds") == "300"

    def test_value_is_json_serialized(self):
        """save_state value is the JSON-encoded task list."""
        from sidecar.state import set_cached_tasks_sync

        mock_client = _mock_dapr()
        tasks = [{"id": 5, "title": "Cached"}]

        with patch("sidecar.state.DaprClient", return_value=mock_client):
            set_cached_tasks_sync("user-1", tasks)

        kw = mock_client.save_state.call_args.kwargs
        assert json.loads(kw["value"]) == tasks

    def test_exception_is_swallowed(self):
        """DaprClient raises → exception caught, no re-raise."""
        from sidecar.state import set_cached_tasks_sync

        with patch("sidecar.state.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("redis down")
            # Must not raise
            set_cached_tasks_sync("user-1", [])


# ---------------------------------------------------------------------------
# invalidate_cache_sync()
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"DAPR_ENABLED": "true"})
class TestInvalidateCacheSync:
    def test_calls_delete_state_with_correct_store_and_key(self):
        """delete_state called with store='statestore', key='tasks:{user_id}'."""
        from sidecar.state import invalidate_cache_sync

        mock_client = _mock_dapr()

        with patch("sidecar.state.DaprClient", return_value=mock_client):
            invalidate_cache_sync("user-99")

        mock_client.delete_state.assert_called_once()
        kw = mock_client.delete_state.call_args.kwargs
        assert kw["store_name"] == "statestore"
        assert kw["key"] == "tasks:user-99"

    def test_exception_is_swallowed(self):
        """DaprClient raises → exception caught, no re-raise."""
        from sidecar.state import invalidate_cache_sync

        with patch("sidecar.state.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("redis down")
            # Must not raise
            invalidate_cache_sync("user-1")


# ---------------------------------------------------------------------------
# Route integration: list_tasks cache behaviour
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_tasks_returns_cached_result_without_hitting_db(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """Cache hit → list_tasks returns cached tasks without querying DB."""
    cached = [{"id": 99, "title": "Cached Task", "completed": False,
               "user_id": seed_user.id, "description": None, "priority": None,
               "category": None, "tags": None, "due_date": None, "due_time": None,
               "recurring": None, "reminder": False, "created_at": "2026-03-04T00:00:00"}]

    with patch("routes.tasks.get_cached_tasks_sync", return_value=cached):
        resp = await client.get(
            f"/api/{seed_user.id}/tasks",
            headers=auth_headers,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == 99


@pytest.mark.asyncio
async def test_list_tasks_stores_result_in_cache_on_miss(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """Cache miss → list_tasks queries DB and enqueues set_cached_tasks_sync."""
    with (
        patch("routes.tasks.get_cached_tasks_sync", return_value=None),
        patch("routes.tasks.set_cached_tasks_sync") as mock_set,
    ):
        resp = await client.get(
            f"/api/{seed_user.id}/tasks",
            headers=auth_headers,
        )

    assert resp.status_code == 200
    mock_set.assert_called_once()


@pytest.mark.asyncio
async def test_create_task_invalidates_cache(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """create_task enqueues invalidate_cache_sync as a background task."""
    with (
        patch("routes.tasks._publish_sync"),
        patch("routes.tasks.invalidate_cache_sync") as mock_inv,
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"title": "Cache Bust"},
            headers=auth_headers,
        )

    assert resp.status_code == 201
    mock_inv.assert_called_once_with(seed_user.id)
