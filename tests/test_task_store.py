# [Task]: T005 [From]: specs/phase1-cli/task-crud/spec.md §TaskStore Entity
"""Tests for TaskStore in-memory storage."""

from src.models.task import Task, TaskStore


class TestTaskStoreAdd:
    def test_add_returns_task_with_id_1(self) -> None:
        store = TaskStore()
        task = store.add("First task", "Description")
        assert isinstance(task, Task)
        assert task.id == 1

    def test_add_auto_increments_id(self) -> None:
        store = TaskStore()
        t1 = store.add("Task 1", "")
        t2 = store.add("Task 2", "")
        t3 = store.add("Task 3", "")
        assert t1.id == 1
        assert t2.id == 2
        assert t3.id == 3

    def test_add_with_empty_description(self) -> None:
        store = TaskStore()
        task = store.add("Title", "")
        assert task.description == ""


class TestTaskStoreGetById:
    def test_get_existing_task(self) -> None:
        store = TaskStore()
        added = store.add("Test", "Desc")
        found = store.get_by_id(added.id)
        assert found is not None
        assert found.id == added.id

    def test_get_nonexistent_returns_none(self) -> None:
        store = TaskStore()
        assert store.get_by_id(99) is None

    def test_get_from_empty_store_returns_none(self) -> None:
        store = TaskStore()
        assert store.get_by_id(1) is None


class TestTaskStoreGetAll:
    def test_get_all_empty_store(self) -> None:
        store = TaskStore()
        assert store.get_all() == []

    def test_get_all_returns_all_tasks(self) -> None:
        store = TaskStore()
        store.add("Task 1", "")
        store.add("Task 2", "")
        assert len(store.get_all()) == 2

    def test_get_all_returns_copy(self) -> None:
        store = TaskStore()
        store.add("Task 1", "")
        tasks = store.get_all()
        tasks.clear()
        assert len(store.get_all()) == 1  # Original unaffected


class TestTaskStoreUpdate:
    def test_update_title(self) -> None:
        store = TaskStore()
        store.add("Original", "Desc")
        updated = store.update(1, title="New Title")
        assert updated.title == "New Title"
        assert updated.description == "Desc"

    def test_update_description(self) -> None:
        store = TaskStore()
        store.add("Title", "Old Desc")
        updated = store.update(1, description="New Desc")
        assert updated.description == "New Desc"

    def test_update_nonexistent_returns_none(self) -> None:
        store = TaskStore()
        assert store.update(99, title="New") is None

    def test_update_preserves_unmodified_fields(self) -> None:
        store = TaskStore()
        store.add("Title", "Desc")
        updated = store.update(1, title="New Title")
        assert updated.description == "Desc"
        assert updated.completed is False


class TestTaskStoreDelete:
    def test_delete_existing_task(self) -> None:
        store = TaskStore()
        store.add("Task", "")
        assert store.delete(1) is True

    def test_delete_removes_from_list(self) -> None:
        store = TaskStore()
        store.add("Task", "")
        store.delete(1)
        assert store.get_by_id(1) is None

    def test_delete_nonexistent_returns_false(self) -> None:
        store = TaskStore()
        assert store.delete(99) is False

    def test_id_never_reused_after_deletion(self) -> None:
        store = TaskStore()
        store.add("Task 1", "")
        store.add("Task 2", "")
        store.delete(1)
        t3 = store.add("Task 3", "")
        assert t3.id == 3  # NOT 1

    def test_next_id_starts_at_1(self) -> None:
        store = TaskStore()
        task = store.add("First", "")
        assert task.id == 1
