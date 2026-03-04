# [Task]: T004 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-007
# RED tests for Kafka event serialization helpers.
# Spec: FR-007 (event envelope), FR-002 (changed_fields), FR-009 (reminder envelope)

import json
from datetime import date, datetime
from typing import Optional

import pytest
from sqlmodel import Field, SQLModel


# ── Minimal Task stub (avoids importing the real DB model in unit tests) ──────

class _Task(SQLModel):
    id: Optional[int] = 1
    user_id: str = "user_test"
    title: str = "Test task"
    description: Optional[str] = None
    completed: bool = False
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None            # stored as JSON string in DB
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: Optional[bool] = False
    created_at: Optional[datetime] = datetime(2026, 3, 3, 12, 0, 0)


@pytest.fixture
def task() -> _Task:
    return _Task()


@pytest.fixture
def task_with_tags() -> _Task:
    return _Task(tags='["shopping", "urgent"]', due_date=date(2026, 3, 4), due_time="09:00")


# ── Tests for build_task_event ────────────────────────────────────────────────

def test_task_created_envelope(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task)

    assert event["event_type"] == "task.created"
    assert event["task_id"] == task.id
    assert event["user_id"] == task.user_id
    assert "timestamp" in event
    assert event["timestamp"].endswith("Z")
    assert "payload" in event
    assert "changed_fields" not in event


def test_task_updated_includes_changed_fields(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.updated", task, changed_fields=["title", "due_date"])

    assert event["event_type"] == "task.updated"
    assert event["changed_fields"] == ["title", "due_date"]


def test_task_updated_empty_changed_fields_not_included(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.updated", task, changed_fields=None)
    assert "changed_fields" not in event


def test_task_deleted_no_changed_fields(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.deleted", task)
    assert "changed_fields" not in event


def test_payload_contains_all_task_snapshot_fields(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task)
    payload = event["payload"]

    assert payload["id"] == task.id
    assert payload["user_id"] == task.user_id
    assert payload["title"] == task.title
    assert payload["completed"] == task.completed
    assert "priority" in payload
    assert "category" in payload
    assert "tags" in payload
    assert "due_date" in payload
    assert "due_time" in payload
    assert "recurring" in payload
    assert "reminder" in payload
    assert "created_at" in payload


def test_tags_deserialized_from_json_string(task_with_tags: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task_with_tags)
    assert event["payload"]["tags"] == ["shopping", "urgent"]


def test_tags_none_serializes_as_empty_list(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task)
    assert event["payload"]["tags"] == []


def test_due_date_serialized_as_string(task_with_tags: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task_with_tags)
    assert event["payload"]["due_date"] == "2026-03-04"


def test_due_date_none_serialized_as_none(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task)
    assert event["payload"]["due_date"] is None


def test_created_at_serialized_as_iso_utc(task: _Task) -> None:
    from kafka.events import build_task_event

    event = build_task_event("task.created", task)
    created_at = event["payload"]["created_at"]
    assert isinstance(created_at, str)
    assert "2026" in created_at


# ── Tests for build_reminder_event ───────────────────────────────────────────

def test_reminder_event_envelope(task_with_tags: _Task) -> None:
    from kafka.events import build_reminder_event

    event = build_reminder_event(task_with_tags)

    assert event["event_type"] == "reminder.triggered"
    assert event["task_id"] == task_with_tags.id
    assert event["user_id"] == task_with_tags.user_id
    assert event["title"] == task_with_tags.title
    assert event["due_date"] == "2026-03-04"
    assert event["due_time"] == "09:00"
    assert "triggered_at" in event
    assert event["triggered_at"].endswith("Z")


def test_reminder_event_no_due_time(task: _Task) -> None:
    from kafka.events import build_reminder_event

    event = build_reminder_event(task)
    assert event["due_time"] is None
