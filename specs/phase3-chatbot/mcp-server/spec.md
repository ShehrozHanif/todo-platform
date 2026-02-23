# Spec: MCP Server — Task Management Tools

**Feature:** MCP Server for AI-driven task management
**Phase:** 3 — AI Chatbot
**Spec Location:** `specs/phase3-chatbot/mcp-server/`
**Status:** Draft
**Date:** 2026-02-23

---

## 1. Purpose

Expose the todo platform's task CRUD operations as MCP (Model Context Protocol) tools so that any AI agent can manage a user's tasks via a standardized protocol.

## 2. Background

The todo platform currently has two interfaces:
- **CLI** (Phase 1) — terminal commands
- **Web UI** (Phase 2) — browser with REST API

This feature adds a third interface:
- **MCP Server** — AI agents call tools via the MCP protocol

The MCP server connects to the **same Neon PostgreSQL database** used by the web app. Tasks created via AI chat appear instantly in the web dashboard.

## 3. In Scope

- 5 MCP tools: `add_task`, `list_tasks`, `complete_task`, `delete_task`, `update_task`
- Direct database access (reuse SQLModel + async engine from backend)
- SSE transport for remote access (Render deployment)
- User context passed as tool parameter (`user_id`)
- Input validation matching existing backend schemas
- Error handling with descriptive messages

## 4. Out of Scope

- Authentication/authorization (handled by the AI Agent layer in Feature 2)
- Chat history or conversation management (Feature 2)
- Frontend UI changes (Feature 3)
- Task categories, priorities, or other UI-only fields (stored in localStorage, not DB)
- Batch operations (add multiple tasks at once)

## 5. Dependencies

- **Neon PostgreSQL** — existing `task` and `user` tables from Phase 2
- **Python MCP SDK** — `mcp` package (v1.7.x) with `FastMCP`
- **SQLModel + SQLAlchemy async** — reuse existing DB patterns from `backend/`
- **asyncpg** — async PostgreSQL driver

## 6. Tool Specifications

### 6.1 `add_task`

**Description:** Create a new task for a user.

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Must be a valid user ID |
| `title` | string | Yes | Non-empty, max 200 chars |
| `description` | string | No | Max 1000 chars |

**Returns:** JSON object with created task (`id`, `user_id`, `title`, `description`, `completed`, `created_at`)

**Error cases:**
- Empty title → error message "Title is required"
- Title > 200 chars → error message "Title must be 200 characters or less"
- Invalid user_id → error message "User not found"

---

### 6.2 `list_tasks`

**Description:** Get all tasks for a user.

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Must be a valid user ID |

**Returns:** JSON array of task objects. Empty array if no tasks exist.

**Error cases:**
- Invalid user_id → empty array (graceful, not an error)

---

### 6.3 `complete_task`

**Description:** Toggle a task's completed status.

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Must be a valid user ID |
| `task_id` | integer | Yes | Must be a valid task ID owned by this user |

**Returns:** JSON object with updated task (showing new `completed` value)

**Error cases:**
- Task not found → error message "Task not found"
- Task belongs to different user → error message "Task not found" (same — no information leak)

---

### 6.4 `delete_task`

**Description:** Delete a task.

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Must be a valid user ID |
| `task_id` | integer | Yes | Must be a valid task ID owned by this user |

**Returns:** Confirmation message "Task deleted successfully"

**Error cases:**
- Task not found → error message "Task not found"
- Task belongs to different user → error message "Task not found"

---

### 6.5 `update_task`

**Description:** Update a task's title and/or description.

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Must be a valid user ID |
| `task_id` | integer | Yes | Must be a valid task ID owned by this user |
| `title` | string | No | Non-empty if provided, max 200 chars |
| `description` | string | No | Max 1000 chars |

**Returns:** JSON object with updated task

**Error cases:**
- Task not found → error message "Task not found"
- No fields provided → error message "Provide at least title or description to update"
- Title empty string → error message "Title cannot be empty"

---

## 7. Technical Requirements

### 7.1 Server Configuration

- **SDK:** Python `mcp` package with `FastMCP`
- **Transport:** SSE (for remote HTTP access from Render)
- **Server name:** `"todo-platform"`
- **Async:** All tool handlers are async (using async SQLAlchemy sessions)

### 7.2 Database Connection

- Reuse the async engine pattern from `backend/db.py`
- Connection string from `DATABASE_URL` environment variable
- SSL required for Neon in production
- Async sessions with auto-commit/rollback

### 7.3 File Structure

```
agents/
  mcp-server/
    server.py           ← FastMCP server definition + tool handlers
    db.py               ← Async DB engine + session (reused pattern)
    models.py           ← SQLModel Task model (reused from backend)
    pyproject.toml      ← Dependencies (mcp, sqlmodel, asyncpg)
    .env.example        ← DATABASE_URL template
    README.md           ← Setup and run instructions
```

### 7.4 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |

## 8. Acceptance Criteria

- [ ] MCP server starts without errors using `python server.py`
- [ ] `add_task` creates a task in the database and returns the created task
- [ ] `list_tasks` returns all tasks for a given user
- [ ] `complete_task` toggles the completed status of a task
- [ ] `delete_task` removes a task from the database
- [ ] `update_task` modifies a task's title and/or description
- [ ] All tools enforce user-scoped access (user can only see/modify their own tasks)
- [ ] Tasks created via MCP appear in the web dashboard (same database)
- [ ] Invalid inputs return descriptive error messages (not stack traces)
- [ ] Server runs on SSE transport for remote access

## 9. Non-Functional Requirements

- **Latency:** Tool calls should complete in < 2 seconds (DB round-trip)
- **Errors:** No unhandled exceptions — all errors return clean messages
- **Logging:** Log tool calls with user_id and tool name (no sensitive data)
- **Stateless:** No in-memory state — all data in Neon DB

## 10. Risks

1. **DB connection pooling** — MCP server needs its own connection pool, separate from FastAPI backend. Neon free tier has connection limits.
2. **User validation** — MCP server trusts the `user_id` parameter. Auth is handled at the AI Agent layer (Feature 2).
3. **Concurrent access** — Two interfaces (web + MCP) writing to the same DB could cause race conditions on toggle_complete. Acceptable for hackathon scope.
