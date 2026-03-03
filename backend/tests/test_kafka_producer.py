# [Task]: T011 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-001–FR-010
# RED / GREEN tests for Kafka producer: fire-and-forget, fail-open, reminder dedup.

import asyncio
import json
import os
from datetime import date, datetime
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlmodel import Field, SQLModel


# ── Task stub ─────────────────────────────────────────────────────────────────

class _Task(SQLModel):
    id: Optional[int] = 1
    user_id: str = "user_test"
    title: str = "Test task"
    description: Optional[str] = None
    completed: bool = False
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: Optional[bool] = False
    created_at: Optional[datetime] = datetime(2026, 3, 3, 12, 0, 0)


@pytest.fixture
def task() -> _Task:
    return _Task()


@pytest.fixture
def task_due_today() -> _Task:
    return _Task(
        id=99,
        due_date=date.today(),
        reminder=True,
        completed=False,
    )


@pytest.fixture(autouse=True)
def reset_producer_state():
    """Reset module-level producer and dedup set between tests."""
    import kafka.producer as kp
    kp._producer = None
    kp._reminded_tasks = set()
    yield
    kp._producer = None
    kp._reminded_tasks = set()


# ── publish_task_event — core behavior ────────────────────────────────────────

@pytest.mark.asyncio
async def test_publish_task_event_sends_to_both_topics(task: _Task) -> None:
    """Every lifecycle event must be published to task-events AND task-updates (FR-005)."""
    import kafka.producer as kp

    mock_send = AsyncMock()
    mock_producer = MagicMock()
    mock_producer.send = mock_send
    kp._producer = mock_producer

    await kp.publish_task_event("task.created", task)
    await asyncio.sleep(0)  # allow create_task to run

    assert mock_send.call_count == 2
    topics_called = {call_args[0][0] for call_args in mock_send.call_args_list}
    assert "task-events" in topics_called
    assert "task-updates" in topics_called


@pytest.mark.asyncio
async def test_publish_task_event_partition_key_is_user_id(task: _Task) -> None:
    """Events must be partitioned by user_id (FR-008)."""
    import kafka.producer as kp

    mock_send = AsyncMock()
    mock_producer = MagicMock()
    mock_producer.send = mock_send
    kp._producer = mock_producer

    await kp.publish_task_event("task.created", task)
    await asyncio.sleep(0)

    for call_args in mock_send.call_args_list:
        key = call_args[1].get("key") or (call_args[0][1] if len(call_args[0]) > 1 else None)
        # key is passed as keyword argument
        assert call_args[1].get("key") == task.user_id.encode("utf-8")


@pytest.mark.asyncio
async def test_publish_task_event_updated_includes_changed_fields(task: _Task) -> None:
    import kafka.producer as kp

    sent_values = []

    async def capture_send(topic, *, value, key):
        sent_values.append(value)

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_task_event("task.updated", task, changed_fields=["title"])
    await asyncio.sleep(0)

    decoded = [json.loads(v) for v in sent_values]
    assert any("changed_fields" in v and v["changed_fields"] == ["title"] for v in decoded)


@pytest.mark.asyncio
async def test_publish_task_event_deleted_no_changed_fields(task: _Task) -> None:
    import kafka.producer as kp

    sent_values = []

    async def capture_send(topic, *, value, key):
        sent_values.append(value)

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_task_event("task.deleted", task)
    await asyncio.sleep(0)

    decoded = [json.loads(v) for v in sent_values]
    assert all("changed_fields" not in v for v in decoded)


# ── task-updates: identical payload + partition key ──────────────────────────

@pytest.mark.asyncio
async def test_task_updates_receives_same_payload_as_task_events(task: _Task) -> None:
    """task-updates payload must be identical to task-events payload (FR-005)."""
    import kafka.producer as kp

    sent: list[tuple[str, bytes]] = []

    async def capture_send(topic, *, value, key):
        sent.append((topic, value))

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_task_event("task.created", task)
    await asyncio.sleep(0)

    task_events_payloads = [v for t, v in sent if "task-events" in t]
    task_updates_payloads = [v for t, v in sent if "task-updates" in t]
    assert len(task_events_payloads) == 1
    assert len(task_updates_payloads) == 1
    assert task_events_payloads[0] == task_updates_payloads[0]


@pytest.mark.asyncio
async def test_task_updates_partition_key_is_user_id(task: _Task) -> None:
    """task-updates uses same partition key (user_id bytes) as task-events (FR-008)."""
    import kafka.producer as kp

    sent_keys: dict[str, bytes] = {}

    async def capture_send(topic, *, value, key):
        sent_keys[topic] = key

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_task_event("task.created", task)
    await asyncio.sleep(0)

    assert "task-events" in sent_keys
    assert "task-updates" in sent_keys
    assert sent_keys["task-events"] == task.user_id.encode("utf-8")
    assert sent_keys["task-updates"] == task.user_id.encode("utf-8")


