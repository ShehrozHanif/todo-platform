# [Task]: T024 [From]: specs/phase5-cloud/kafka-events/spec.md §FR-012
# Handler for reminders topic — logs approaching due-date alerts to stdout.

import sys
from typing import Any


async def handle_reminder_event(event: dict[str, Any]) -> None:
    """
    Process a reminder.triggered event from the reminders topic.

    Prints structured log to stdout with task identity and due date.
    Missing optional fields (due_time) are silently ignored.
    """
    task_id = event.get("task_id", "?")
    user_id = event.get("user_id", "?")
    title = event.get("title", "?")
    due_date = event.get("due_date", "?")

    line = f'[reminders] REMINDER | task_id={task_id} | user={user_id} | title="{title}" | due={due_date}'

    print(line, file=sys.stdout)
    sys.stdout.flush()
