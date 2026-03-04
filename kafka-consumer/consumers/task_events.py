# [Task]: T023 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012
# Handler for task-events topic — logs lifecycle events to stdout.

import sys
from typing import Any


async def handle_task_event(event: dict[str, Any]) -> None:
    """
    Process a task lifecycle event from the task-events topic.

    Prints structured log to stdout. For task.updated, also prints changed_fields.
    Missing optional fields are silently ignored — handler never raises.
    """
    event_type = event.get("event_type", "unknown")
    task_id = event.get("task_id", "?")
    user_id = event.get("user_id", "?")
    timestamp = event.get("timestamp", "?")

    line = f"[task-events] {event_type} | task_id={task_id} | user_id={user_id} | ts={timestamp}"

    if event_type == "task.updated":
        changed = event.get("changed_fields", [])
        if changed:
            line += f" | changed={','.join(changed)}"

    print(line, file=sys.stdout)
    sys.stdout.flush()
