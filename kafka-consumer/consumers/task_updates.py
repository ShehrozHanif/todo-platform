# [Task]: T025 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012
# Handler for task-updates topic — logs real-time sync events to stdout.

import sys
from typing import Any


async def handle_task_update(event: dict[str, Any]) -> None:
    """
    Process a task sync event from the task-updates topic.

    Prints structured log to stdout. Mirrors handle_task_event output
    with a [task-updates] prefix to distinguish source topic.
    """
    task_id = event.get("task_id", "?")
    event_type = event.get("event_type", "unknown")
    user_id = event.get("user_id", "?")

    line = f"[task-updates] sync | task_id={task_id} | event={event_type} | user_id={user_id}"

    print(line, file=sys.stdout)
    sys.stdout.flush()
