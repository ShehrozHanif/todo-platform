# [Task]: T012-T018 / T007 [From]: specs/phase2-web/rest-api/tasks.md + authentication/tasks.md
# Integration tests for Task CRUD API endpoints — with JWT auth headers.
# Spec: SC-001 to SC-004 | FR-001 to FR-010

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from models import Task, User


# ── Health Check ─────────────────────────────────────────────────────────────


async def test_health_returns_ok(client: AsyncClient) -> None:
    """Health endpoint returns 200 with status: ok — no auth required."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ── Auth Guard Tests ──────────────────────────────────────────────────────────


async def test_task_endpoints_require_auth(client: AsyncClient, seed_user: User) -> None:
    """All task routes return 401 without Authorization header."""
    resp = await client.get(f"/api/{seed_user.id}/tasks")
    assert resp.status_code == 401


# ── List Tasks (GET /api/{user_id}/tasks) ─────────────────────────────────────


async def test_list_tasks_empty(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """Empty list returned when user has no tasks."""
    resp = await client.get(f"/api/{seed_user.id}/tasks", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_tasks_returns_user_tasks(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Returns the user's tasks — correct data and count."""
    resp = await client.get(f"/api/{seed_task.user_id}/tasks", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Task"
    assert data[0]["user_id"] == seed_task.user_id


async def test_list_tasks_user_isolation(
    client: AsyncClient, seed_task: Task, session: AsyncSession, auth_headers: dict
) -> None:
    """SC-002: another user's list is empty even when tasks exist for first user."""
    other = User(id="other-user", email="other@example.com", name="Other")
    session.add(other)
    await session.commit()

    # auth_headers is for test-user-1 — so /api/other-user/ returns 403
    resp = await client.get("/api/other-user/tasks", headers=auth_headers)
    assert resp.status_code == 403


# ── Create Task (POST /api/{user_id}/tasks) ───────────────────────────────────


async def test_create_task_full(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-003: 201 with task object including id, completed=false."""
    resp = await client.post(
        f"/api/{seed_user.id}/tasks",
        json={"title": "New Task", "description": "Details here"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "New Task"
    assert data["description"] == "Details here"
    assert data["completed"] is False
    assert data["user_id"] == seed_user.id
    assert isinstance(data["id"], int)


async def test_create_task_title_only(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """Task created with no description — description is null."""
    resp = await client.post(
        f"/api/{seed_user.id}/tasks",
        json={"title": "Minimal Task"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["description"] is None


async def test_create_task_strips_whitespace(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-010: title whitespace stripped before storage."""
    resp = await client.post(
        f"/api/{seed_user.id}/tasks",
        json={"title": "  Padded Title  "},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Padded Title"


async def test_create_task_empty_title_422(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-007: empty title returns 422."""
    resp = await client.post(
        f"/api/{seed_user.id}/tasks",
        json={"title": ""},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_create_task_missing_title_422(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-007: missing title returns 422."""
    resp = await client.post(
        f"/api/{seed_user.id}/tasks",
        json={"description": "No title"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


async def test_create_task_title_too_long_422(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-007: title > 200 chars returns 422."""
    resp = await client.post(
        f"/api/{seed_user.id}/tasks",
        json={"title": "x" * 201},
        headers=auth_headers,
    )
    assert resp.status_code == 422


# ── Get Task (GET /api/{user_id}/tasks/{id}) ──────────────────────────────────


async def test_get_task_existing(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Returns correct task by id."""
    resp = await client.get(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == seed_task.id
    assert data["title"] == "Test Task"


async def test_get_task_not_found(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-006: nonexistent task returns 404 with detail."""
    resp = await client.get(
        f"/api/{seed_user.id}/tasks/99999", headers=auth_headers
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Task not found"


async def test_get_task_wrong_user_403(
    client: AsyncClient, seed_task: Task, session: AsyncSession, auth_headers: dict
) -> None:
    """SC-002: auth_headers (test-user-1) can't access other-user3's tasks — 403."""
    other = User(id="other-user3", email="other3@example.com", name="Other3")
    session.add(other)
    await session.commit()

    resp = await client.get(
        f"/api/other-user3/tasks/{seed_task.id}", headers=auth_headers
    )
    assert resp.status_code == 403


# ── Update Task (PUT /api/{user_id}/tasks/{id}) ───────────────────────────────


async def test_update_title(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """FR-005: title updated, description unchanged."""
    resp = await client.put(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
        json={"title": "Updated Title"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "A test task"  # unchanged


async def test_update_description(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Description updated, title unchanged."""
    resp = await client.put(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
        json={"description": "New description"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["description"] == "New description"
    assert data["title"] == "Test Task"  # unchanged


async def test_update_both_fields(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Both title and description updated."""
    resp = await client.put(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
        json={"title": "New Title", "description": "New desc"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["description"] == "New desc"


async def test_update_empty_body_keeps_existing(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Empty PUT body keeps existing field values."""
    resp = await client.put(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}",
        json={},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Task"
    assert data["description"] == "A test task"


async def test_update_nonexistent_404(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-006: updating nonexistent task returns 404."""
    resp = await client.put(
        f"/api/{seed_user.id}/tasks/99999",
        json={"title": "Nope"},
        headers=auth_headers,
    )
    assert resp.status_code == 404


# ── Delete Task (DELETE /api/{user_id}/tasks/{id}) ────────────────────────────


async def test_delete_returns_204(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """FR-004: DELETE returns 204 with empty body."""
    resp = await client.delete(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}", headers=auth_headers
    )
    assert resp.status_code == 204
    assert resp.content == b""


async def test_delete_task_is_gone(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Deleted task returns 404 on subsequent GET."""
    await client.delete(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}", headers=auth_headers
    )
    resp = await client.get(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}", headers=auth_headers
    )
    assert resp.status_code == 404


async def test_delete_nonexistent_404(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-006: deleting nonexistent task returns 404."""
    resp = await client.delete(
        f"/api/{seed_user.id}/tasks/99999", headers=auth_headers
    )
    assert resp.status_code == 404


# ── Toggle Complete (PATCH /api/{user_id}/tasks/{id}/complete) ────────────────


async def test_toggle_to_complete(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """First toggle sets completed=true."""
    resp = await client.patch(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}/complete",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["completed"] is True


async def test_toggle_back_to_incomplete(
    client: AsyncClient, seed_task: Task, auth_headers: dict
) -> None:
    """Second toggle sets completed=false."""
    await client.patch(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}/complete",
        headers=auth_headers,
    )
    resp = await client.patch(
        f"/api/{seed_task.user_id}/tasks/{seed_task.id}/complete",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["completed"] is False


async def test_toggle_nonexistent_404(
    client: AsyncClient, seed_user: User, auth_headers: dict
) -> None:
    """FR-006: toggling nonexistent task returns 404."""
    resp = await client.patch(
        f"/api/{seed_user.id}/tasks/99999/complete", headers=auth_headers
    )
    assert resp.status_code == 404
