# [Task]: T004-T010 / T005 [From]: specs/phase2-web/rest-api/spec.md + authentication/spec.md
# FastAPI route handlers for Task CRUD operations with JWT auth enforcement.
# Spec: rest-api FR-001 to FR-010 | auth FR-001 to FR-004

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from db import get_session
from middleware.auth import verify_user_access
from models import Task
from schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/{user_id}/tasks", response_model=list[TaskRead])
async def list_tasks(
    user_id: str,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> list[TaskRead]:
    """List all tasks for the authenticated user."""
    result = await session.exec(select(Task).where(Task.user_id == user_id))
    tasks = result.all()
    return [TaskRead.model_validate(t) for t in tasks]


@router.post(
    "/{user_id}/tasks",
    response_model=TaskRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    user_id: str,
    data: TaskCreate,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Create a new task for the authenticated user. Returns 201."""
    task = Task(
        user_id=user_id,
        title=data.title.strip(),
        description=data.description,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskRead.model_validate(task)


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
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Update a task's title and/or description. None fields keep existing values."""
    task = await _get_user_task(session, user_id, task_id)

    if data.title is not None:
        task.title = data.title.strip()
    if data.description is not None:
        task.description = data.description

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskRead.model_validate(task)


@router.delete(
    "/{user_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_task(
    user_id: str,
    task_id: int,
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Delete a task. Returns 204 with no body."""
    task = await _get_user_task(session, user_id, task_id)
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
    current_user: dict[str, Any] = Depends(verify_user_access),
    session: AsyncSession = Depends(get_session),
) -> TaskRead:
    """Toggle task completion status. Returns updated task."""
    task = await _get_user_task(session, user_id, task_id)
    task.completed = not task.completed
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskRead.model_validate(task)


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
