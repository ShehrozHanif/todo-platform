# Feature Specification: Task CRUD CLI

**Feature Branch**: `phase1/task-crud`
**Created**: 2026-02-18
**Status**: Approved
**Phase**: Phase I — In-Memory Python Console App

## User Scenarios & Testing

### User Story 1 - Add Task (Priority: P1)

User can create a new todo item with a title and optional description.

**Why this priority**: Core operation — nothing else works without task creation.

**Independent Test**: Run app, select "Add Task", enter title/description, verify confirmation message with auto-assigned ID.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** user selects "Add Task" and enters title "Buy groceries" with description "Milk, eggs", **Then** a task is created with auto-incremented ID and confirmation "Task added successfully! ID: 1" is displayed.
2. **Given** the app is running, **When** user enters an empty title, **Then** error message "Title cannot be empty." is displayed and no task is created.
3. **Given** the app is running, **When** user enters whitespace-only title, **Then** error message is displayed and no task is created.

---

### User Story 2 - View Task List (Priority: P1)

User can see all tasks with their status, ID, title, and description.

**Why this priority**: Users need to see tasks to interact with them.

**Independent Test**: Add tasks, select "View Tasks", verify all tasks shown with status indicators.

**Acceptance Scenarios**:

1. **Given** tasks exist, **When** user selects "View Tasks", **Then** all tasks display as `[ ] ID: 1 | Title — Description` (incomplete) or `[X] ID: 1 | Title — Description` (complete).
2. **Given** no tasks exist, **When** user selects "View Tasks", **Then** "No tasks found. Add a task to get started!" is displayed.

---

### User Story 3 - Update Task (Priority: P2)

User can modify the title and/or description of an existing task.

**Why this priority**: Correction capability — needed for usability.

**Independent Test**: Add a task, select "Update Task", enter new values, verify changes.

**Acceptance Scenarios**:

1. **Given** task ID 1 exists, **When** user updates with new title and description, **Then** both fields are updated and "Task updated successfully!" is displayed.
2. **Given** task ID 1 exists, **When** user presses Enter (empty input) for title/description, **Then** existing values are preserved.
3. **Given** task ID 99 does not exist, **When** user enters ID 99, **Then** "Task with ID 99 not found." is displayed.

---

### User Story 4 - Delete Task (Priority: P2)

User can remove a task with confirmation prompt.

**Why this priority**: Cleanup capability with safety guard.

**Acceptance Scenarios**:

1. **Given** task ID 1 exists, **When** user enters ID 1 and confirms "y", **Then** task is deleted and "Task deleted successfully!" is displayed.
2. **Given** task ID 1 exists, **When** user enters ID 1 and types "n", **Then** "Deletion cancelled." is displayed and task remains.
3. **Given** task ID 99 does not exist, **When** user enters ID 99, **Then** "Task with ID 99 not found." is displayed.

---

### User Story 5 - Mark Complete/Incomplete (Priority: P2)

User can toggle a task's completion status.

**Acceptance Scenarios**:

1. **Given** task ID 1 is incomplete, **When** user toggles it, **Then** "Task 1 marked as complete." is displayed.
2. **Given** task ID 1 is complete, **When** user toggles it, **Then** "Task 1 marked as incomplete." is displayed.
3. **Given** task ID 99 does not exist, **When** user enters 99, **Then** "Task with ID 99 not found." is displayed.

### Edge Cases

- Non-numeric input for task ID: display "Please enter a valid number."
- Invalid menu choice (e.g., "7", "abc", ""): display "Invalid choice. Please try again."
- IDs are never reused after deletion (auto-increment only goes up).
- `get_all()` returns a copy — mutating the returned list does not affect internal state.

## Requirements

### Functional Requirements

- **FR-001**: System MUST support adding tasks with title (required) and description (optional).
- **FR-002**: System MUST auto-assign unique, incrementing integer IDs starting at 1.
- **FR-003**: System MUST validate that task title is non-empty after whitespace stripping.
- **FR-004**: System MUST display all tasks with status indicators (`[ ]` / `[X]`).
- **FR-005**: System MUST support updating task title and/or description (empty input = keep existing).
- **FR-006**: System MUST support deleting tasks with y/n confirmation prompt.
- **FR-007**: System MUST support toggling task completion status.
- **FR-008**: System MUST store all data in-memory (no persistence across restarts).
- **FR-009**: System MUST use 3-layer clean architecture (models → services → CLI).

### Key Entities

- **Task**: id (int, auto-increment), title (str), description (str, default ""), completed (bool, default False)
- **TaskStore**: In-memory list storage with add/get_by_id/get_all/update/delete operations

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 5 CRUD operations work correctly via CLI menu
- **SC-002**: 70+ tests pass across 4 test files
- **SC-003**: 90%+ code coverage measured by pytest-cov
- **SC-004**: Strict one-way dependency: main → CLI → Service → Store → Task
- **SC-005**: Zero I/O calls outside cli/handlers.py (all print/input isolated)
