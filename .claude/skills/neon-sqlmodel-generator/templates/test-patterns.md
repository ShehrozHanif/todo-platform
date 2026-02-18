# Test Patterns Template

## backend/tests/test_models.py

```python
# [Task]: T00X [From]: specs/phase2-web/database-schema/tasks.md §Model Tests
"""Tests for SQLModel Task and User models.

Uses SQLite async in-memory database via conftest.py fixtures.
"""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Task, User


# ── User Model Tests ──────────────────────────────────────────────


class TestUserModel:
    """Tests for User SQLModel."""

    async def test_create_user_with_all_fields(self, session: AsyncSession):
        user = User(id="user-abc-123", email="test@example.com", name="Test User")
        session.add(user)
        await session.commit()
        await session.refresh(user)

        assert user.id == "user-abc-123"
        assert user.email == "test@example.com"
        assert user.name == "Test User"

    async def test_user_id_is_string(self, session: AsyncSession):
        user = User(id="string-id", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        result = await session.get(User, "string-id")
        assert result is not None
        assert isinstance(result.id, str)

    async def test_user_default_name_is_empty(self):
        user = User(id="u1", email="x@y.com")
        assert user.name == ""

    async def test_user_persists_and_queries(self, session: AsyncSession):
        user = User(id="u1", email="test@test.com", name="Tester")
        session.add(user)
        await session.commit()

        stmt = select(User).where(User.email == "test@test.com")
        result = await session.execute(stmt)
        fetched = result.scalar_one()
        assert fetched.id == "u1"
        assert fetched.name == "Tester"


# ── Task Model Tests ──────────────────────────────────────────────


class TestTaskModel:
    """Tests for Task SQLModel."""

    async def test_create_task_with_required_fields(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        task = Task(user_id="u1", title="Buy groceries")
        session.add(task)
        await session.commit()
        await session.refresh(task)

        assert task.id is not None
        assert task.user_id == "u1"
        assert task.title == "Buy groceries"

    async def test_task_auto_increments_id(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        task1 = Task(user_id="u1", title="Task 1")
        task2 = Task(user_id="u1", title="Task 2")
        session.add_all([task1, task2])
        await session.commit()
        await session.refresh(task1)
        await session.refresh(task2)

        assert task1.id is not None
        assert task2.id is not None
        assert task2.id > task1.id

    async def test_task_default_completed_is_false(self):
        task = Task(user_id="u1", title="Test")
        assert task.completed is False

    async def test_task_default_description_is_none(self):
        task = Task(user_id="u1", title="Test")
        assert task.description is None

    async def test_task_with_description(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        task = Task(user_id="u1", title="Groceries", description="Milk, eggs, bread")
        session.add(task)
        await session.commit()
        await session.refresh(task)

        assert task.description == "Milk, eggs, bread"

    async def test_task_completed_toggle(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        task = Task(user_id="u1", title="Test")
        session.add(task)
        await session.commit()

        task.completed = True
        session.add(task)
        await session.commit()
        await session.refresh(task)

        assert task.completed is True


# ── Query & Relationship Tests ────────────────────────────────────


class TestTaskQueries:
    """Tests for querying tasks by user and status."""

    async def test_query_tasks_by_user_id(self, session: AsyncSession):
        user1 = User(id="u1", email="a@b.com", name="A")
        user2 = User(id="u2", email="c@d.com", name="B")
        session.add_all([user1, user2])
        await session.commit()

        session.add_all([
            Task(user_id="u1", title="User1 Task"),
            Task(user_id="u2", title="User2 Task"),
            Task(user_id="u1", title="User1 Task 2"),
        ])
        await session.commit()

        stmt = select(Task).where(Task.user_id == "u1")
        result = await session.execute(stmt)
        tasks = result.scalars().all()

        assert len(tasks) == 2
        assert all(t.user_id == "u1" for t in tasks)

    async def test_query_tasks_by_completed_status(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        session.add_all([
            Task(user_id="u1", title="Done", completed=True),
            Task(user_id="u1", title="Pending", completed=False),
            Task(user_id="u1", title="Also Done", completed=True),
        ])
        await session.commit()

        stmt = select(Task).where(Task.user_id == "u1", Task.completed == True)
        result = await session.execute(stmt)
        completed = result.scalars().all()

        assert len(completed) == 2

    async def test_delete_task(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        task = Task(user_id="u1", title="Delete me")
        session.add(task)
        await session.commit()
        task_id = task.id

        await session.delete(task)
        await session.commit()

        result = await session.get(Task, task_id)
        assert result is None

    async def test_update_task_title(self, session: AsyncSession):
        user = User(id="u1", email="a@b.com", name="A")
        session.add(user)
        await session.commit()

        task = Task(user_id="u1", title="Old Title")
        session.add(task)
        await session.commit()

        task.title = "New Title"
        session.add(task)
        await session.commit()
        await session.refresh(task)

        assert task.title == "New Title"
```

## Test Count Summary

| Test Class | Tests | What It Covers |
|------------|-------|----------------|
| `TestUserModel` | 4 | User creation, string ID, defaults, persistence |
| `TestTaskModel` | 6 | Task creation, auto-increment, defaults, description, toggle |
| `TestTaskQueries` | 4 | Filter by user, filter by status, delete, update |
| **Total** | **14** | Full model + query coverage |

## Patterns Used

- All tests are `async def` — `asyncio_mode = "auto"` handles marking
- Each test creates its own User first (FK requirement)
- `session.refresh(obj)` to get DB-generated fields (id, timestamps)
- `select(Model).where(...)` for query tests
- `session.get(Model, pk)` for single-item lookup
- No mocking — real async SQLite DB operations
