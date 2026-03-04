# Feature Spec: Advanced Features

> Phase 5, Feature 1 | `specs/phase5-cloud/advanced-features/`

## Overview

Migrate task metadata (priority, category, tags, due_date, due_time, recurring, reminder) from frontend localStorage to the backend database, and add search, filter, and sort capabilities to the API. The frontend UI already supports these fields via localStorage — this feature makes them persistent, server-authoritative, and queryable.

## Current State

- **Backend Task model**: `id`, `user_id`, `title`, `description`, `completed`, `created_at`, `updated_at` — no priority/tags/category/due_date fields
- **Backend schemas**: `TaskCreate` accepts title+description only; `TaskRead` returns same
- **Backend routes**: 6 CRUD endpoints, no search/filter/sort
- **Frontend UI**: Full priority picker, category picker, due_date/due_time inputs, recurring/reminder toggles — all stored in localStorage via `saveTaskExtras()`/`getTaskExtras()`
- **MCP Server**: `add_task` tool sends title+description only; `update_task` sends title+description+completed only

## Functional Requirements

### FR-001: Priority Field
- Add `priority` column to Task table: `Optional[str]`, allowed values: `high`, `medium`, `low`, `null`
- Default: `null` (no priority set)
- Indexed for filter queries

### FR-002: Category Field
- Add `category` column to Task table: `Optional[str]`, max 50 characters
- Free-text (e.g., "work", "personal", "study", "health")
- Default: `null`

### FR-003: Tags Field
- Add `tags` column to Task table: `Optional[str]`, stored as JSON array string
- Example: `["urgent", "meeting", "review"]`
- Max 5 tags per task, each tag max 30 characters
- Default: `null`

### FR-004: Due Date & Due Time
- Add `due_date` column: `Optional[date]`
- Add `due_time` column: `Optional[str]`, format `HH:MM` (24-hour)
- Default: `null` for both

### FR-005: Recurring Tasks
- Add `recurring` column: `Optional[str]`, allowed values: `daily`, `weekly`, `monthly`, `null`
- Default: `null`
- When a recurring task is marked complete, the system should auto-create the next occurrence

### FR-006: Reminders
- Add `reminder` column: `Optional[bool]`, default `false`
- Indicates user wants to be reminded before due_date

### FR-007: Search
- `GET /{user_id}/tasks?search=keyword` — search by title and description (case-insensitive, partial match)

### FR-008: Filter
- `GET /{user_id}/tasks?priority=high` — filter by priority
- `GET /{user_id}/tasks?category=work` — filter by category
- `GET /{user_id}/tasks?completed=true` — filter by completion status
- `GET /{user_id}/tasks?tags=urgent` — filter tasks containing a specific tag
- `GET /{user_id}/tasks?due_date_from=2026-03-01&due_date_to=2026-03-31` — date range filter
- Multiple filters can be combined

### FR-009: Sort
- `GET /{user_id}/tasks?sort=due_date` — sort by due_date ascending
- `GET /{user_id}/tasks?sort=priority` — sort by priority (high > medium > low > null)
- `GET /{user_id}/tasks?sort=created_at` — sort by creation date
- `GET /{user_id}/tasks?sort=title` — alphabetical sort
- `GET /{user_id}/tasks?order=desc` — descending order (default: asc)

### FR-010: Schema Updates
- Extend `TaskCreate` to accept: priority, category, tags, due_date, due_time, recurring, reminder
- Extend `TaskUpdate` to accept same fields
- Extend `TaskRead` to return all new fields
- All new fields are optional (backward-compatible)

### FR-011: Frontend Migration
- Remove localStorage-based `saveTaskExtras()`/`getTaskExtras()` for task metadata
- Send priority, category, tags, due_date, due_time, recurring, reminder to backend API on create/update
- Read these fields from API response instead of localStorage
- Existing frontend UI (TaskModal, FilterChips, TaskRow) should work with backend data

### FR-012: MCP Server Update
- Update `add_task` MCP tool to accept and pass priority, category, tags, due_date, due_time, recurring, reminder
- Update `update_task` MCP tool to accept and pass new fields
- AI chatbot can set task metadata via natural language (e.g., "Add a high priority work task due tomorrow at 9am")

## Non-Functional Requirements

### NFR-001: Backward Compatibility
- All new fields are optional with sensible defaults
- Existing tasks without new fields continue to work
- No breaking changes to existing API contracts

### NFR-002: Performance
- Search queries use ILIKE with proper indexing
- Filter/sort operations handled at database level, not in Python
- List endpoint with filters responds in <500ms for 1000 tasks

### NFR-003: Database Migration
- Use ALTER TABLE to add new columns (not recreate table)
- Existing data is preserved — new columns default to NULL/false
- Migration is idempotent (safe to run multiple times)

## Acceptance Criteria

- [ ] AC-01: Task table has priority, category, tags, due_date, due_time, recurring, reminder columns
- [ ] AC-02: POST create task with all new fields → fields persisted in DB and returned in response
- [ ] AC-03: PUT update task with new fields → fields updated in DB and returned
- [ ] AC-04: GET list tasks returns all new fields in response
- [ ] AC-05: Search by keyword returns matching tasks (case-insensitive)
- [ ] AC-06: Filter by priority, category, tags, completed, date range works correctly
- [ ] AC-07: Sort by due_date, priority, created_at, title works correctly
- [ ] AC-08: Frontend creates/updates tasks via API (no localStorage for these fields)
- [ ] AC-09: Existing tasks without new fields display correctly (nulls handled)
- [ ] AC-10: MCP add_task/update_task tools pass new fields to backend
- [ ] AC-11: Recurring task auto-creates next occurrence when marked complete

## Out of Scope

- Push notifications / browser notifications (future)
- Real-time WebSocket updates (Feature 2: Kafka)
- Email reminders (future)
- Pagination (optimize later if needed)

## Dependencies

- Neon DB (existing, just adding columns)
- Frontend TaskModal UI (exists, needs API wiring)
- MCP Server tools (exist, need field extensions)
