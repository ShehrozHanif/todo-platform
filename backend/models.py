# [Task]: T005-T007 [From]: specs/phase2-web/database-schema/spec.md §Key Entities
# SQLModel table definitions for User and Task entities.
# Spec: FR-002 to FR-014 | data-model.md
# Note: Input validation is enforced in schemas.py (TaskCreate / TaskUpdate).
#       SQLModel table models with table=True bypass Pydantic validators on construction.

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, func
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """
    Registered user account.
    Managed by Better Auth (Phase III) — schema defined here for FK relationship.
    FR-012: unique id, email, name, created_at.
    FR-013: email is UNIQUE at DB level.
    """

    __tablename__ = "user"

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, nullable=False, index=True)
    name: str = Field(nullable=False)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )


class Task(SQLModel, table=True):
    """
    A single to-do item owned by a User.
    FR-002: auto-generated integer PK.
    FR-003: every task linked to exactly one user via user_id FK.
    FR-004: title (req, max 200), description (opt, max 1000), completed (bool, default false).
    FR-005: created_at auto-set on creation.
    FR-006: updated_at auto-refreshed on update.
    FR-014: FK constraint prevents orphaned tasks; CASCADE delete on user removal.
    """

    __tablename__ = "task"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(
        nullable=False,
        index=True,
    )
    title: str = Field(max_length=200, nullable=False)
    description: Optional[str] = Field(default=None, max_length=1000)
    completed: bool = Field(default=False, nullable=False, index=True)
    created_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )
