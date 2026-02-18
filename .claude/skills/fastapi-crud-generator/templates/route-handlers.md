# Route Handlers Template

## backend/routes/tasks.py

```python
# [Task]: T00X [From]: specs/phase2-web/rest-api/plan.md §Routes
"""FastAPI route handlers for Task CRUD operations.

All handlers are async, use dependency injection for DB sessions,
and enforce user isolation via user_id path parameter.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from backend.db import get_session
from backend.models import Task
from backend.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/{user_id}/tasks", response_model=list[TaskResponse])
async def list_tasks(
    user_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[TaskResponse]:
    """List all tasks for a user."""
    stmt = select(Task).where(Task.user_id == user_id)
    result = await session.execute(stmt)
    tasks = result.scalars().all()
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post(
    "/{user_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_task(
    user_id: str,
    data: TaskCreate,
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    """Create a new task for a user."""
    task = Task(
        user_id=user_id,
        title=data.title.strip(),
        description=data.description,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskResponse.model_validate(task)


@router.get("/{user_id}/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    user_id: str,
    task_id: int,
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    """Get a single task by ID for a user."""
    task = await _get_user_task(session, user_id, task_id)
    return TaskResponse.model_validate(task)


@router.put("/{user_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    user_id: str,
    task_id: int,
    data: TaskUpdate,
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    """Update a task's title and/or description."""
    task = await _get_user_task(session, user_id, task_id)

    if data.title is not None and data.title.strip():
        task.title = data.title.strip()
    if data.description is not None:
        task.description = data.description

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskResponse.model_validate(task)


@router.delete(
    "/{user_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_task(
    user_id: str,
    task_id: int,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Delete a task by ID for a user."""
    task = await _get_user_task(session, user_id, task_id)
    await session.delete(task)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{user_id}/tasks/{task_id}/complete",
    response_model=TaskResponse,
)
async def toggle_complete(
    user_id: str,
    task_id: int,
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    """Toggle a task's completion status."""
    task = await _get_user_task(session, user_id, task_id)
    task.completed = not task.completed
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return TaskResponse.model_validate(task)


async def _get_user_task(
    session: AsyncSession, user_id: str, task_id: int
) -> Task:
    """Helper: fetch a task owned by user_id, or raise 404."""
    stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
    result = await session.execute(stmt)
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    return task
```

## Key Points

- `_get_user_task` — shared helper enforces user ownership + 404 pattern
- `list_tasks` — always filters by `user_id`, never returns all tasks
- `create_task` — strips title whitespace, returns 201
- `update_task` — None fields keep existing values (Phase 1 semantics)
- `delete_task` — returns 204 with no body
- `toggle_complete` — flips boolean (not explicit set), matches Phase 1

## backend/routes/__init__.py

```python
from backend.routes.tasks import router as tasks_router

__all__ = ["tasks_router"]
```
