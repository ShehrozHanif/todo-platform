# [Task]: T013 [From]: specs/phase1-cli/task-crud/spec.md §FR-004, §FR-005, §FR-006, §FR-007
"""Presentation layer for the Todo CLI application.

Handles menu display, user input collection, and output formatting.
All input() and print() calls are contained in this module.
"""

from src.services.task_service import TaskService


class CLIHandler:
    """Command-line interface handler for the Todo app."""

    def __init__(self, service: TaskService) -> None:
        self._service = service

    def display_menu(self) -> None:
        """Display the main menu with numbered options."""
        print("\n=== Todo App ===")
        print("1. Add Task")
        print("2. View Tasks")
        print("3. Update Task")
        print("4. Delete Task")
        print("5. Mark Complete")
        print("6. Exit")

    def run(self) -> None:
        """Main menu loop. Runs until the user selects Exit."""
        while True:
            self.display_menu()
            choice = input("Choose an option: ")

            if choice == "1":
                self.handle_add()
            elif choice == "2":
                self.handle_view()
            elif choice == "3":
                self.handle_update()
            elif choice == "4":
                self.handle_delete()
            elif choice == "5":
                self.handle_mark_complete()
            elif choice == "6":
                print("Goodbye! Your tasks have been cleared.")
                break
            else:
                print("Invalid choice. Please try again.")

    def handle_add(self) -> None:
        """Handle the Add Task flow."""
        title = input("Enter task title: ")
        description = input("Enter task description (optional): ")
        try:
            task = self._service.add_task(title, description)
            print(f"Task added successfully! ID: {task.id}")
        except ValueError:
            print("Title cannot be empty.")

    def handle_view(self) -> None:
        """Handle the View Tasks flow."""
        tasks = self._service.get_all_tasks()
        if not tasks:
            print("No tasks found. Add a task to get started!")
            return
        print("\n--- Task List ---")
        for task in tasks:
            status = "[X]" if task.completed else "[ ]"
            print(f"{status} ID: {task.id} | {task.title} — {task.description}")

    def handle_update(self) -> None:
        """Handle the Update Task flow."""
        try:
            task_id = int(input("Enter task ID to update: "))
        except ValueError:
            print("Please enter a valid number.")
            return
        task = self._service.get_task(task_id)
        if task is None:
            print(f"Task with ID {task_id} not found.")
            return
        print(f"Current title: {task.title}")
        print(f"Current description: {task.description}")
        new_title = input("Enter new title (press Enter to keep current): ")
        new_description = input("Enter new description (press Enter to keep current): ")
        self._service.update_task(task_id, new_title, new_description)
        print("Task updated successfully!")

    def handle_delete(self) -> None:
        """Handle the Delete Task flow."""
        try:
            task_id = int(input("Enter task ID to delete: "))
        except ValueError:
            print("Please enter a valid number.")
            return
        task = self._service.get_task(task_id)
        if task is None:
            print(f"Task with ID {task_id} not found.")
            return
        print(f"Task to delete: {task.title} — {task.description}")
        confirm = input("Are you sure? (y/n): ").strip().lower()
        if confirm == "y":
            self._service.delete_task(task_id)
            print("Task deleted successfully!")
        else:
            print("Deletion cancelled.")

    def handle_mark_complete(self) -> None:
        """Handle the Mark Complete/Incomplete flow."""
        try:
            task_id = int(input("Enter task ID to toggle complete: "))
        except ValueError:
            print("Please enter a valid number.")
            return
        task = self._service.toggle_complete(task_id)
        if task is None:
            print(f"Task with ID {task_id} not found.")
            return
        status = "complete" if task.completed else "incomplete"
        print(f"Task {task_id} marked as {status}.")
