# Service Layer Template — services/task_service.py

## TaskService Class

```python
"""Business logic layer for task management.

Provides TaskService with CRUD operations, validation, and status toggling.
Delegates storage to TaskStore. Raises ValueError for validation failures.
Returns None for not-found cases.
"""

from src.models.task import Task, TaskStore


class TaskService:
    """Service layer for task operations."""

    def __init__(self, store: TaskStore) -> None:
        self._store = store

    def add_task(self, title: str, description: str = "") -> Task:
        """Create a new task with validated title.

        Raises ValueError if title is empty after stripping whitespace.
        """
        title = title.strip()
        if not title:
            raise ValueError("Title cannot be empty")
        return self._store.add(title, description)

    def get_all_tasks(self) -> list[Task]:
        """Retrieve all tasks."""
        return self._store.get_all()

    def get_task(self, task_id: int) -> Task | None:
        """Retrieve a single task by ID."""
        return self._store.get_by_id(task_id)

    def update_task(self, task_id: int, title: str = "", description: str = "") -> Task | None:
        """Update a task. Empty string = keep existing value.
        Whitespace-only title = keep existing (not a validation error).
        """
        task = self._store.get_by_id(task_id)
        if task is None:
            return None
        fields: dict[str, str] = {}
        stripped_title = title.strip()
        if stripped_title:
            fields["title"] = stripped_title
        if description:
            fields["description"] = description
        if fields:
            return self._store.update(task_id, **fields)
        return task

    def delete_task(self, task_id: int) -> bool:
        """Delete a task by ID. Returns True if deleted, False if not found."""
        return self._store.delete(task_id)

    def toggle_complete(self, task_id: int) -> Task | None:
        """Toggle a task's completion status."""
        task = self._store.get_by_id(task_id)
        if task is None:
            return None
        return self._store.update(task_id, completed=not task.completed)
```

## __init__.py Exports

```python
# src/services/__init__.py
from src.services.task_service import TaskService

__all__ = ["TaskService"]
```

## Validation Rules

| Input | Behavior |
|-------|----------|
| `add_task("")` | Raises `ValueError` |
| `add_task("   ")` | Raises `ValueError` (whitespace-only) |
| `add_task("  Buy groceries  ")` | Strips to "Buy groceries" |
| `update_task(id, "", "")` | Keeps ALL existing values |
| `update_task(id, "   ", "")` | Keeps existing title (whitespace-only = keep) |
| `toggle_complete(99)` | Returns `None` (not found) |
| `delete_task(99)` | Returns `False` (not found) |
