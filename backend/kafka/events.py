# [Task]: T006 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-007 §FR-002 §FR-009
# Event serialization helpers — build TaskEvent and ReminderEvent envelopes.
# All events use ISO 8601 UTC timestamps. Tags are deserialized from JSON string.

import json
from datetime import datetime, timezone
from typing import Optional

from models import Task


def build_task_event(
    event_type: str,
    task: Task,
    changed_fields: Optional[list[str]] = None,
) -> dict:
    """
    Build a TaskEvent envelope (FR-007).

    Args:
        event_type: One of task.created | task.updated | task.deleted |
                    task.completed | task.reopened
        task:       SQLModel Task instance — snapshot taken at call time
        changed_fields: Flat list of field names changed; only included on task.updated

    Returns:
        dict ready for JSON serialisation and Kafka send
    """
    event: dict = {
        "event_type": event_type,
        "task_id": task.id,
        "user_id": task.user_id,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "payload": _build_snapshot(task),
    }
    if changed_fields is not None:
        event["changed_fields"] = changed_fields
    return event


def build_reminder_event(task: Task) -> dict:
    """
    Build a ReminderEvent envelope (FR-009).

    Returns:
        dict ready for JSON serialisation and Kafka send to 'reminders' topic
    """
    return {
        "event_type": "reminder.triggered",
        "task_id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "due_time": task.due_time,
        "triggered_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }


def _build_snapshot(task: Task) -> dict:
    """Serialize a Task to a plain dict suitable for the event payload."""
    # Deserialize tags from stored JSON string
    tags: list[str] = []
    if task.tags:
        try:
            tags = json.loads(task.tags)
        except (json.JSONDecodeError, TypeError):
            tags = []

    return {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "completed": task.completed,
        "priority": task.priority,
        "category": task.category,
        "tags": tags,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "due_time": task.due_time,
        "recurring": task.recurring,
        "reminder": task.reminder,
        "created_at": (
            task.created_at.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            if task.created_at
            else None
        ),
    }
