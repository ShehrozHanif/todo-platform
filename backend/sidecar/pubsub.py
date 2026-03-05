# [Task]: T011 [From]: specs/phase5-cloud/dapr-integration/spec.md §US1
# Dapr Pub/Sub wrapper — fire-and-forget publishing via DaprClient (synchronous).
# Called via BackgroundTasks.add_task() to avoid blocking the asyncio event loop.

import json
import logging
import os
from datetime import datetime
from typing import Any

from dapr.clients import DaprClient

_log = logging.getLogger(__name__)

_PUBSUB_NAME = "kafka-pubsub"


def _publish_sync(
    pubsub: str,
    topic: str,
    data: dict[str, Any],
    partition_key: str,
) -> None:
    """
    Thread-safe synchronous Dapr publish. Runs in FastAPI's thread pool via
    BackgroundTasks.add_task(). Never raises — fire-and-forget semantics.
    Skipped entirely when DAPR_ENABLED != "true".
    """
    if os.getenv("DAPR_ENABLED", "false").lower() != "true":
        return
    try:
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=pubsub,
                topic_name=topic,
                data=json.dumps(data),
                data_content_type="application/json",
                metadata={"partitionKey": partition_key},
            )
    except Exception as exc:
        _log.error("Dapr publish failed [topic=%s]: %s", topic, exc)


def build_task_event(
    event_type: str,
    task: Any,
    changed_fields: list[str] | None = None,
) -> dict[str, Any]:
    """Build canonical task lifecycle event payload."""
    event: dict[str, Any] = {
        "event_type": event_type,
        "task_id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "completed": task.completed,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if changed_fields is not None:
        event["changed_fields"] = changed_fields
    return event


def build_reminder_event(task: Any) -> dict[str, Any]:
    """Build a reminder.triggered event payload for the reminders topic."""
    return {
        "event_type": "reminder.triggered",
        "task_id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "timestamp": datetime.utcnow().isoformat(),
    }
