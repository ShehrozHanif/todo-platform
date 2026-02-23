# Tasks: MCP Server

**Feature:** MCP Server for AI-driven task management
**Phase:** 3 — AI Chatbot
**Date:** 2026-02-23

---

## T001: Scaffold MCP Server Project

**Description:** Create the `agents/mcp-server/` directory with project configuration.

**Files to create:**
- `agents/mcp-server/pyproject.toml` — dependencies: mcp[cli], sqlmodel, asyncpg, sqlalchemy[asyncio], python-dotenv
- `agents/mcp-server/.env.example` — DATABASE_URL placeholder
- `agents/mcp-server/.env` — actual DATABASE_URL (gitignored)

**Acceptance criteria:**
- [ ] `cd agents/mcp-server && uv sync` installs all dependencies
- [ ] `.env.example` exists with placeholder
- [ ] `.env` has actual Neon DATABASE_URL

---

## T002: Create Database Layer

**Description:** Create `db.py` and `models.py` with async DB connection and SQLModel models.

**Files to create:**
- `agents/mcp-server/db.py` — async engine (pool_size=5), get_session() context manager
- `agents/mcp-server/models.py` — Task and User SQLModel models (matching backend schema)

**Acceptance criteria:**
- [ ] `get_session()` connects to Neon DB successfully
- [ ] Task model matches existing `task` table (id, user_id, title, description, completed, created_at, updated_at)
- [ ] User model matches existing `user` table (id, email, name, createdAt, updatedAt)
- [ ] Connection string auto-converts `postgres://` to `postgresql+asyncpg://`

---

## T003: Implement FastMCP Server with add_task and list_tasks

**Description:** Create `server.py` with FastMCP instance and first two tools.

**File to create:**
- `agents/mcp-server/server.py`

**Tools:**
1. `add_task(user_id, title, description?)` → creates task, returns JSON
2. `list_tasks(user_id)` → returns JSON array of tasks

**Acceptance criteria:**
- [ ] Server starts with `uv run server.py` (SSE transport)
- [ ] `add_task` validates user exists, validates title, creates task in DB
- [ ] `add_task` returns created task as JSON
- [ ] `list_tasks` returns all tasks for a user as JSON array
- [ ] `list_tasks` returns empty array for user with no tasks
- [ ] Both tools return `{"error": "..."}` on failure (not exceptions)

---

## T004: Implement complete_task, delete_task, update_task

**Description:** Add remaining three tools to `server.py`.

**Tools:**
3. `complete_task(user_id, task_id)` → toggles completed, returns updated task
4. `delete_task(user_id, task_id)` → deletes task, returns confirmation
5. `update_task(user_id, task_id, title?, description?)` → updates fields, returns updated task

**Acceptance criteria:**
- [ ] `complete_task` toggles the `completed` boolean
- [ ] `delete_task` removes the task from DB
- [ ] `update_task` modifies only the provided fields
- [ ] All three enforce user-scoped access (task must belong to user_id)
- [ ] Task not found returns `{"error": "Task not found"}`
- [ ] `update_task` with no fields returns `{"error": "Provide at least title or description to update"}`

---

## T005: Test All Tools with MCP Inspector

**Description:** Use `mcp dev server.py` to manually test all 5 tools.

**Test cases:**
1. `add_task` with valid user → task created, appears in web dashboard
2. `add_task` with invalid user → error message
3. `add_task` with empty title → error message
4. `list_tasks` for user with tasks → returns array
5. `list_tasks` for user with no tasks → returns empty array
6. `complete_task` on incomplete task → completed = true
7. `complete_task` on completed task → completed = false
8. `delete_task` on valid task → task removed
9. `delete_task` on non-existent task → error message
10. `update_task` with new title → title changed
11. `update_task` with no fields → error message

**Acceptance criteria:**
- [ ] All 11 test cases pass
- [ ] Tasks created via MCP visible in web dashboard at localhost:3000
- [ ] No unhandled exceptions in server logs

---

## Task Dependencies

```
T001 (scaffold) → T002 (DB layer) → T003 (add + list) → T004 (complete + delete + update) → T005 (test all)
```

All sequential — each task depends on the previous.
