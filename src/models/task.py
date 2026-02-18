# [Task]: T006, T007 [From]: specs/phase1-cli/task-crud/spec.md §FR-001, §FR-002, §FR-008
"""Task data model and in-memory storage.

Provides the Task dataclass and TaskStore for managing tasks in memory.
No persistence — data is lost when the application exits.
"""

from dataclasses import dataclass, field


@dataclass
class Task:
    """Represents a single to-do item.

    Attributes:
        id: Unique auto-incremented integer identifier.
        title: Non-empty task title.
        description: Optional task description, defaults to empty string.
        completed: Completion status, defaults to False.
    """

    id: int
    title: str
    description: str = ""
    completed: bool = False


class TaskStore:
    """In-memory storage for Task objects.

    Maintains an ordered list of tasks with auto-incrementing IDs.
    IDs are never reused after deletion.
    """

    def __init__(self) -> None:
        self._tasks: list[Task] = []
        self._next_id: int = 1

    def add(self, title: str, description: str = "") -> Task:
        """Create a new task with an auto-incremented ID."""
        task = Task(id=self._next_id, title=title, description=description)
        self._tasks.append(task)
        self._next_id += 1
        return task

    def get_by_id(self, task_id: int) -> Task | None:
        """Retrieve a task by its ID. Returns None if not found."""
        for task in self._tasks:
            if task.id == task_id:
                return task
        return None

    def get_all(self) -> list[Task]:
        """Retrieve all tasks in insertion order. Returns a COPY."""
        return list(self._tasks)

    def update(self, task_id: int, **fields: str | bool) -> Task | None:
        """Update fields on an existing task using setattr."""
        task = self.get_by_id(task_id)
        if task is None:
            return None
        for key, value in fields.items():
            if hasattr(task, key):
                setattr(task, key, value)
        return task

    def delete(self, task_id: int) -> bool:
        """Remove a task by ID. The ID is never reused."""
        for i, task in enumerate(self._tasks):
            if task.id == task_id:
                self._tasks.pop(i)
                return True
        return False
