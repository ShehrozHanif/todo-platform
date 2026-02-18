# SQLModel Patterns Reference

## Table Model Declaration

SQLModel models that map to database tables use `table=True`:

```python
from sqlmodel import SQLModel, Field

class Task(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=200, nullable=False)
```

Without `table=True`, SQLModel classes act as pure Pydantic models (for request/response schemas).

## Field Types & Mapping

| Python Type | PostgreSQL Type | SQLModel Field |
|-------------|----------------|----------------|
| `int \| None` | `INTEGER` (auto-increment PK) | `Field(default=None, primary_key=True)` |
| `str` | `VARCHAR` | `Field(max_length=200)` |
| `str \| None` | `TEXT NULL` | `Field(default=None, max_length=1000)` |
| `bool` | `BOOLEAN` | `Field(default=False)` |
| `datetime` | `TIMESTAMP` | `Field(default=None, sa_column_kwargs=...)` |

## Primary Keys

```python
# Auto-increment integer PK
id: int | None = Field(default=None, primary_key=True)

# String PK (for external IDs like Better Auth user IDs)
id: str = Field(primary_key=True)
```

## Indexes

```python
# Single column index
user_id: str = Field(index=True, foreign_key="user.id")

# Boolean index for status filtering
completed: bool = Field(default=False, index=True)
```

## Server-Side Timestamps

Use SQLAlchemy `Column` + `func.now()` for DB-level timestamps:

```python
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, DateTime
from sqlalchemy.sql import func

class Task(SQLModel, table=True):
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    )
```

**Why server-side?** Ensures consistency across app instances. `datetime.now()` in Python is app-level and can drift.

## Foreign Keys

```python
# String FK referencing Better Auth user table
user_id: str = Field(foreign_key="user.id", index=True)
```

Note: The referenced table name in `foreign_key` is the **SQLModel class name in lowercase** (SQLModel convention). If the class is `User`, the table name is `user`.

## Table Naming

SQLModel auto-generates table names as lowercase class name. To override:

```python
class Task(SQLModel, table=True):
    __tablename__ = "tasks"  # explicit table name
```

## Relationships (SQLModel style)

For read-side relationships (not needed for writes):

```python
from sqlmodel import Relationship

class User(SQLModel, table=True):
    tasks: list["Task"] = Relationship(back_populates="owner")

class Task(SQLModel, table=True):
    user_id: str = Field(foreign_key="user.id")
    owner: User | None = Relationship(back_populates="tasks")
```

**For this project:** Relationships are optional — we query tasks by `user_id` filter, not via ORM relationship navigation. Keep models simple.

## Pydantic v2 Validators

```python
from pydantic import field_validator

class Task(SQLModel, table=True):
    title: str = Field(max_length=200)

    @field_validator("title")
    @classmethod
    def title_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()
```

**Note:** Validators in table models only run during Python-level construction, not at DB level. Use DB constraints for server-side enforcement.

## Model Configuration

```python
class Task(SQLModel, table=True):
    model_config = {"arbitrary_types_allowed": True}
```

Only needed if using non-standard types. Usually not required for basic models.
