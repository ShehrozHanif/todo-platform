# Error Handling Reference

## HTTP Status Code Taxonomy

| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Business logic validation failure (empty title, etc.) |
| 404 | Not Found | Resource doesn't exist or doesn't belong to user |
| 422 | Unprocessable Entity | Pydantic schema validation failure (auto by FastAPI) |
| 500 | Internal Server Error | Unexpected server errors (auto by FastAPI) |

## HTTPException Pattern

```python
from fastapi import HTTPException, status

# 404 — Resource not found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Task not found",
)

# 400 — Business validation
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Title cannot be empty",
)
```

## Error Response Format

FastAPI auto-formats HTTPException as JSON:
```json
{
    "detail": "Task not found"
}
```

Pydantic validation errors (422) auto-format as:
```json
{
    "detail": [
        {
            "type": "string_too_long",
            "loc": ["body", "title"],
            "msg": "String should have at most 200 characters",
            "input": "...",
            "ctx": {"max_length": 200}
        }
    ]
}
```

## Task Ownership Enforcement

Every query MUST filter by `user_id` to prevent data leaking:

```python
# CORRECT: Filter by user_id AND task_id
stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)

# WRONG: Only filter by task_id (user can access other users' tasks!)
stmt = select(Task).where(Task.id == task_id)
```

If a task exists but belongs to a different user, return 404 (not 403) — don't reveal existence.

## DELETE Response

DELETE returns 204 with NO body. Use `Response` class:

```python
from fastapi import Response

@router.delete("/{user_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(...):
    ...
    await session.delete(task)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

Or simply rely on the `status_code` parameter with no return.

## Update Semantics

For PUT/update — empty or None fields keep existing values:

```python
if data.title is not None and data.title.strip():
    task.title = data.title.strip()
if data.description is not None:
    task.description = data.description
```

This matches Phase 1's update semantics: "empty string = keep existing."

## Anti-Patterns

| Anti-Pattern | Correct Pattern |
|-------------|-----------------|
| Catching `Exception` broadly | Let FastAPI handle 500s; catch specific errors |
| Returning 200 for creation | Use 201 Created |
| Returning body for DELETE | Use 204 No Content |
| Missing user_id filter | Always filter by user_id in WHERE clause |
| Exposing internal errors | Return generic message; log details server-side |
| Using `session.query()` (sync) | Use `select()` + `session.execute()` (async) |
