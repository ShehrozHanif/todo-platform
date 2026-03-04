# [Task]: T015 [From]: specs/phase5-cloud/dapr-integration/spec.md §US2
# Dapr Jobs API — reminder-scan job registration and scanning logic.
# register_reminder_job(): HTTP POST to Dapr Jobs API (no SDK support until 1.16).
# scan_and_publish_reminders(): query due tasks, deduplicate, publish via Dapr Pub/Sub.

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

import httpx
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models import Task
from sidecar.pubsub import _publish_sync, build_reminder_event

_log = logging.getLogger(__name__)

# In-process dedup set: prevents duplicate reminders within one pod lifetime (§Assumptions).
_reminded_task_ids: set[int] = set()


async def register_reminder_job() -> None:
    """
    Register the 'reminder-scan' job with Dapr Jobs API at application startup.
    Fail-open: if sidecar is unavailable, logs WARNING and returns normally.
    Idempotent: Dapr upserts existing jobs with the same name.
    """
    port = os.getenv("DAPR_HTTP_PORT", "3500")
    url = f"http://localhost:{port}/v1.0-alpha1/jobs/reminder-scan"
    payload = {
        "schedule": "@every 5m",
        "data": {"type": "reminder_scan"},
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(url, json=payload, timeout=5.0)
    except Exception as exc:
        _log.warning("Dapr job registration failed (reminder-scan): %s", exc)


async def scan_and_publish_reminders(session: AsyncSession) -> None:
    """
    Query tasks with due_date <= now+24h AND completed=False.
    Publish reminder.triggered to 'reminders' topic for each un-reminded task.
    In-process _reminded_task_ids set prevents duplicate publishes within a pod lifetime.
    """
    cutoff = (datetime.utcnow() + timedelta(hours=24)).date()
    result = await session.exec(
        select(Task).where(
            Task.completed == False,  # noqa: E712
            Task.due_date != None,  # noqa: E711
            Task.due_date <= cutoff,
        )
    )
    tasks = result.all()

    for task in tasks:
        if task.id not in _reminded_task_ids:
            event = build_reminder_event(task)
            await asyncio.to_thread(
                _publish_sync, "kafka-pubsub", "reminders", event, task.user_id
            )
            _reminded_task_ids.add(task.id)
