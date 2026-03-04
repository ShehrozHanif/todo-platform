# [Task]: T007 [From]: specs/phase2-web/database-schema/spec.md §FR-011 / FR-004
# Request/response Pydantic schemas with validation rules.
# Validation lives here (not in SQLModel table models).
# These schemas are consumed by the REST API layer (Feature 2).
# Phase 5: Extended with priority, category, tags, due_date, due_time, recurring, reminder.

import json
import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator


_VALID_PRIORITIES = {"high", "medium", "low"}
_VALID_RECURRING = {"daily", "weekly", "monthly"}
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


class TaskCreate(BaseModel):
    """Schema for creating a new task. FR-011: validates title length and non-empty."""

    title: str
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: Optional[bool] = None

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

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(sorted(_VALID_PRIORITIES))}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 50:
            raise ValueError("category cannot exceed 50 characters")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            if len(v) > 5:
                raise ValueError("maximum 5 tags allowed")
            for tag in v:
                if len(tag) > 30:
                    raise ValueError("each tag cannot exceed 30 characters")
        return v

    @field_validator("due_time")
    @classmethod
    def validate_due_time(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("due_time must be in HH:MM format")
        return v

    @field_validator("recurring")
    @classmethod
    def validate_recurring(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_RECURRING:
            raise ValueError(f"recurring must be one of: {', '.join(sorted(_VALID_RECURRING))}")
        return v


class TaskUpdate(BaseModel):
    """Schema for partial updates. All fields optional; present fields are validated."""

    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: Optional[bool] = None

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

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_PRIORITIES:
            raise ValueError(f"priority must be one of: {', '.join(sorted(_VALID_PRIORITIES))}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 50:
            raise ValueError("category cannot exceed 50 characters")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        if v is not None:
            if len(v) > 5:
                raise ValueError("maximum 5 tags allowed")
            for tag in v:
                if len(tag) > 30:
                    raise ValueError("each tag cannot exceed 30 characters")
        return v

    @field_validator("due_time")
    @classmethod
    def validate_due_time(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _TIME_RE.match(v):
            raise ValueError("due_time must be in HH:MM format")
        return v

    @field_validator("recurring")
    @classmethod
    def validate_recurring(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_RECURRING:
            raise ValueError(f"recurring must be one of: {', '.join(sorted(_VALID_RECURRING))}")
        return v


class TaskRead(BaseModel):
    """Response schema for reading a task (includes timestamps)."""

    id: int
    user_id: str
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        """Deserialize JSON string from DB into a list."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v
