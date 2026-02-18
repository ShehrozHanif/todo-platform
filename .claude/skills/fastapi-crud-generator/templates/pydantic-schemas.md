# Pydantic Schemas Template

## backend/schemas/task.py

```python
# [Task]: T00X [From]: specs/phase2-web/rest-api/plan.md §Schemas
"""Pydantic request/response schemas for Task API.

These are NOT SQLModel table models — they define the API contract.
"""

from datetime import datetime

from pydantic import BaseModel, Field, model_config


class TaskCreate(BaseModel):
    """Request schema for creating a new task."""

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)


class TaskUpdate(BaseModel):
    """Request schema for updating a task. All fields optional."""

    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1000)


class TaskResponse(BaseModel):
    """Response schema for a task."""

    model_config = model_config.copy() if hasattr(model_config, "copy") else {}
    model_config["from_attributes"] = True

    id: int
    user_id: str
    title: str
    description: str | None
    completed: bool
    created_at: datetime | None
    updated_at: datetime | None
```

## Simplified TaskResponse (alternative)

```python
class TaskResponse(BaseModel):
    """Response schema for a task."""

    model_config = {"from_attributes": True}

    id: int
    user_id: str
    title: str
    description: str | None = None
    completed: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
```

## Key Points

- `TaskCreate` — validates on POST. `min_length=1` prevents empty titles at schema level.
- `TaskUpdate` — all fields `None` by default. Only non-None fields update the task.
- `TaskResponse` — `from_attributes = True` allows `TaskResponse.model_validate(sqlmodel_instance)`.
- Schemas are plain `BaseModel` (NOT `SQLModel`) — clean separation of API contract from DB model.
- FastAPI auto-generates 422 errors when Pydantic validation fails.

## backend/schemas/__init__.py

```python
from backend.schemas.task import TaskCreate, TaskResponse, TaskUpdate

__all__ = ["TaskCreate", "TaskResponse", "TaskUpdate"]
```
