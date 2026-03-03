# [Task]: T004-T010 / T005 [From]: specs/phase2-web/rest-api/spec.md + authentication/spec.md
# FastAPI route handlers for Task CRUD operations with JWT auth enforcement.
# Spec: rest-api FR-001 to FR-010 | auth FR-001 to FR-004
# Phase 5: Search/filter/sort, new fields, recurring auto-creation, Kafka events §FR-001–FR-009

import asyncio
import calendar
import json
from datetime import date as date_type, timedelta
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import case, or_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from db import get_session
from middleware.auth import verify_user_access
from sidecar.pubsub import _publish_sync, build_task_event
from sidecar.state import get_cached_tasks_sync, invalidate_cache_sync, set_cached_tasks_sync
from models import Task
from schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(tags=["tasks"])

# Priority sort ordering: high=1, medium=2, low=3, null=4
_PRIORITY_ORDER = case(
    (Task.priority == "high", 1),
    (Task.priority == "medium", 2),
    (Task.priority == "low", 3),
    else_=4,
)


@router.get("/{user_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    user_id: str,
    background_tasks: BackgroundTasks,
    search: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    completed: Optional[bool] = None,
    tags: Optional[str] = None,
    due_date_from: Optional[date_type] = None,
    due_date_to: Optional[date_type] = None,
    sort: Optional[str] = None,
    order: Optional[str] = "asc",
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> list[TaskRead]:
    """List all tasks for the authenticated user with optional search/filter/sort."""
    # US3: Cache hit — return immediately without DB query (filters bypass cache)
    if not any([search, priority, category, completed is not None, tags,
                due_date_from, due_date_to, sort]):
        cached = await asyncio.to_thread(get_cached_tasks_sync, user_id)
        if cached is not None:
            return [TaskRead.model_validate(t) for t in cached]

    query = select(Task).where(Task.user_id == user_id)

    # Search: ILIKE on title + description
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(Task.title.ilike(pattern), Task.description.ilike(pattern))  # type: ignore[union-attr]
        )

    # Filters
    if priority is not None:
        query = query.where(Task.priority == priority)
    if category is not None:
        query = query.where(Task.category == category)
    if completed is not None:
        query = query.where(Task.completed == completed)
    if tags is not None:
        query = query.where(Task.tags.ilike(f'%"{tags}"%'))  # type: ignore[union-attr]
    if due_date_from is not None:
        query = query.where(Task.due_date >= due_date_from)
    if due_date_to is not None:
        query = query.where(Task.due_date <= due_date_to)

    # Sort
    if sort == "priority":
        order_expr = _PRIORITY_ORDER.asc() if order == "asc" else _PRIORITY_ORDER.desc()
        query = query.order_by(order_expr)
    elif sort == "due_date":
        col = Task.due_date.asc() if order == "asc" else Task.due_date.desc()  # type: ignore[union-attr]
        query = query.order_by(col)
    elif sort == "title":
        col = Task.title.asc() if order == "asc" else Task.title.desc()  # type: ignore[union-attr]
        query = query.order_by(col)
    elif sort == "created_at":
        col = Task.created_at.asc() if order == "asc" else Task.created_at.desc()  # type: ignore[union-attr]
        query = query.order_by(col)
    else:
        # Default: newest first
        query = query.order_by(Task.created_at.desc())  # type: ignore[union-attr]

    result = await session.exec(query)
    tasks = result.all()
    validated = [TaskRead.model_validate(t) for t in tasks]
    # US3: Cache miss — populate cache (unfiltered queries only)
    if not any([search, priority, category, completed is not None, tags,
                due_date_from, due_date_to, sort]):
        background_tasks.add_task(
            set_cached_tasks_sync, user_id,
            [t.model_dump(mode="json") for t in validated],
        )
    return validated


