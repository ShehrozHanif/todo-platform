# [Task]: T004 [From]: specs/phase1-cli/task-crud/spec.md §Task Entity
"""Tests for Task dataclass."""

from src.models.task import Task


class TestTaskCreation:
    def test_create_task_with_all_fields(self) -> None:
        task = Task(id=1, title="Buy groceries", description="Milk, eggs", completed=True)
        assert task.id == 1
        assert task.title == "Buy groceries"
        assert task.description == "Milk, eggs"
        assert task.completed is True

    def test_default_completed_is_false(self) -> None:
        task = Task(id=1, title="Test task")
        assert task.completed is False

    def test_default_description_is_empty_string(self) -> None:
        task = Task(id=1, title="Test task")
        assert task.description == ""

    def test_field_access_and_modification(self) -> None:
        task = Task(id=1, title="Original")
        task.title = "Modified"
        assert task.title == "Modified"
        task.completed = True
        assert task.completed is True

    def test_task_id_is_integer(self) -> None:
        task = Task(id=42, title="Test")
        assert isinstance(task.id, int)
