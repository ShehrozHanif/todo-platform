# Tasks: Advanced Features

> Phase 5, Feature 1 | `specs/phase5-cloud/advanced-features/`

## T001: Add new columns to Task model

**Spec:** FR-001 to FR-006 | **Plan:** Decision 1, 2
**File:** `backend/models.py`

**Work:**
- Add to Task class: `priority`, `category`, `tags`, `due_date`, `due_time`, `recurring`, `reminder`
- priority: Optional[str], max_length=6
- category: Optional[str], max_length=50
- tags: Optional[str] (JSON array string)
- due_date: Optional[date]
- due_time: Optional[str], max_length=5
- recurring: Optional[str], max_length=7
- reminder: bool, default=False
- Add indexes on priority, due_date, category

**Acceptance:** Task model has 7 new fields. App starts without error.

---

## T002: Create database migration script

**Spec:** NFR-003 | **Plan:** Decision 1
**File:** `backend/migrate_advanced.py`

**Work:**
- Create migration script that runs ALTER TABLE ADD COLUMN for each new field
- Add partial indexes (WHERE NOT NULL) for priority, due_date, category
- Make idempotent (check if column exists before adding)
- Run against Neon DB

**Acceptance:** Migration runs successfully. Existing tasks unchanged. New columns visible in DB.

---

## T003: Extend backend schemas

**Spec:** FR-010 | **Plan:** Decision 1
**File:** `backend/schemas.py`

**Work:**
- Extend `TaskCreate`: add priority, category, tags, due_date, due_time, recurring, reminder (all optional)
- Extend `TaskUpdate`: add same fields (all optional)
- Extend `TaskRead`: add same fields in response
- Add validators:
  - priority: must be high/medium/low or null
  - tags: JSON array, max 5 items, each max 30 chars
  - due_time: format HH:MM
  - recurring: must be daily/weekly/monthly or null

**Acceptance:** Schemas validate correctly. Invalid values rejected with 422.

---

## T004: Update create/update task routes

**Spec:** FR-001 to FR-006, FR-010 | **Plan:** Decision 1
**File:** `backend/routes/tasks.py`

**Work:**
- `create_task`: pass new fields from TaskCreate to Task model
- `update_task`: apply new fields from TaskUpdate (only non-None values)
- Response includes all new fields via TaskRead

**Acceptance:** POST creates task with priority/category/tags/etc. PUT updates them. GET returns them.

---

## T005: Add search/filter/sort to list_tasks

**Spec:** FR-007, FR-008, FR-009 | **Plan:** Decisions 3, 4
**File:** `backend/routes/tasks.py`

**Work:**
- Add query parameters to `list_tasks`: search, priority, category, tags, completed, due_date_from, due_date_to, sort, order
- Search: ILIKE on title + description
- Filter: WHERE clauses for each filter parameter
- Sort: ORDER BY with CASE for priority, direct for other fields
- Order: asc (default) or desc
- All parameters optional, combinable

**Acceptance:**
- `?search=meeting` returns tasks with "meeting" in title/description
- `?priority=high` returns only high priority tasks
- `?sort=due_date&order=asc` returns tasks sorted by due date

---

## T006: Implement recurring task auto-creation

**Spec:** FR-005 | **Plan:** Decision 5
**File:** `backend/routes/tasks.py`

**Work:**
- In `toggle_complete`: after marking task complete, check if `task.recurring` is set
- If recurring, calculate next due_date:
  - daily: +1 day
  - weekly: +7 days
  - monthly: +1 month (use dateutil or manual)
- Create new Task with same fields but new due_date, completed=False
- Return completed task in response

**Acceptance:** Complete a recurring daily task with due_date 2026-03-03 → new task created with due_date 2026-03-04.

---

## T007: Update frontend API client

**Spec:** FR-011 | **Plan:** Decision 6
**File:** `frontend/lib/api.ts`

**Work:**
- Update `createTask()` to send priority, category, tags, due_date, due_time, recurring, reminder
- Update `updateTask()` to send new fields
- Update `getTasks()` to accept search/filter/sort query parameters
- Update Task type in `frontend/lib/types.ts` to include new fields
- Response now contains all fields — no need for localStorage merge

**Acceptance:** Frontend creates task with priority=high → backend returns task with priority=high → displayed correctly.

---

## T008: Remove localStorage task extras

**Spec:** FR-011 | **Plan:** Decision 6
**File:** `frontend/lib/api.ts`, `frontend/context/TaskContext.tsx`

**Work:**
- Remove `saveTaskExtras()` and `getTaskExtras()` functions
- Remove `mapTask()` localStorage merge logic
- Task data comes entirely from API response
- Keep TaskModal UI as-is (it already has the inputs)
- Wire TaskModal save to call API with all fields

**Acceptance:** Priority, category, due_date persist across page refresh (from DB, not localStorage). No localStorage entries for task extras.

---

## T009: Add search/filter UI to frontend

**Spec:** FR-007, FR-008, FR-009 | **Plan:** Decision 6
**File:** `frontend/components/tasks/` (new/existing components)

**Work:**
- Add search input to task list page (debounced, calls API with ?search=)
- Update FilterChips to send filter params to API instead of client-side filtering
- Add sort dropdown (Due Date, Priority, Created, Title)
- All filter/sort state passed as query params to getTasks()

**Acceptance:** Search input filters tasks from backend. Sort dropdown changes task order from backend.

---

## T010: Update MCP server tools

**Spec:** FR-012 | **Plan:** Decision 7
**File:** `agents/mcp-server/server.py`

**Work:**
- Extend `add_task` tool schema: add optional priority, category, tags, due_date, due_time, recurring, reminder parameters
- Extend `update_task` tool schema: add same optional parameters
- Pass new fields in POST/PUT request body to backend API
- Update tool descriptions so AI knows about new capabilities

**Acceptance:** Chat "Add a high priority work task due tomorrow" → task created with priority=high, category=work, due_date=tomorrow.

---

## Dependency Order

```
T001 (model) → T002 (migration) → T003 (schemas) → T004 (routes) → T005 (search/filter)
                                                        ↓
                                                    T006 (recurring)
                                                        ↓
                                              T007 (frontend API) → T008 (remove localStorage) → T009 (search UI)
                                                        ↓
                                                    T010 (MCP tools)
```
