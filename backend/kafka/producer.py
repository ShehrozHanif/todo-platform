# [Task]: T013 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-001–FR-010
# AIOKafkaProducer singleton — fire-and-forget event publishing.
# Fail-open: all exceptions are caught and logged; never propagated to caller.
# Reminder de-duplication via in-memory set (reset on process restart, FR-010).

import asyncio
import logging
import os
from datetime import date, datetime, timezone
from typing import Optional

from aiokafka import AIOKafkaProducer

from kafka.events import build_task_event, build_reminder_event
from models import Task

logger = logging.getLogger(__name__)

# Module-level singleton — initialized in lifespan, shared across all requests
_producer: Optional[AIOKafkaProducer] = None

# In-memory de-duplication set for reminder events (FR-010)
# Resets on process restart — a single re-trigger on restart is acceptable (Clarification Q3)
_reminded_tasks: set[int] = set()


def _topic(base: str) -> str:
    prefix = os.getenv("KAFKA_TOPIC_PREFIX", "")
    return f"{prefix}{base}"


async def init_producer() -> None:
    """
    Start the AIOKafkaProducer singleton.
    Called from db.py lifespan on startup. Fail-open: logs warning on error.
    """
    global _producer
    bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    try:
        _producer = AIOKafkaProducer(
            bootstrap_servers=bootstrap,
            acks=1,                   # leader ack only — keeps latency low for fire-and-forget
            request_timeout_ms=5000,  # fail fast if broker unreachable
        )
        await _producer.start()
        logger.info("Kafka producer started (bootstrap=%s)", bootstrap)
    except Exception as exc:
        logger.warning("Kafka producer failed to start — events disabled: %s", exc)
        _producer = None


async def shutdown_producer() -> None:
    """Stop the producer gracefully. Called from db.py lifespan on shutdown."""
    global _producer
    if _producer is not None:
        try:
            await _producer.stop()
            logger.info("Kafka producer stopped")
        except Exception as exc:
            logger.warning("Kafka producer stop error (ignored): %s", exc)
        finally:
            _producer = None


async def publish_task_event(
    event_type: str,
    task: Task,
    changed_fields: Optional[list[str]] = None,
) -> None:
    """
    Fire-and-forget publish of a task lifecycle event to task-events AND task-updates (FR-005).

    Never raises — all exceptions are caught and logged (FR-006, SC-002).
    Partition key = task.user_id ensures per-user ordering (FR-008).
    """
    if _producer is None:
        logger.debug("Kafka producer not initialized — event dropped: %s", event_type)
        return

    event = build_task_event(event_type, task, changed_fields)
    key = task.user_id.encode("utf-8")

    async def _send() -> None:
        try:
            await _producer.send(_topic("task-events"), value=_serialize(event), key=key)
            await _producer.send(_topic("task-updates"), value=_serialize(event), key=key)
        except Exception as exc:
            logger.error(
                "Kafka publish failed [event=%s task_id=%s]: %s",
                event_type, task.id, exc,
            )

    asyncio.create_task(_send())


async def publish_reminder_if_needed(task: Task) -> None:
    """
    Publish a reminder.triggered event if the task qualifies (FR-009, FR-010).

    Qualification rules:
      - task.due_date is not None
      - task.completed is False
      - due_date is today or tomorrow (within 24 hours)
      - task.id not already in _reminded_tasks (de-duplication)

    Never raises.
    """
    if _producer is None:
        return
    if not _qualifies_for_reminder(task):
        return

    task_id = task.id
    if task_id in _reminded_tasks:
        logger.debug("Reminder already sent for task_id=%s — skipping", task_id)
        return

    event = build_reminder_event(task)
    key = task.user_id.encode("utf-8")

    async def _send() -> None:
        try:
            await _producer.send(_topic("reminders"), value=_serialize(event), key=key)
            _reminded_tasks.add(task_id)
            logger.debug("Reminder published for task_id=%s", task_id)
        except Exception as exc:
            logger.error("Kafka reminder publish failed [task_id=%s]: %s", task_id, exc)

    asyncio.create_task(_send())


def _qualifies_for_reminder(task: Task) -> bool:
    """Return True if task should receive a reminder event."""
    if task.completed or task.due_date is None:
        return False
    today = datetime.now(timezone.utc).date()
    delta = (task.due_date - today).days
    return 0 <= delta <= 1  # today or tomorrow


def _serialize(event: dict) -> bytes:
    import json
    return json.dumps(event).encode("utf-8")
