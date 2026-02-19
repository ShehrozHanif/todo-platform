# [Task]: T013-T036 [From]: specs/phase2-web/database-schema/spec.md
# Database model tests — covers all 4 user stories + edge cases.
# TDD: Red → Green → Refactor per Constitution §III

import pytest
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models import Task, User
from schemas import TaskCreate


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_user(
    session: AsyncSession,
    user_id: str = "u1",
    email: str = "a@example.com",
) -> User:
    user = User(id=user_id, email=email, name="Test User")
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user


async def _create_task(
    session: AsyncSession,
    user_id: str = "u1",
    title: str = "My Task",
    description: str | None = None,
) -> Task:
    task = Task(user_id=user_id, title=title, description=description)
    session.add(task)
    await session.flush()
    await session.refresh(task)
    return task


# ---------------------------------------------------------------------------
# US1 — Store and Retrieve Tasks Per User (P1)
# ---------------------------------------------------------------------------


async def test_create_user_and_task_auto_timestamps(session: AsyncSession) -> None:
    """T013 — SC-003: auto-populated timestamps on creation."""
    user = await _create_user(session)
    task = await _create_task(session, user_id=user.id)

    assert task.id is not None
    assert task.created_at is not None
    assert task.updated_at is not None
    assert task.completed is False


async def test_query_tasks_by_user_isolation(session: AsyncSession) -> None:
    """T014 — FR-007, SC-002: only the requesting user's tasks are returned."""
    user_a = await _create_user(session, user_id="ua", email="a@example.com")
    user_b = await _create_user(session, user_id="ub", email="b@example.com")

    task_a = await _create_task(session, user_id=user_a.id, title="Task A")
    await _create_task(session, user_id=user_b.id, title="Task B")

    result = await session.exec(select(Task).where(Task.user_id == user_a.id))
    tasks = result.all()

    assert len(tasks) == 1
    assert tasks[0].id == task_a.id
    assert tasks[0].title == "Task A"


# ---------------------------------------------------------------------------
# US2 — Manage Task Lifecycle (P1)
# ---------------------------------------------------------------------------


async def test_update_task_title_persists(session: AsyncSession) -> None:
    """T018 — FR-008, FR-006: update persists title + description."""
    user = await _create_user(session)
    task = await _create_task(session, user_id=user.id, title="Original")

    task.title = "Updated Title"
    task.description = "New description"
    session.add(task)
    await session.flush()
    await session.refresh(task)

    assert task.title == "Updated Title"
    assert task.description == "New description"
    assert task.updated_at is not None


async def test_toggle_task_completion(session: AsyncSession) -> None:
    """T019 — FR-008: toggle completed status and persist."""
    user = await _create_user(session)
    task = await _create_task(session, user_id=user.id)

    assert task.completed is False

    task.completed = True
    session.add(task)
    await session.flush()
    await session.refresh(task)
    assert task.completed is True

    task.completed = False
    session.add(task)
    await session.flush()
    await session.refresh(task)
    assert task.completed is False


async def test_delete_task_is_permanent(session: AsyncSession) -> None:
    """T020 — FR-009: deleted task is no longer retrievable."""
    user = await _create_user(session)
    task = await _create_task(session, user_id=user.id)
    task_id = task.id

    await session.delete(task)
    await session.flush()

    result = await session.exec(select(Task).where(Task.id == task_id))
    assert result.first() is None


# ---------------------------------------------------------------------------
# US3 — User Isolation (P2)
# ---------------------------------------------------------------------------


async def test_user_a_tasks_not_visible_to_user_b(session: AsyncSession) -> None:
    """T023 — FR-010, SC-002: cross-user data leakage is prevented."""
    user_a = await _create_user(session, user_id="ua2", email="ua2@example.com")
    user_b = await _create_user(session, user_id="ub2", email="ub2@example.com")

    await _create_task(session, user_id=user_a.id, title="A's Task")

    result = await session.exec(select(Task).where(Task.user_id == user_b.id))
    assert len(result.all()) == 0


async def test_task_lookup_by_wrong_user_returns_nothing(session: AsyncSession) -> None:
    """T024 — FR-010: accessing another user's task via wrong user_id returns nothing."""
    user_a = await _create_user(session, user_id="ua3", email="ua3@example.com")
    user_b = await _create_user(session, user_id="ub3", email="ub3@example.com")

    task = await _create_task(session, user_id=user_a.id)

    result = await session.exec(
        select(Task).where(Task.id == task.id, Task.user_id == user_b.id)
    )
    assert result.first() is None


# ---------------------------------------------------------------------------
# US4 — Automatic Timestamping (P3)
# ---------------------------------------------------------------------------


async def test_created_at_auto_populated(session: AsyncSession) -> None:
    """T028 — SC-003: created_at is set automatically without manual input."""
    user = await _create_user(session)
    task = await _create_task(session, user_id=user.id)
    assert task.created_at is not None


async def test_read_only_timestamps_unchanged(session: AsyncSession) -> None:
    """T030 — SC-003: reading a task without modification leaves timestamps unchanged."""
    user = await _create_user(session)
    task = await _create_task(session, user_id=user.id)
    original_created_at = task.created_at
    original_updated_at = task.updated_at

    result = await session.exec(select(Task).where(Task.id == task.id))
    fetched = result.first()

    assert fetched is not None
    assert fetched.created_at == original_created_at
    assert fetched.updated_at == original_updated_at


# ---------------------------------------------------------------------------
# Edge Cases & Validation
# ---------------------------------------------------------------------------


def test_task_title_max_length_enforced() -> None:
    """T034 — FR-011: title exceeding 200 chars is rejected by Pydantic schema."""
    with pytest.raises(ValidationError):
        TaskCreate(title="x" * 201)


def test_task_empty_title_rejected() -> None:
    """T033 — FR-011: empty title is rejected by Pydantic schema."""
    with pytest.raises(ValidationError):
        TaskCreate(title="")


def test_task_whitespace_title_rejected() -> None:
    """T033 — FR-011: whitespace-only title is rejected."""
    with pytest.raises(ValidationError):
        TaskCreate(title="   ")


def test_task_description_max_length() -> None:
    """T035 — description > 1000 chars is rejected by Pydantic schema."""
    with pytest.raises(ValidationError):
        TaskCreate(title="Valid Title", description="d" * 1001)


async def test_user_email_uniqueness(session: AsyncSession) -> None:
    """T027 — FR-013: duplicate email raises DB IntegrityError."""
    await _create_user(session, user_id="u_dup1", email="dup@example.com")

    user2 = User(id="u_dup2", email="dup@example.com", name="Duplicate")
    session.add(user2)

    with pytest.raises(IntegrityError):
        await session.flush()
