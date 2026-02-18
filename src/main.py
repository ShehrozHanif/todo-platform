# [Task]: T015 [From]: specs/phase1-cli/task-crud/plan.md §Entry Point
"""Todo CLI application entry point.

Creates the dependency chain: TaskStore → TaskService → CLIHandler
and starts the interactive menu loop.
"""

from src.models.task import TaskStore
from src.services.task_service import TaskService
from src.cli.handlers import CLIHandler


def main() -> None:
    """Bootstrap and run the Todo CLI application."""
    store = TaskStore()
    service = TaskService(store)
    cli = CLIHandler(service)
    cli.run()


if __name__ == "__main__":
    main()
