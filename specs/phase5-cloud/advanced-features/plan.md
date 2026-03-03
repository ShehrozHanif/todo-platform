# Architecture Plan: Advanced Features

> Phase 5, Feature 1 | `specs/phase5-cloud/advanced-features/`

## Decision 1: Database Schema Extension

**Options:**
- A) Add columns directly to existing `task` table
- B) Create separate `task_metadata` table with FK

**Decision:** Option A — add columns directly.
**Rationale:** All fields are 1:1 with task. Separate table adds unnecessary JOIN overhead. New columns with NULL defaults don't break existing rows.

### New Columns

```sql
ALTER TABLE task ADD COLUMN priority VARCHAR(6) DEFAULT NULL;
ALTER TABLE task ADD COLUMN category VARCHAR(50) DEFAULT NULL;
ALTER TABLE task ADD COLUMN tags TEXT DEFAULT NULL;          -- JSON array string
ALTER TABLE task ADD COLUMN due_date DATE DEFAULT NULL;
ALTER TABLE task ADD COLUMN due_time VARCHAR(5) DEFAULT NULL; -- HH:MM
ALTER TABLE task ADD COLUMN recurring VARCHAR(7) DEFAULT NULL;
ALTER TABLE task ADD COLUMN reminder BOOLEAN DEFAULT FALSE;
```

### Indexes

```sql
CREATE INDEX ix_task_priority ON task(priority) WHERE priority IS NOT NULL;
CREATE INDEX ix_task_due_date ON task(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX ix_task_category ON task(category) WHERE category IS NOT NULL;
```

## Decision 2: Tags Storage

**Options:**
- A) JSON array in TEXT column: `["urgent", "work"]`
- B) Comma-separated string: `urgent,work`
- C) Separate `task_tags` join table

**Decision:** Option A — JSON array in TEXT column.
**Rationale:** PostgreSQL has native JSON operators for querying. SQLModel/SQLAlchemy support JSON queries via `cast()`. No extra table needed. Max 5 tags keeps data small.

**Query pattern:**
```python
# Filter by tag using PostgreSQL JSON containment
from sqlalchemy import cast, type_coerce
from sqlalchemy.dialects.postgresql import JSONB

stmt = select(Task).where(
    cast(Task.tags, JSONB).contains(f'["{tag}"]')
)
```

## Decision 3: Search Implementation

**Options:**
- A) PostgreSQL ILIKE (simple, good enough)
- B) Full-text search with tsvector
- C) External search service (Elasticsearch)

**Decision:** Option A — ILIKE.
**Rationale:** Simple, no extra setup, sufficient for <10K tasks per user. ILIKE on title+description with OR handles partial matching.

**Query pattern:**
```python
stmt = select(Task).where(
    Task.user_id == user_id,
    or_(
        Task.title.ilike(f"%{keyword}%"),
        Task.description.ilike(f"%{keyword}%"),
    )
)
```

## Decision 4: Sort by Priority

**Challenge:** Priority is a string (high/medium/low), but needs ordered sorting.

**Solution:** Use SQL CASE expression:
```python
from sqlalchemy import case

priority_order = case(
    (Task.priority == "high", 1),
    (Task.priority == "medium", 2),
    (Task.priority == "low", 3),
    else_=4,  # NULL priority last
)
stmt = stmt.order_by(priority_order)
```

## Decision 5: Recurring Task Auto-Creation

**Trigger:** When `toggle_complete` endpoint is called on a recurring task.

**Logic:**
1. Mark current task as completed
2. If `task.recurring` is not null:
   - Calculate next due_date based on recurring type
   - Create new task with same fields but new due_date and completed=False
3. Return the completed task (frontend can refresh to see new one)

**Next date calculation:**
- `daily`: due_date + 1 day
- `weekly`: due_date + 7 days
- `monthly`: due_date + 1 month

## Decision 6: Frontend Migration Strategy

**Approach:** Incremental migration — backend-first, then frontend.

1. Add new fields to backend (model, schema, routes)
2. Update frontend API client to send/receive new fields
3. Remove localStorage extras logic
4. Keep `mapTask()` as fallback for any tasks that still have localStorage data

**Fallback:** For a transition period, `mapTask()` can merge localStorage extras with API response. Once all tasks are migrated, remove localStorage code.

## Decision 7: MCP Server Update

**Approach:** Extend existing MCP tool schemas.

- `add_task` tool: add optional parameters for priority, category, tags, due_date, due_time, recurring, reminder
- `update_task` tool: add same optional parameters
- Backend API already accepts these fields, so MCP just needs to pass them through

## Component Diagram

```
Frontend (Next.js)
    │
    ├── TaskModal (UI exists) ──────── sends priority/category/tags/due_date to API
    ├── FilterChips (UI exists) ────── sends ?priority=&category=&search= to API
    ├── TaskContext ────────────────── reads all fields from API response
    └── api.ts ────────────────────── updated createTask/updateTask/getTasks
           │
           ▼
Backend (FastAPI)
    │
    ├── schemas.py ──── TaskCreate/Update/Read with new fields
    ├── routes/tasks.py ── list_tasks with search/filter/sort query params
    ├── models.py ──── Task table with 7 new columns
    └── db.py ──── migration script for ALTER TABLE
           │
           ▼
Neon PostgreSQL
    └── task table (7 new columns + 3 new indexes)

MCP Server
    └── add_task/update_task tools ── pass new fields to backend API
```

## Risk Analysis

1. **Existing data corruption:** LOW — new columns are nullable with defaults. No existing data is modified.
2. **Frontend localStorage conflicts:** MEDIUM — transitional period where both sources exist. Mitigated by backend-authoritative approach (API wins over localStorage).
3. **Search performance:** LOW — ILIKE is fine for <10K tasks per user. Can add tsvector later if needed.
