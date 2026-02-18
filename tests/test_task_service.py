# [Task]: T009 [From]: specs/phase1-cli/task-crud/spec.md §FR-003, §FR-005, §FR-007
"""Tests for TaskService business logic layer."""

import pytest
from src.models.task import TaskStore
from src.services.task_service import TaskService


def _make_service() -> TaskService:
    return TaskService(TaskStore())


class TestAddTask:
    def test_add_task_returns_task_with_auto_id(self) -> None:
        service = _make_service()
        task = service.add_task("Buy groceries", "Milk, eggs")
        assert task.id == 1
        assert task.title == "Buy groceries"

    def test_add_task_empty_description_defaults(self) -> None:
        service = _make_service()
        task = service.add_task("Test task")
        assert task.description == ""

    def test_add_task_empty_title_raises_value_error(self) -> None:
        service = _make_service()
        with pytest.raises(ValueError):
            service.add_task("")

    def test_add_task_whitespace_only_title_raises_value_error(self) -> None:
        service = _make_service()
        with pytest.raises(ValueError):
            service.add_task("   ")

    def test_add_task_strips_whitespace_from_title(self) -> None:
        service = _make_service()
        task = service.add_task("  Buy groceries  ", "")
        assert task.title == "Buy groceries"

    def test_sequential_adds_produce_incrementing_ids(self) -> None:
        service = _make_service()
        t1 = service.add_task("Task 1")
        t2 = service.add_task("Task 2")
        assert t1.id == 1
        assert t2.id == 2


class TestGetAllTasks:
    def test_returns_empty_list_when_no_tasks(self) -> None:
        assert _make_service().get_all_tasks() == []

    def test_returns_all_tasks_after_adding(self) -> None:
        service = _make_service()
        service.add_task("Task 1")
        service.add_task("Task 2")
        assert len(service.get_all_tasks()) == 2


class TestToggleComplete:
    def test_toggles_incomplete_to_complete(self) -> None:
        service = _make_service()
        service.add_task("Task")
        result = service.toggle_complete(1)
        assert result.completed is True

    def test_toggles_complete_back_to_incomplete(self) -> None:
        service = _make_service()
        service.add_task("Task")
        service.toggle_complete(1)
        result = service.toggle_complete(1)
        assert result.completed is False

    def test_returns_none_for_nonexistent_id(self) -> None:
        assert _make_service().toggle_complete(99) is None


class TestUpdateTask:
    def test_updates_both_title_and_description(self) -> None:
        service = _make_service()
        service.add_task("Old", "Old Desc")
        result = service.update_task(1, "New", "New Desc")
        assert result.title == "New"
        assert result.description == "New Desc"

    def test_empty_title_keeps_existing(self) -> None:
        service = _make_service()
        service.add_task("Keep This", "Desc")
        result = service.update_task(1, "", "New Desc")
        assert result.title == "Keep This"

    def test_empty_description_keeps_existing(self) -> None:
        service = _make_service()
        service.add_task("Title", "Keep This Desc")
        result = service.update_task(1, "New Title", "")
        assert result.description == "Keep This Desc"

    def test_preserves_completed_status(self) -> None:
        service = _make_service()
        service.add_task("Task")
        service.toggle_complete(1)
        result = service.update_task(1, "Updated")
        assert result.completed is True

    def test_returns_none_for_nonexistent_id(self) -> None:
        assert _make_service().update_task(99, "Title") is None

    def test_whitespace_only_title_keeps_existing(self) -> None:
        service = _make_service()
        service.add_task("Keep This", "Desc")
        result = service.update_task(1, "   ", "")
        assert result.title == "Keep This"


class TestDeleteTask:
    def test_deletes_existing_task(self) -> None:
        service = _make_service()
        service.add_task("Task")
        assert service.delete_task(1) is True

    def test_returns_false_for_nonexistent_id(self) -> None:
        assert _make_service().delete_task(99) is False

    def test_deleted_task_not_in_get_all(self) -> None:
        service = _make_service()
        service.add_task("Task 1")
        service.add_task("Task 2")
        service.delete_task(1)
        tasks = service.get_all_tasks()
        assert len(tasks) == 1
        assert tasks[0].id == 2
