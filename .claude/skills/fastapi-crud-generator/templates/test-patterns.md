# Integration Test Patterns Template

## backend/tests/test_routes.py

```python
# [Task]: T00X [From]: specs/phase2-web/rest-api/tasks.md §Route Tests
"""Integration tests for Task CRUD API endpoints.

Uses httpx AsyncClient with dependency override — never hits real DB.
"""

from httpx import AsyncClient

from backend.models import Task, User


# ── List Tasks (GET /api/{user_id}/tasks) ─────────────────────────


class TestListTasks:
    async def test_empty_list(self, client: AsyncClient, seed_user: User):
        resp = await client.get(f"/api/{seed_user.id}/tasks")
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_returns_user_tasks(self, client: AsyncClient, seed_task: Task):
        resp = await client.get(f"/api/{seed_task.user_id}/tasks")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Test Task"

    async def test_does_not_return_other_users_tasks(
        self, client: AsyncClient, seed_task: Task, session
    ):
        other_user = User(id="other-user", email="other@test.com", name="Other")
        session.add(other_user)
        await session.commit()

        resp = await client.get("/api/other-user/tasks")
        assert resp.status_code == 200
        assert resp.json() == []


# ── Create Task (POST /api/{user_id}/tasks) ───────────────────────


class TestCreateTask:
    async def test_create_with_title_and_description(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"title": "New Task", "description": "Details here"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "New Task"
        assert data["description"] == "Details here"
        assert data["completed"] is False
        assert data["user_id"] == seed_user.id
        assert "id" in data

    async def test_create_with_title_only(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"title": "Minimal Task"},
        )
        assert resp.status_code == 201
        assert resp.json()["description"] is None

    async def test_create_strips_title_whitespace(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"title": "  Padded Title  "},
        )
        assert resp.status_code == 201
        assert resp.json()["title"] == "Padded Title"

    async def test_create_empty_title_returns_422(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"title": ""},
        )
        assert resp.status_code == 422

    async def test_create_missing_title_returns_422(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"description": "No title"},
        )
        assert resp.status_code == 422

    async def test_create_title_too_long_returns_422(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.post(
            f"/api/{seed_user.id}/tasks",
            json={"title": "x" * 201},
        )
        assert resp.status_code == 422


# ── Get Task (GET /api/{user_id}/tasks/{id}) ──────────────────────


class TestGetTask:
    async def test_get_existing_task(self, client: AsyncClient, seed_task: Task):
        resp = await client.get(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == seed_task.id
        assert data["title"] == "Test Task"

    async def test_get_nonexistent_returns_404(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.get(f"/api/{seed_user.id}/tasks/99999")
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Task not found"

    async def test_get_other_users_task_returns_404(
        self, client: AsyncClient, seed_task: Task, session
    ):
        other_user = User(id="other-user", email="other@test.com", name="Other")
        session.add(other_user)
        await session.commit()

        resp = await client.get(f"/api/other-user/tasks/{seed_task.id}")
        assert resp.status_code == 404


# ── Update Task (PUT /api/{user_id}/tasks/{id}) ───────────────────


class TestUpdateTask:
    async def test_update_title(self, client: AsyncClient, seed_task: Task):
        resp = await client.put(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
            json={"title": "Updated Title"},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"
        assert resp.json()["description"] == "A test task"  # unchanged

    async def test_update_description(self, client: AsyncClient, seed_task: Task):
        resp = await client.put(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
            json={"description": "New description"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "New description"
        assert resp.json()["title"] == "Test Task"  # unchanged

    async def test_update_both_fields(self, client: AsyncClient, seed_task: Task):
        resp = await client.put(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
            json={"title": "New", "description": "Also new"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "New"
        assert data["description"] == "Also new"

    async def test_update_empty_body_keeps_existing(
        self, client: AsyncClient, seed_task: Task
    ):
        resp = await client.put(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
            json={},
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Test Task"

    async def test_update_nonexistent_returns_404(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.put(
            f"/api/{seed_user.id}/tasks/99999",
            json={"title": "Nope"},
        )
        assert resp.status_code == 404


# ── Delete Task (DELETE /api/{user_id}/tasks/{id}) ─────────────────


class TestDeleteTask:
    async def test_delete_returns_204(self, client: AsyncClient, seed_task: Task):
        resp = await client.delete(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}"
        )
        assert resp.status_code == 204
        assert resp.content == b""

    async def test_deleted_task_is_gone(self, client: AsyncClient, seed_task: Task):
        await client.delete(f"/api/{seed_task.user_id}/tasks/{seed_task.id}")

        resp = await client.get(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}"
        )
        assert resp.status_code == 404

    async def test_delete_nonexistent_returns_404(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.delete(f"/api/{seed_user.id}/tasks/99999")
        assert resp.status_code == 404


# ── Toggle Complete (PATCH /api/{user_id}/tasks/{id}/complete) ─────


class TestToggleComplete:
    async def test_toggle_to_complete(self, client: AsyncClient, seed_task: Task):
        resp = await client.patch(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}/complete"
        )
        assert resp.status_code == 200
        assert resp.json()["completed"] is True

    async def test_toggle_back_to_incomplete(
        self, client: AsyncClient, seed_task: Task
    ):
        await client.patch(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}/complete"
        )
        resp = await client.patch(
            f"/api/{seed_task.user_id}/tasks/{seed_task.id}/complete"
        )
        assert resp.status_code == 200
        assert resp.json()["completed"] is False

    async def test_toggle_nonexistent_returns_404(
        self, client: AsyncClient, seed_user: User
    ):
        resp = await client.patch(f"/api/{seed_user.id}/tasks/99999/complete")
        assert resp.status_code == 404


# ── Health Check (GET /health) ─────────────────────────────────────


class TestHealthCheck:
    async def test_health_returns_ok(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}
```

## Test Count Summary

| Test Class | Tests | What It Covers |
|------------|-------|----------------|
| `TestListTasks` | 3 | Empty list, returns user tasks, user isolation |
| `TestCreateTask` | 6 | Full create, title only, strip whitespace, empty/missing/too-long title |
| `TestGetTask` | 3 | Existing task, nonexistent 404, other user's task 404 |
| `TestUpdateTask` | 5 | Update title, description, both, empty body, nonexistent 404 |
| `TestDeleteTask` | 3 | 204 response, verify gone, nonexistent 404 |
| `TestToggleComplete` | 3 | Toggle on, toggle off, nonexistent 404 |
| `TestHealthCheck` | 1 | Health endpoint |
| **Total** | **24** | Full CRUD + error path coverage |

## Patterns Used

- `seed_user` fixture auto-creates a test user (FK requirement)
- `seed_task` depends on `seed_user` — composable fixtures
- User isolation tested: other user can't see/modify tasks
- All requests use httpx `AsyncClient` — no real network
- Status codes explicitly asserted for each endpoint
- Error detail messages asserted where relevant
