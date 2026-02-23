# [Task]: T002 [From]: specs/phase3-chatbot/mcp-server/plan.md §Models
# SQLModel table definitions matching the Phase 2 backend schema.
# Read-only reference to existing tables — MCP server does NOT create tables.

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, func
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """User account (managed by Better Auth on frontend).
    Column names use camelCase to match Better Auth's schema."""

    __tablename__ = "user"

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, nullable=False, index=True)
    name: str = Field(nullable=False)
    createdAt: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            "createdAt",
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    updatedAt: Optional[datetime] = Field(
        default=None,
        sa_column=Column(
            "updatedAt",
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )


class Task(SQLModel, table=True):
    """A single to-do item owned by a User."""

    __tablename__ = "task"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(nullable=False, index=True)
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