@pytest.mark.asyncio
async def test_task_updates_uses_prefix_from_env(task: _Task) -> None:
    """task-updates topic name respects KAFKA_TOPIC_PREFIX env var."""
    import kafka.producer as kp

    sent_topics: list[str] = []

    async def capture_send(topic, *, value, key):
        sent_topics.append(topic)

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    with patch.dict("os.environ", {"KAFKA_TOPIC_PREFIX": "dev-"}):
        await kp.publish_task_event("task.created", task)
        await asyncio.sleep(0)

    assert "dev-task-events" in sent_topics
    assert "dev-task-updates" in sent_topics


# ── publish_task_event — fail-open behavior ───────────────────────────────────

@pytest.mark.asyncio
async def test_publish_task_event_no_exception_when_producer_none(task: _Task) -> None:
    """API must never fail if Kafka producer is not initialized (FR-006, SC-002)."""
    import kafka.producer as kp

    kp._producer = None
    # Must not raise
    await kp.publish_task_event("task.created", task)


@pytest.mark.asyncio
async def test_publish_task_event_no_exception_when_send_raises(task: _Task) -> None:
    """Producer send failures must not propagate to caller (FR-006)."""
    import kafka.producer as kp

    mock_producer = MagicMock()
    mock_producer.send = AsyncMock(side_effect=Exception("broker down"))
    kp._producer = mock_producer

    # Must not raise
    await kp.publish_task_event("task.created", task)
    await asyncio.sleep(0)


# ── publish_reminder_if_needed — reminder logic ───────────────────────────────

@pytest.mark.asyncio
async def test_reminder_published_for_due_today_task(task_due_today: _Task) -> None:
    import kafka.producer as kp

    sent_topics = []

    async def capture_send(topic, *, value, key):
        sent_topics.append(topic)

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_reminder_if_needed(task_due_today)
    await asyncio.sleep(0)

    assert any("reminders" in t for t in sent_topics)


@pytest.mark.asyncio
async def test_reminder_not_published_for_completed_task(task_due_today: _Task) -> None:
    import kafka.producer as kp

    mock_send = AsyncMock()
    mock_producer = MagicMock()
    mock_producer.send = mock_send
    kp._producer = mock_producer

    task_due_today.completed = True
    await kp.publish_reminder_if_needed(task_due_today)
    await asyncio.sleep(0)

    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_reminder_not_published_when_no_due_date(task: _Task) -> None:
    import kafka.producer as kp

    mock_send = AsyncMock()
    mock_producer = MagicMock()
    mock_producer.send = mock_send
    kp._producer = mock_producer

    await kp.publish_reminder_if_needed(task)
    await asyncio.sleep(0)

    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_reminder_not_published_when_due_date_far_future(task: _Task) -> None:
    import kafka.producer as kp
    from datetime import timedelta

    mock_send = AsyncMock()
    mock_producer = MagicMock()
    mock_producer.send = mock_send
    kp._producer = mock_producer

    task.due_date = date.today() + timedelta(days=5)
    await kp.publish_reminder_if_needed(task)
    await asyncio.sleep(0)

    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_reminder_deduplication_sends_once(task_due_today: _Task) -> None:
    """Same task must not get two reminder events in the same session (FR-010)."""
    import kafka.producer as kp

    sent_count = 0

    async def capture_send(topic, *, value, key):
        nonlocal sent_count
        if "reminders" in topic:
            sent_count += 1

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_reminder_if_needed(task_due_today)
    await asyncio.sleep(0)
    await kp.publish_reminder_if_needed(task_due_today)
    await asyncio.sleep(0)

    assert sent_count == 1


@pytest.mark.asyncio
async def test_reminder_event_has_correct_envelope(task_due_today: _Task) -> None:
    import kafka.producer as kp

    sent_values = []

    async def capture_send(topic, *, value, key):
        sent_values.append((topic, value))

    mock_producer = MagicMock()
    mock_producer.send = capture_send
    kp._producer = mock_producer

    await kp.publish_reminder_if_needed(task_due_today)
    await asyncio.sleep(0)

    reminder_events = [json.loads(v) for t, v in sent_values if "reminders" in t]
    assert len(reminder_events) == 1
    ev = reminder_events[0]
    assert ev["event_type"] == "reminder.triggered"
    assert ev["task_id"] == task_due_today.id
    assert ev["user_id"] == task_due_today.user_id
    assert "triggered_at" in ev
