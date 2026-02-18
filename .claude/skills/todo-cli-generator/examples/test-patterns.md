# Test Patterns — Complete Reference (70 Tests)

## Testing Philosophy

- Write tests FIRST (Red), then implement (Green)
- Use REAL objects (TaskStore, TaskService) — no mocks for in-memory code
- Use `monkeypatch` for `builtins.input` in CLI tests
- Use `capsys` for capturing `print()` output
- Each test class = one feature/user story
- Helper factories at module level: `_make_service()`, `_make_cli()`

## File 1: test_task_model.py (5 tests)

```python
"""Tests for Task dataclass."""

from src.models.task import Task


class TestTaskCreation:
    def test_create_task_with_all_fields(self):
        task = Task(id=1, title="Buy groceries", description="Milk, eggs", completed=True)
        assert task.id == 1
        assert task.title == "Buy groceries"
        assert task.description == "Milk, eggs"
        assert task.completed is True

    def test_default_completed_is_false(self):
        task = Task(id=1, title="Test task")
        assert task.completed is False

    def test_default_description_is_empty_string(self):
        task = Task(id=1, title="Test task")
        assert task.description == ""

    def test_field_access_and_modification(self):
        task = Task(id=1, title="Original")
        task.title = "Modified"
        assert task.title == "Modified"
        task.completed = True
        assert task.completed is True

    def test_task_id_is_integer(self):
        task = Task(id=42, title="Test")
        assert isinstance(task.id, int)
```

## File 2: test_task_store.py (18 tests)

```python
"""Tests for TaskStore in-memory storage."""

from src.models.task import Task, TaskStore


class TestTaskStoreAdd:
    def test_add_returns_task_with_id_1(self):
        store = TaskStore()
        task = store.add("First task", "Description")
        assert isinstance(task, Task)
        assert task.id == 1

    def test_add_auto_increments_id(self):
        store = TaskStore()
        t1 = store.add("Task 1", "")
        t2 = store.add("Task 2", "")
        t3 = store.add("Task 3", "")
        assert t1.id == 1
        assert t2.id == 2
        assert t3.id == 3

    def test_add_with_empty_description(self):
        store = TaskStore()
        task = store.add("Title", "")
        assert task.description == ""


class TestTaskStoreGetById:
    def test_get_existing_task(self):
        store = TaskStore()
        added = store.add("Test", "Desc")
        found = store.get_by_id(added.id)
        assert found is not None
        assert found.id == added.id

    def test_get_nonexistent_returns_none(self):
        store = TaskStore()
        assert store.get_by_id(99) is None

    def test_get_from_empty_store_returns_none(self):
        store = TaskStore()
        assert store.get_by_id(1) is None


class TestTaskStoreGetAll:
    def test_get_all_empty_store(self):
        store = TaskStore()
        assert store.get_all() == []

    def test_get_all_returns_all_tasks(self):
        store = TaskStore()
        store.add("Task 1", "")
        store.add("Task 2", "")
        assert len(store.get_all()) == 2

    def test_get_all_returns_copy(self):
        store = TaskStore()
        store.add("Task 1", "")
        tasks = store.get_all()
        tasks.clear()
        assert len(store.get_all()) == 1  # Original unaffected


class TestTaskStoreUpdate:
    def test_update_title(self):
        store = TaskStore()
        store.add("Original", "Desc")
        updated = store.update(1, title="New Title")
        assert updated.title == "New Title"
        assert updated.description == "Desc"

    def test_update_description(self):
        store = TaskStore()
        store.add("Title", "Old Desc")
        updated = store.update(1, description="New Desc")
        assert updated.description == "New Desc"

    def test_update_nonexistent_returns_none(self):
        store = TaskStore()
        assert store.update(99, title="New") is None

    def test_update_preserves_unmodified_fields(self):
        store = TaskStore()
        store.add("Title", "Desc")
        updated = store.update(1, title="New Title")
        assert updated.description == "Desc"
        assert updated.completed is False


class TestTaskStoreDelete:
    def test_delete_existing_task(self):
        store = TaskStore()
        store.add("Task", "")
        assert store.delete(1) is True

    def test_delete_removes_from_list(self):
        store = TaskStore()
        store.add("Task", "")
        store.delete(1)
        assert store.get_by_id(1) is None

    def test_delete_nonexistent_returns_false(self):
        store = TaskStore()
        assert store.delete(99) is False

    def test_id_never_reused_after_deletion(self):
        store = TaskStore()
        store.add("Task 1", "")
        store.add("Task 2", "")
        store.delete(1)
        t3 = store.add("Task 3", "")
        assert t3.id == 3  # NOT 1

    def test_next_id_starts_at_1(self):
        store = TaskStore()
        task = store.add("First", "")
        assert task.id == 1
```

## File 3: test_task_service.py (20 tests)

