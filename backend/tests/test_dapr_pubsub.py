# [Task]: T010 [From]: specs/phase5-cloud/dapr-integration/spec.md §US1
# RED tests for sidecar/pubsub.py — _publish_sync, build_task_event, build_reminder_event

from datetime import date
from typing import Optional
from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import SQLModel


# Lightweight stub that avoids SQLAlchemy session machinery
class _Task(SQLModel):
    id: int = 1
    user_id: str = "user-abc"
    title: str = "Test Task"
    description: Optional[str] = None
    completed: bool = False
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: bool = False


def _make_task(**kwargs) -> _Task:
    return _Task(**kwargs)


# ---------------------------------------------------------------------------
# _publish_sync()
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"DAPR_ENABLED": "true"})
class TestPublishSync:
    def test_calls_dapr_publish_event(self):
        """_publish_sync calls DaprClient.publish_event with correct args."""
        from sidecar.pubsub import _publish_sync

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)

        with patch("sidecar.pubsub.DaprClient", return_value=mock_client):
            _publish_sync("kafka-pubsub", "task-events", {"event_type": "task.created"}, "user-1")

        mock_client.publish_event.assert_called_once()
        call_kwargs = mock_client.publish_event.call_args
        assert call_kwargs.kwargs["pubsub_name"] == "kafka-pubsub"
        assert call_kwargs.kwargs["topic_name"] == "task-events"
        assert call_kwargs.kwargs["data_content_type"] == "application/json"
        assert call_kwargs.kwargs["metadata"] == {"partitionKey": "user-1"}

    def test_publish_data_is_json_string(self):
        """_publish_sync serializes data dict to JSON string."""
        import json
        from sidecar.pubsub import _publish_sync

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        captured = {}

        def capture(**kwargs):
            captured.update(kwargs)

        mock_client.publish_event.side_effect = capture

        with patch("sidecar.pubsub.DaprClient", return_value=mock_client):
            _publish_sync("kafka-pubsub", "task-events", {"k": "v"}, "u")

        payload = json.loads(captured["data"])
        assert payload == {"k": "v"}

    def test_exception_is_swallowed_not_raised(self):
        """DaprClient raises → exception caught, no re-raise."""
        from sidecar.pubsub import _publish_sync

        with patch("sidecar.pubsub.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("sidecar down")
            # Must not raise
            _publish_sync("kafka-pubsub", "task-events", {}, "user-1")

    def test_logs_error_on_exception(self, caplog):
        """DaprClient raises → error is logged."""
        import logging
        from sidecar.pubsub import _publish_sync

        with patch("sidecar.pubsub.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("sidecar down")
            with caplog.at_level(logging.ERROR, logger="sidecar.pubsub"):
                _publish_sync("kafka-pubsub", "task-events", {}, "user-1")

        assert any("sidecar down" in r.message or "task-events" in r.message
                   for r in caplog.records)


# ---------------------------------------------------------------------------
# build_task_event()
# ---------------------------------------------------------------------------

class TestBuildTaskEvent:
    def test_created_event_has_correct_type(self):
        """build_task_event for created includes event_type=task.created."""
        from sidecar.pubsub import build_task_event
        task = _make_task(id=5, user_id="u1")
        event = build_task_event("task.created", task)
        assert event["event_type"] == "task.created"
        assert event["task_id"] == 5
        assert event["user_id"] == "u1"

    def test_updated_event_includes_changed_fields(self):
        """build_task_event for task.updated includes changed_fields key."""
        from sidecar.pubsub import build_task_event
        task = _make_task()
        event = build_task_event("task.updated", task, changed_fields=["title", "priority"])
        assert "changed_fields" in event
        assert event["changed_fields"] == ["title", "priority"]

    def test_created_event_omits_changed_fields(self):
        """build_task_event for task.created omits changed_fields key."""
        from sidecar.pubsub import build_task_event
        task = _make_task()
        event = build_task_event("task.created", task)
        assert "changed_fields" not in event

    def test_event_has_timestamp(self):
        """build_task_event includes timestamp field."""
        from sidecar.pubsub import build_task_event
        task = _make_task()
        event = build_task_event("task.deleted", task)
        assert "timestamp" in event
        assert len(event["timestamp"]) > 0

    def test_due_date_serialized_as_iso_string(self):
        """build_task_event serializes date to ISO-8601 string."""
        from sidecar.pubsub import build_task_event
        task = _make_task(due_date=date(2026, 3, 5))
        event = build_task_event("task.created", task)
        assert event["due_date"] == "2026-03-05"


# ---------------------------------------------------------------------------
# build_reminder_event()
# ---------------------------------------------------------------------------

class TestBuildReminderEvent:
    def test_event_type_is_reminder_triggered(self):
        """build_reminder_event always has event_type=reminder.triggered."""
        from sidecar.pubsub import build_reminder_event
        task = _make_task(id=3, user_id="u2", due_date=date(2026, 3, 5))
        event = build_reminder_event(task)
        assert event["event_type"] == "reminder.triggered"

    def test_includes_required_fields(self):
        """build_reminder_event includes task_id, user_id, title, due_date."""
        from sidecar.pubsub import build_reminder_event
        task = _make_task(id=7, user_id="u3", title="Do thing", due_date=date(2026, 3, 5))
        event = build_reminder_event(task)
        assert event["task_id"] == 7
        assert event["user_id"] == "u3"
        assert event["title"] == "Do thing"
        assert event["due_date"] == "2026-03-05"
