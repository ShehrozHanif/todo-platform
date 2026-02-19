# [Task]: T007 [From]: specs/phase2-web/database-schema/spec.md §FR-011 / FR-004
# Request/response Pydantic schemas with validation rules.
# Validation lives here (not in SQLModel table models).
# These schemas are consumed by the REST API layer (Feature 2).

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class TaskCreate(BaseModel):
    """Schema for creating a new task. FR-011: validates title length and non-empty."""

    title: str
    description: Optional[str] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """FR-011: title must be non-empty and ≤200 characters."""
        if not v or not v.strip():
            raise ValueError("title cannot be empty")
        if len(v) > 200:
            raise ValueError("title cannot exceed 200 characters")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """FR-004: description must be ≤1000 characters when provided."""
        if v is not None and len(v) > 1000:
            raise ValueError("description cannot exceed 1000 characters")
        return v


class TaskUpdate(BaseModel):
    """Schema for partial updates. All fields optional; present fields are validated."""

    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("title cannot be empty")
            if len(v) > 200:
                raise ValueError("title cannot exceed 200 characters")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 1000:
            raise ValueError("description cannot exceed 1000 characters")
        return v


class TaskRead(BaseModel):
    """Response schema for reading a task (includes timestamps)."""

    id: int
    user_id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
