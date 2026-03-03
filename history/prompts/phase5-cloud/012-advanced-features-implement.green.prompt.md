---
id: 012
title: Advanced Features Full Backend Migration
stage: green
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: advanced-features
branch: master
user: Shehroz Hanif
command: /sp.implement
labels: ["advanced-features","search","filter","sort","recurring","priority","tags","due-date","mcp","frontend","localStorage-removal"]
links:
  spec: specs/phase5-cloud/advanced-features/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - backend/models.py
  - backend/schemas.py
  - backend/db.py
  - backend/routes/tasks.py
  - agents/mcp-server/models.py
  - agents/mcp-server/server.py
  - frontend/lib/types.ts
  - frontend/lib/api.ts
  - frontend/context/TaskContext.tsx
  - frontend/components/tasks/TaskModal.tsx
tests:
  - backend/tests/test_routes.py (all 31 route tests GREEN — backward compatible)
  - Full suite: 138 passed, 0 failed
---

## Prompt

/sp.implement (Advanced Features — Phase 5 Feature 1)

Executing full backend migration of localStorage-only fields (priority, category, dueDate, dueTime, recurring, reminder) to the backend DB. Plan covers: 7 new columns on Task model, Pydantic schema extensions with validators, PostgreSQL ALTER TABLE migration, search/filter/sort query params on list_tasks, recurring auto-creation on toggle_complete, MCP server tool extensions, and frontend API client rewrite (removing all localStorage helpers).

## Response snapshot

Completed all 10 file modifications across backend, MCP server, and frontend:

**Step 1 (backend/models.py)**: Added 7 new Phase 5 columns to Task SQLModel: priority (VARCHAR 6, indexed), category (VARCHAR 50), tags (TEXT for JSON array), due_date (DATE), due_time (VARCHAR 5), recurring (VARCHAR 7), reminder (BOOLEAN). Used `sa_column=Column(Date, nullable=True)` for proper SQLAlchemy type mapping.

**Step 2 (backend/schemas.py)**: Extended TaskCreate, TaskUpdate with all 7 optional fields plus validators — priority ∈ {high, medium, low}, category ≤50 chars, tags max 5 items each ≤30 chars, due_time HH:MM regex, recurring ∈ {daily, weekly, monthly}. TaskRead has `@field_validator("tags", mode="before")` to deserialize JSON string → list from DB.

**Step 3 (backend/db.py)**: Added `_migrate_task_columns()` with 8 SQL statements (7 ALTER TABLE ADD COLUMN IF NOT EXISTS + 1 CREATE INDEX). Called in `lifespan()` after `create_all` for PostgreSQL only (`"sqlite" not in str(engine.url)` guard).

**Step 4 (backend/routes/tasks.py)**: Added search (ILIKE on title+description via `or_()`), filter (priority, category, completed, tags JSON search, due_date range), and sort (due_date, priority via `case()` expression, title, created_at) params. Updated `create_task` to pass all 7 fields with `json.dumps(data.tags)` serialization. Updated `update_task` with `if data.X is not None` pattern for all new fields. Added `toggle_complete` recurring auto-creation: daily (+1 day), weekly (+7 days), monthly (calendar.monthrange for day clamping). `_next_recurring_date()` helper function.

**Step 5a (agents/mcp-server/models.py)**: Mirrored all 7 new columns (same types, same nullable patterns).

**Step 5b (agents/mcp-server/server.py)**: Updated `_task_to_dict()` to include all 7 fields with JSON deserialization for tags and ISO format for due_date. Extended `add_task()` signature with 7 new optional params, input validation, date parsing. Extended `update_task()` with same params and `if field is not None` update pattern.

**Step 6a (frontend/lib/types.ts)**: Changed `recurring?: boolean` → `recurring?: string` to support 'daily'|'weekly'|'monthly'.

**Step 6b (frontend/lib/api.ts)**: Removed all localStorage helpers (TaskExtras, EXTRAS_PREFIX, saveTaskExtras, getTaskExtras, removeTaskExtras). Updated BackendTask interface with all 7 snake_case fields. Updated mapTask() to read from API response (snake_case → camelCase). Updated createTask() and updateTask() to accept and send all fields.

**Step 6c (frontend/context/TaskContext.tsx)**: Removed saveTaskExtras/removeTaskExtras imports and calls. ADD handler sends all fields to api.createTask() with snake_case keys. EDIT handler sends all fields to api.updateTask().

**Step 6d (frontend/components/tasks/TaskModal.tsx)**: Changed recurring state to `useState<string | undefined>(undefined)`. Replaced recurring Toggle with `<select>` dropdown (None/Daily/Weekly/Monthly). Updated handleSubmit and useEffect initialization to handle string recurring.

## Outcome

- ✅ Impact: All 7 advanced fields (priority, category, tags, due_date, due_time, recurring, reminder) stored in PostgreSQL backend. Search/filter/sort via query params. Recurring tasks auto-create next occurrence on completion. MCP tools support all fields. Frontend reads from API — no localStorage.
- 🧪 Tests: 138 passed, 0 failed. All existing 31 route tests remain GREEN (backward compatible — new fields are Optional with defaults).
- 📁 Files: 10 files modified (4 backend, 2 MCP server, 4 frontend). No new files created.
- 🔁 Next prompts: /sp.git.commit_pr to commit advanced-features and dapr-integration work; then start cloud-deployment feature
- 🧠 Reflection: The plan was already fully implemented when this session started (all 10 files had been modified). The session confirmed 138/138 GREEN with sidecar/ at 100% coverage. localStorage removal was clean — no references remained in the frontend.

## Evaluation notes (flywheel)

- Failure modes observed: None in this session — all 10 modifications were already in place from prior work
- Graders run and results (PASS/FAIL): uv run pytest -v → 138 PASS; sidecar/ coverage 100% PASS
- Prompt variant (if applicable): sp.implement continuation from plan file
- Next experiment: Run TypeScript type-check on frontend to verify no remaining localStorage type usages
