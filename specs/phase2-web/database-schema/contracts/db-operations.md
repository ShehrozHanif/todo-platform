# Database Operations Contract

**Feature**: database-schema | **Date**: 2026-02-19

This feature defines the **data layer only** — no REST API endpoints. The contracts below define the database operations that the API layer (Feature 2) will consume.

## Operations

### Create Task

- **Input**: user_id (str), title (str), description (str | None)
- **Output**: Task record with auto-generated id, timestamps, completed=false
- **Errors**: FK violation if user_id doesn't exist, validation error if title empty/too long
- **Side effects**: created_at and updated_at set to current time

### Read Tasks by User

- **Input**: user_id (str)
- **Output**: List of Task records belonging to that user (may be empty)
- **Errors**: None (empty list is valid)
- **Isolation**: MUST only return tasks where task.user_id == input user_id

### Read Single Task

- **Input**: task_id (int), user_id (str)
- **Output**: Single Task record or None
- **Errors**: None (None means not found or wrong user)

### Update Task

- **Input**: task_id (int), user_id (str), title (str | None), description (str | None)
- **Output**: Updated Task record with refreshed updated_at
- **Errors**: Not found if task doesn't exist or wrong user, validation error if title empty/too long
- **Side effects**: updated_at refreshed to current time

### Delete Task

- **Input**: task_id (int), user_id (str)
- **Output**: None (void)
- **Errors**: Not found if task doesn't exist or wrong user
- **Side effects**: Task permanently removed

### Toggle Complete

- **Input**: task_id (int), user_id (str)
- **Output**: Updated Task record with toggled completed field
- **Errors**: Not found if task doesn't exist or wrong user
- **Side effects**: completed flipped, updated_at refreshed

## Session Contract

### get_session

- **Type**: Async generator yielding AsyncSession
- **Lifecycle**: Session created at start, committed/rolled-back at end
- **Usage**: FastAPI `Depends(get_session)` dependency injection
- **Cleanup**: Automatic via async context manager

### lifespan

- **Purpose**: Create all tables at app startup, dispose engine at shutdown
- **Runs**: Once per app lifecycle (startup/shutdown)
- **Method**: `SQLModel.metadata.create_all` via `run_sync`