@router.post(
    "/{user_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    user_id: str,
    data: TaskCreate,
    background_tasks: BackgroundTasks,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Create a new task for the authenticated user. Returns 201."""
    task = Task(
        user_id=user_id,
        title=data.title.strip(),
        description=data.description,
        priority=data.priority,
        category=data.category,
        tags=json.dumps(data.tags) if data.tags else None,
        due_date=data.due_date,
        due_time=data.due_time,
        recurring=data.recurring,
        reminder=data.reminder,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    result = TaskRead.model_validate(task)
    background_tasks.add_task(invalidate_cache_sync, user_id)
    event = build_task_event("task.created", task)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", event, user_id)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-updates", event, user_id)
    return result


@router.get("/{user_id}/tasks/{task_id}", response_model=TaskRead)
async def get_task(
    user_id: str,
    task_id: int,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Get a single task. Returns 404 if not found or wrong user."""
    task = await _get_user_task(session, user_id, task_id)
    return TaskRead.model_validate(task)


@router.put("/{user_id}/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    user_id: str,
    task_id: int,
    data: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Update a task's fields. None fields keep existing values."""
    task = await _get_user_task(session, user_id, task_id)
    changed_fields = list(data.model_fields_set)

    if data.title is not None:
        task.title = data.title.strip()
    if data.description is not None:
        task.description = data.description
    if data.completed is not None:
        task.completed = data.completed
    if data.priority is not None:
        task.priority = data.priority
    if data.category is not None:
        task.category = data.category
    if data.tags is not None:
        task.tags = json.dumps(data.tags) if data.tags else None
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.due_time is not None:
        task.due_time = data.due_time
    if data.recurring is not None:
        task.recurring = data.recurring
    if data.reminder is not None:
        task.reminder = data.reminder

    session.add(task)
    await session.commit()
    await session.refresh(task)
    result = TaskRead.model_validate(task)
    background_tasks.add_task(invalidate_cache_sync, user_id)
    event = build_task_event("task.updated", task, changed_fields)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", event, user_id)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-updates", event, user_id)
    return result


@router.delete(
    "/{user_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_task(
    user_id: str,
    task_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Delete a task. Returns 204 with no body."""
    task = await _get_user_task(session, user_id, task_id)
    event = build_task_event("task.deleted", task)
    background_tasks.add_task(invalidate_cache_sync, user_id)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", event, user_id)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-updates", event, user_id)
    await session.delete(task)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{user_id}/tasks/{task_id}/complete",
    response_model=TaskRead,
)
async def toggle_complete(
    user_id: str,
    task_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Toggle task completion status. Auto-creates next occurrence for recurring tasks."""
    task = await _get_user_task(session, user_id, task_id)
    task.completed = not task.completed

    # FR-005: Recurring auto-creation when completing a recurring task with a due_date
    if task.completed and task.recurring and task.due_date:
        next_date = _next_recurring_date(task.due_date, task.recurring)
        next_task = Task(
            user_id=user_id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            category=task.category,
            tags=task.tags,
            due_date=next_date,
            due_time=task.due_time,
            recurring=task.recurring,
            reminder=task.reminder,
        )
        session.add(next_task)

    session.add(task)
    await session.commit()
    await session.refresh(task)
    result = TaskRead.model_validate(task)
    background_tasks.add_task(invalidate_cache_sync, user_id)
    event_type = "task.completed" if task.completed else "task.reopened"
    event = build_task_event(event_type, task)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", event, user_id)
    background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-updates", event, user_id)
    return result


def _next_recurring_date(current: date_type, recurring: str) -> date_type:
    """Compute the next occurrence date for a recurring task."""
    if recurring == "daily":
        return current + timedelta(days=1)
    elif recurring == "weekly":
        return current + timedelta(weeks=1)
    elif recurring == "monthly":
        year = current.year + (current.month // 12)
        month = (current.month % 12) + 1
        max_day = calendar.monthrange(year, month)[1]
        day = min(current.day, max_day)
        return date_type(year, month, day)
    return current + timedelta(days=1)


async def _get_user_task(
    session: AsyncSession,
    user_id: str,
    task_id: int,
) -> Task:
    """Helper: fetch task owned by user_id, raise 404 if not found or wrong user."""
    result = await session.exec(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task
