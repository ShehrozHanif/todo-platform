# [Task]: T022 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012–FR-015
# RED / GREEN tests for consumer handlers and consume loop.

import asyncio
import json
import sys
from io import StringIO
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_task_event(event_type: str = "task.created", **kwargs: Any) -> dict:
    return {
        "event_type": event_type,
        "task_id": 1,
        "user_id": "user-test",
        "timestamp": "2026-03-03T12:00:00.000Z",
        "payload": {"title": "Test"},
        **kwargs,
    }


def make_reminder_event(**kwargs: Any) -> dict:
    return {
        "event_type": "reminder.triggered",
        "task_id": 1,
        "user_id": "user-test",
        "title": "Test Task",
        "due_date": "2026-03-03",
        "due_time": "09:00",
        "triggered_at": "2026-03-03T08:00:00.000Z",
        **kwargs,
    }


def make_mock_message(value: bytes, topic: str = "task-events", partition: int = 0, offset: int = 0) -> MagicMock:
    msg = MagicMock()
    msg.value = value
    msg.topic = topic
    msg.partition = partition
    msg.offset = offset
    return msg


# ── handle_task_event ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_handle_task_event_logs_to_stdout() -> None:
    """Handler prints structured log to stdout for task.created."""
    from consumers.task_events import handle_task_event

    event = make_task_event("task.created")
    captured = StringIO()
    with patch("sys.stdout", captured):
        await handle_task_event(event)

    output = captured.getvalue()
    assert "[task-events]" in output
    assert "task.created" in output
    assert "task_id=1" in output
    assert "user_id=user-test" in output


@pytest.mark.asyncio
async def test_handle_task_event_updated_includes_changed_fields() -> None:
    """task.updated log includes changed fields."""
    from consumers.task_events import handle_task_event

    event = make_task_event("task.updated", changed_fields=["title", "due_date"])
    captured = StringIO()
    with patch("sys.stdout", captured):
        await handle_task_event(event)

    output = captured.getvalue()
    assert "changed=title,due_date" in output


@pytest.mark.asyncio
async def test_handle_task_event_does_not_raise_on_missing_fields() -> None:
    """Handler silently handles missing optional keys — no exception raised."""
    from consumers.task_events import handle_task_event

    # Minimal event — many fields missing
    await handle_task_event({})  # must not raise


@pytest.mark.asyncio
async def test_handle_task_event_deleted_no_changed_fields_line() -> None:
    """task.deleted log does not include 'changed=' segment."""
    from consumers.task_events import handle_task_event

    event = make_task_event("task.deleted")
    captured = StringIO()
    with patch("sys.stdout", captured):
        await handle_task_event(event)

    assert "changed=" not in captured.getvalue()


# ── handle_reminder_event ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_handle_reminder_event_logs_to_stdout() -> None:
    """Reminder handler prints REMINDER line with user + task info."""
    from consumers.reminders import handle_reminder_event

    event = make_reminder_event()
    captured = StringIO()
    with patch("sys.stdout", captured):
        await handle_reminder_event(event)

    output = captured.getvalue()
    assert "[reminders]" in output
    assert "REMINDER" in output
    assert "user=user-test" in output
    assert '"Test Task"' in output
    assert "due=2026-03-03" in output


@pytest.mark.asyncio
async def test_handle_reminder_event_no_raise_on_missing_fields() -> None:
    """Reminder handler does not raise on empty dict."""
    from consumers.reminders import handle_reminder_event
    await handle_reminder_event({})  # must not raise


# ── handle_task_update ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_handle_task_update_logs_to_stdout() -> None:
    """task-updates handler prints sync log line."""
    from consumers.task_updates import handle_task_update

    event = make_task_event("task.created")
    captured = StringIO()
    with patch("sys.stdout", captured):
        await handle_task_update(event)

    output = captured.getvalue()
    assert "[task-updates]" in output
    assert "sync" in output
    assert "task_id=1" in output
    assert "user_id=user-test" in output


@pytest.mark.asyncio
async def test_handle_task_update_no_raise_on_missing_fields() -> None:
    """task-updates handler does not raise on empty dict."""
    from consumers.task_updates import handle_task_update
    await handle_task_update({})  # must not raise


# ── consume_topic — loop behavior ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_consume_loop_commits_offset_plus_one_on_success() -> None:
    """Valid message: handler called, consumer.commit({tp: offset+1}) called (FR-015)."""
    from main import consume_topic

    event = make_task_event("task.created")
    msg = make_mock_message(json.dumps(event).encode("utf-8"), offset=5)

    mock_consumer = AsyncMock()
    mock_consumer.__aiter__ = MagicMock(return_value=aiter_once(msg))
    mock_consumer.commit = AsyncMock()

    mock_handler = AsyncMock()

    with patch("main.AIOKafkaConsumer", return_value=mock_consumer):
        await consume_topic("task-events", "test-group", mock_handler)

    mock_handler.assert_called_once_with(event)
    mock_consumer.commit.assert_called_once()
    call_arg = mock_consumer.commit.call_args[0][0]
    # key is TopicPartition(topic, partition), value is offset+1
    committed_offset = list(call_arg.values())[0]
    assert committed_offset == 6  # offset 5 + 1


@pytest.mark.asyncio
async def test_consume_loop_logs_to_stderr_on_malformed_json() -> None:
    """Malformed JSON: logs to stderr, commits offset+1 (skip poison pill), no crash."""
    from main import consume_topic

    msg = make_mock_message(b"not-valid-json", offset=3)

    mock_consumer = AsyncMock()
    mock_consumer.__aiter__ = MagicMock(return_value=aiter_once(msg))
    mock_consumer.commit = AsyncMock()

    mock_handler = AsyncMock()
    stderr_output = StringIO()

    with patch("main.AIOKafkaConsumer", return_value=mock_consumer):
        with patch("sys.stderr", stderr_output):
            await consume_topic("task-events", "test-group", mock_handler)

    mock_handler.assert_not_called()
    # Poison pill skipped — offset still committed
    mock_consumer.commit.assert_called_once()
    assert "DLQ" in stderr_output.getvalue() or "malformed" in stderr_output.getvalue().lower()


@pytest.mark.asyncio
async def test_consume_loop_does_not_commit_on_handler_error() -> None:
    """Handler exception: logs to stderr, does NOT commit (retry on restart)."""
    from main import consume_topic

    event = make_task_event()
    msg = make_mock_message(json.dumps(event).encode("utf-8"), offset=7)

    mock_consumer = AsyncMock()
    mock_consumer.__aiter__ = MagicMock(return_value=aiter_once(msg))
    mock_consumer.commit = AsyncMock()

    async def failing_handler(ev: dict) -> None:
        raise RuntimeError("handler blew up")

    stderr_output = StringIO()

    with patch("main.AIOKafkaConsumer", return_value=mock_consumer):
        with patch("sys.stderr", stderr_output):
            await consume_topic("task-events", "test-group", failing_handler)

    mock_consumer.commit.assert_not_called()
    assert "DLQ" in stderr_output.getvalue() or "error" in stderr_output.getvalue().lower()


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _async_gen_once(item):  # type: ignore[type-arg]
    yield item


def aiter_once(item):  # type: ignore[type-arg]
    """Return an async iterator that yields exactly one item."""
    return _async_gen_once(item).__aiter__()
