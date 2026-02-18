# SQLModel Models Template

## backend/models.py

```python
# [Task]: T00X [From]: specs/phase2-web/database-schema/plan.md §Models
"""SQLModel table models for the Todo platform.

Defines Task and User models with Neon PostgreSQL as the backing store.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """User model — managed by Better Auth.

    Better Auth creates and manages user records. This model mirrors
    the schema so SQLModel can reference it for foreign keys and queries.
    """

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str = Field(default="")
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )


class Task(SQLModel, table=True):
    """Task model — core todo item owned by a user."""

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    title: str = Field(max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    completed: bool = Field(default=False, index=True)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now()),
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )
```

## Key Points

- `User.id` is `str` — Better Auth generates string UUIDs
- `Task.id` is `int | None` with `primary_key=True` — auto-increment
- `Task.user_id` references `user.id` via foreign key
- Timestamps use `sa_column` with `func.now()` for server-side defaults
- `updated_at` includes `onupdate=func.now()` for auto-update on changes
- Indexes on `user_id` (filter by user) and `completed` (filter by status)
- No Pydantic validators on table models — validation happens in API schemas