```python
"""Tests for TaskService business logic layer."""

import pytest
from src.models.task import TaskStore
from src.services.task_service import TaskService


def _make_service() -> TaskService:
    return TaskService(TaskStore())


class TestAddTask:
    def test_add_task_returns_task_with_auto_id(self):
        service = _make_service()
        task = service.add_task("Buy groceries", "Milk, eggs")
        assert task.id == 1
        assert task.title == "Buy groceries"

    def test_add_task_empty_description_defaults(self):
        service = _make_service()
        task = service.add_task("Test task")
        assert task.description == ""

    def test_add_task_empty_title_raises_value_error(self):
        service = _make_service()
        with pytest.raises(ValueError):
            service.add_task("")

    def test_add_task_whitespace_only_title_raises_value_error(self):
        service = _make_service()
        with pytest.raises(ValueError):
            service.add_task("   ")

    def test_add_task_strips_whitespace_from_title(self):
        service = _make_service()
        task = service.add_task("  Buy groceries  ", "")
        assert task.title == "Buy groceries"

    def test_sequential_adds_produce_incrementing_ids(self):
        service = _make_service()
        t1 = service.add_task("Task 1")
        t2 = service.add_task("Task 2")
        assert t1.id == 1
        assert t2.id == 2


class TestGetAllTasks:
    def test_returns_empty_list_when_no_tasks(self):
        assert _make_service().get_all_tasks() == []

    def test_returns_all_tasks_after_adding(self):
        service = _make_service()
        service.add_task("Task 1")
        service.add_task("Task 2")
        assert len(service.get_all_tasks()) == 2


class TestToggleComplete:
    def test_toggles_incomplete_to_complete(self):
        service = _make_service()
        service.add_task("Task")
        result = service.toggle_complete(1)
        assert result.completed is True

    def test_toggles_complete_back_to_incomplete(self):
        service = _make_service()
        service.add_task("Task")
        service.toggle_complete(1)
        result = service.toggle_complete(1)
        assert result.completed is False

    def test_returns_none_for_nonexistent_id(self):
        assert _make_service().toggle_complete(99) is None


class TestUpdateTask:
    def test_updates_both_title_and_description(self):
        service = _make_service()
        service.add_task("Old", "Old Desc")
        result = service.update_task(1, "New", "New Desc")
        assert result.title == "New"
        assert result.description == "New Desc"

    def test_empty_title_keeps_existing(self):
        service = _make_service()
        service.add_task("Keep This", "Desc")
        result = service.update_task(1, "", "New Desc")
        assert result.title == "Keep This"

    def test_empty_description_keeps_existing(self):
        service = _make_service()
        service.add_task("Title", "Keep This Desc")
        result = service.update_task(1, "New Title", "")
        assert result.description == "Keep This Desc"

    def test_preserves_completed_status(self):
        service = _make_service()
        service.add_task("Task")
        service.toggle_complete(1)
        result = service.update_task(1, "Updated")
        assert result.completed is True

    def test_returns_none_for_nonexistent_id(self):
        assert _make_service().update_task(99, "Title") is None

    def test_whitespace_only_title_keeps_existing(self):
        service = _make_service()
        service.add_task("Keep This", "Desc")
        result = service.update_task(1, "   ", "")
        assert result.title == "Keep This"


class TestDeleteTask:
    def test_deletes_existing_task(self):
        service = _make_service()
        service.add_task("Task")
        assert service.delete_task(1) is True

    def test_returns_false_for_nonexistent_id(self):
        assert _make_service().delete_task(99) is False

    def test_deleted_task_not_in_get_all(self):
        service = _make_service()
        service.add_task("Task 1")
        service.add_task("Task 2")
        service.delete_task(1)
        tasks = service.get_all_tasks()
        assert len(tasks) == 1
        assert tasks[0].id == 2
```

## File 4: test_cli_handlers.py (27 tests)

### Key Pattern: monkeypatch for sequential inputs

```python
# Single input
monkeypatch.setattr("builtins.input", lambda _="": "1")

# Multiple sequential inputs
inputs = iter(["Buy groceries", "Milk, eggs"])
monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
```

### Key Pattern: capsys for output assertions

```python
cli.handle_view()
output = capsys.readouterr().out
assert "No tasks found" in output
```

### Key Pattern: Clear output between operations

```python
cli.handle_add()
capsys.readouterr()  # Clear add output
cli.handle_view()
output = capsys.readouterr().out  # Only view output
```

### Full test file structure:

```python
"""Tests for CLIHandler presentation layer."""

from src.models.task import TaskStore
from src.services.task_service import TaskService
from src.cli.handlers import CLIHandler


def _make_cli() -> CLIHandler:
    store = TaskStore()
    service = TaskService(store)
    return CLIHandler(service)


class TestDisplayMenu:
    def test_displays_all_six_options(self, capsys):
        cli = _make_cli()
        cli.display_menu()
        output = capsys.readouterr().out
        assert "1. Add Task" in output
        assert "6. Exit" in output


class TestMenuRun:
    def test_exit_on_choice_6(self, monkeypatch, capsys):
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "6")
        cli.run()
        output = capsys.readouterr().out
        assert "goodbye" in output.lower() or "bye" in output.lower()

    def test_invalid_choice_shows_error(self, monkeypatch, capsys):
        inputs = iter(["7", "6"])
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.run()
        assert "Invalid choice" in capsys.readouterr().out

    def test_non_numeric_choice_shows_error(self, monkeypatch, capsys):
        inputs = iter(["abc", "6"])
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.run()
        assert "Invalid choice" in capsys.readouterr().out

    def test_empty_choice_shows_error(self, monkeypatch, capsys):
        inputs = iter(["", "6"])
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.run()
        assert "Invalid choice" in capsys.readouterr().out


# TestHandleAdd (4 tests): title+desc, empty desc, empty title error, whitespace title error
# TestHandleView (4 tests): empty list, incomplete [_], complete [X], shows id+title+desc
# TestHandleMarkComplete (4 tests): toggle to complete, toggle back, nonexistent, non-numeric
# TestHandleUpdate (5 tests): update both, empty keeps existing, nonexistent, non-numeric, shows current
# TestHandleDelete (5 tests): confirm y, cancel n, case-insensitive Y, nonexistent, non-numeric
```

## Coverage Target

Run: `uv run pytest --cov=src --cov-report=term-missing`

Expected: **90%+ coverage** (actual: 91% with this test suite)

Only uncovered lines should be the `if __name__ == "__main__"` guard in `main.py`.
