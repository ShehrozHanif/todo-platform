# [Task]: T012 [From]: specs/phase1-cli/task-crud/spec.md §US1-US5, §Edge Cases
"""Tests for CLIHandler presentation layer."""

from src.models.task import TaskStore
from src.services.task_service import TaskService
from src.cli.handlers import CLIHandler


def _make_cli() -> CLIHandler:
    store = TaskStore()
    service = TaskService(store)
    return CLIHandler(service)


class TestDisplayMenu:
    def test_displays_all_six_options(self, capsys) -> None:
        cli = _make_cli()
        cli.display_menu()
        output = capsys.readouterr().out
        assert "1. Add Task" in output
        assert "2. View Tasks" in output
        assert "3. Update Task" in output
        assert "4. Delete Task" in output
        assert "5. Mark Complete" in output
        assert "6. Exit" in output


class TestMenuRun:
    def test_exit_on_choice_6(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "6")
        cli.run()
        output = capsys.readouterr().out
        assert "Goodbye" in output

    def test_invalid_choice_shows_error(self, monkeypatch, capsys) -> None:
        inputs = iter(["7", "6"])
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.run()
        assert "Invalid choice" in capsys.readouterr().out

    def test_non_numeric_choice_shows_error(self, monkeypatch, capsys) -> None:
        inputs = iter(["abc", "6"])
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.run()
        assert "Invalid choice" in capsys.readouterr().out

    def test_empty_choice_shows_error(self, monkeypatch, capsys) -> None:
        inputs = iter(["", "6"])
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.run()
        assert "Invalid choice" in capsys.readouterr().out


class TestHandleAdd:
    def test_add_task_with_title_and_description(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Buy groceries", "Milk, eggs"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        output = capsys.readouterr().out
        assert "Task added successfully!" in output
        assert "ID: 1" in output

    def test_add_task_with_empty_description(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Buy groceries", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        output = capsys.readouterr().out
        assert "Task added successfully!" in output

    def test_add_task_empty_title_shows_error(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        output = capsys.readouterr().out
        assert "Title cannot be empty" in output

    def test_add_task_whitespace_title_shows_error(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["   ", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        output = capsys.readouterr().out
        assert "Title cannot be empty" in output


class TestHandleView:
    def test_view_empty_list(self, capsys) -> None:
        cli = _make_cli()
        cli.handle_view()
        output = capsys.readouterr().out
        assert "No tasks found" in output

    def test_view_incomplete_task(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Buy groceries", "Milk"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()  # Clear add output
        cli.handle_view()
        output = capsys.readouterr().out
        assert "[ ]" in output
        assert "Buy groceries" in output

    def test_view_complete_task(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        # Add task
        inputs = iter(["Task 1", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        # Toggle complete
        monkeypatch.setattr("builtins.input", lambda _="": "1")
        cli.handle_mark_complete()
        capsys.readouterr()
        # View
        cli.handle_view()
        output = capsys.readouterr().out
        assert "[X]" in output

    def test_view_shows_id_title_description(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Buy groceries", "Milk, eggs"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        cli.handle_view()
        output = capsys.readouterr().out
        assert "ID: 1" in output
        assert "Buy groceries" in output
        assert "Milk, eggs" in output


class TestHandleMarkComplete:
    def test_toggle_to_complete(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Task 1", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        monkeypatch.setattr("builtins.input", lambda _="": "1")
        cli.handle_mark_complete()
        output = capsys.readouterr().out
        assert "marked as complete" in output

    def test_toggle_back_to_incomplete(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Task 1", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        monkeypatch.setattr("builtins.input", lambda _="": "1")
        cli.handle_mark_complete()
        capsys.readouterr()
        monkeypatch.setattr("builtins.input", lambda _="": "1")
        cli.handle_mark_complete()
        output = capsys.readouterr().out
        assert "marked as incomplete" in output

    def test_nonexistent_id(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "99")
        cli.handle_mark_complete()
        output = capsys.readouterr().out
        assert "not found" in output

    def test_non_numeric_input(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "abc")
        cli.handle_mark_complete()
        output = capsys.readouterr().out
        assert "valid number" in output


class TestHandleUpdate:
    def test_update_both_fields(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Old Title", "Old Desc"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        inputs = iter(["1", "New Title", "New Desc"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_update()
        output = capsys.readouterr().out
        assert "updated successfully" in output

    def test_update_empty_keeps_existing(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Keep Title", "Keep Desc"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        inputs = iter(["1", "", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_update()
        output = capsys.readouterr().out
        assert "updated successfully" in output

    def test_update_nonexistent_id(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "99")
        cli.handle_update()
        output = capsys.readouterr().out
        assert "not found" in output

    def test_update_non_numeric_input(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "abc")
        cli.handle_update()
        output = capsys.readouterr().out
        assert "valid number" in output

    def test_update_shows_current_values(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["My Title", "My Desc"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        inputs = iter(["1", "", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_update()
        output = capsys.readouterr().out
        assert "My Title" in output
        assert "My Desc" in output


class TestHandleDelete:
    def test_delete_confirmed(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Task to delete", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        inputs = iter(["1", "y"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_delete()
        output = capsys.readouterr().out
        assert "deleted successfully" in output

    def test_delete_cancelled(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Task to keep", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        inputs = iter(["1", "n"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_delete()
        output = capsys.readouterr().out
        assert "cancelled" in output

    def test_delete_case_insensitive_yes(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        inputs = iter(["Task", ""])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_add()
        capsys.readouterr()
        inputs = iter(["1", "Y"])
        monkeypatch.setattr("builtins.input", lambda _="": next(inputs))
        cli.handle_delete()
        output = capsys.readouterr().out
        assert "deleted successfully" in output

    def test_delete_nonexistent_id(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "99")
        cli.handle_delete()
        output = capsys.readouterr().out
        assert "not found" in output

    def test_delete_non_numeric_input(self, monkeypatch, capsys) -> None:
        cli = _make_cli()
        monkeypatch.setattr("builtins.input", lambda _="": "abc")
        cli.handle_delete()
        output = capsys.readouterr().out
        assert "valid number" in output
