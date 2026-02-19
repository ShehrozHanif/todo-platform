# Tasks: Neon Database Schema

**Input**: Design documents from `/specs/phase2-web/database-schema/`
**Prerequisites**: spec.md ✅, research.md ✅, data-model.md ✅, contracts/db-operations.md ✅, quickstart.md ✅
**Branch**: `001-neon-database-schema`
**Date**: 2026-02-19

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure

- [ ] T001 Create `backend/` directory with `pyproject.toml` — UV project with fastapi, uvicorn, sqlmodel, asyncpg, python-dotenv, pydantic-settings
- [ ] T002 [P] Create `backend/.env.example` with `DATABASE_URL` template
- [ ] T003 [P] Create `backend/.gitignore` to exclude `.env`, `__pycache__`, `.pytest_cache`, `.venv`
- [ ] T004 Create `backend/tests/` directory with empty `__init__.py`

**Checkpoint**: Project structure initialized — uv install runs clean

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DB models and engine that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create `backend/models.py` — User SQLModel table (id: str PK, email: str UNIQUE, name: str, created_at: datetime with server default)
- [ ] T006 Create `backend/models.py` — Task SQLModel table (id: int PK auto, user_id: str FK→user.id CASCADE, title: str max 200, description: str|None max 1000, completed: bool default false, created_at: datetime server default, updated_at: datetime server default + onupdate)
- [ ] T007 Add Pydantic `field_validator` to Task model enforcing non-empty title
- [ ] T008 Create `backend/db.py` — async engine with `postgresql+asyncpg://` + pool settings (pool_pre_ping, pool_size=5, max_overflow=10, pool_recycle=300)
- [ ] T009 Create `backend/db.py` — `get_session` async generator for FastAPI DI
- [ ] T010 Create `backend/db.py` — `lifespan` context manager that calls `SQLModel.metadata.create_all` on startup and disposes engine on shutdown
- [ ] T011 Create `backend/main.py` — minimal FastAPI app wiring in `lifespan`
- [ ] T012 Create `backend/tests/conftest.py` — async SQLite in-memory engine, override `get_session`, pytest-asyncio fixtures

**Checkpoint**: Models + DB engine complete — test fixtures load without errors

---

## Phase 3: User Story 1 — Store and Retrieve Tasks Per User (P1) 🎯 MVP

**Goal**: Tasks are persisted and retrievable by user across sessions
**Independent Test**: Insert task, reset connection, confirm task still exists and is returned by user filter

### Tests for User Story 1

> **Write tests FIRST — ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Write test in `backend/tests/test_models.py`: create User + Task, assert id/timestamps auto-populated (SC-003)
- [ ] T014 [P] [US1] Write test in `backend/tests/test_models.py`: create two tasks for same user, query by user_id, assert only those tasks returned (FR-007, SC-002)

### Implementation for User Story 1

- [ ] T015 [US1] Verify `backend/models.py` User table correctly stores id/email/name/created_at (FR-012, FR-013)
- [ ] T016 [US1] Verify `backend/models.py` Task table correctly stores all fields with defaults (FR-002, FR-004, FR-005)
- [ ] T017 [US1] Confirm indexes defined: `user_id` index + `completed` index on Task (spec data-model.md)

**Checkpoint**: US1 tests pass — tasks stored and retrieved per user correctly

---

## Phase 4: User Story 2 — Manage Task Lifecycle (P1)

**Goal**: Create, update, complete, and delete tasks persist correctly
**Independent Test**: Create task → update title → toggle complete → delete → confirm each step persists

### Tests for User Story 2

- [ ] T018 [P] [US2] Write test: create task, update title + description, assert updated values persisted and `updated_at` changed (FR-008, FR-006)
- [ ] T019 [P] [US2] Write test: create task (completed=false), toggle to true, assert persisted (FR-008)
- [ ] T020 [P] [US2] Write test: create task, delete it, assert no longer retrievable (FR-009)

### Implementation for User Story 2

- [ ] T021 [US2] Confirm `updated_at` uses `onupdate=func.now()` in Task model (FR-006)
- [ ] T022 [US2] Confirm `completed` field defaults to `false` and is persisted correctly (FR-004)

**Checkpoint**: US2 tests pass — full CRUD lifecycle verified

---

## Phase 5: User Story 3 — User Isolation (P2)

**Goal**: One user cannot see another user's tasks
**Independent Test**: Create tasks for User A and User B, query by User A's id, assert User B's tasks absent

### Tests for User Story 3

- [ ] T023 [P] [US3] Write test: create User A + User B each with tasks, query by User A id, assert User B tasks not returned (FR-010, SC-002)
- [ ] T024 [P] [US3] Write test: query for task by User B's id when task belongs to User A, assert not found (FR-010)
- [ ] T025 [P] [US3] Write test: attempt task creation without user_id (violate FK), assert DB error raised (FR-014)

### Implementation for User Story 3

- [ ] T026 [US3] Confirm FK constraint `user_id → user.id` with CASCADE delete in Task model (FR-014)
- [ ] T027 [US3] Confirm UNIQUE constraint on User.email at DB level (FR-013)

**Checkpoint**: US3 tests pass — user isolation enforced at DB level

---

## Phase 6: User Story 4 — Automatic Timestamping (P3)

**Goal**: created_at and updated_at are auto-populated without manual input
**Independent Test**: Create task, assert created_at is set; update task, assert updated_at changes; read task, assert timestamps unchanged

### Tests for User Story 4

- [ ] T028 [P] [US4] Write test: create task, assert created_at auto-set within 2s of current time (SC-003)
- [ ] T029 [P] [US4] Write test: update task, assert updated_at differs from created_at (SC-003)
- [ ] T030 [P] [US4] Write test: read task without modifying, assert timestamps unchanged

### Implementation for User Story 4

- [ ] T031 [US4] Confirm `created_at` uses `sa_column(Column(DateTime(timezone=True), server_default=func.now()))` (FR-005)
- [ ] T032 [US4] Confirm `updated_at` uses `sa_column(Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now()))` (FR-006)

**Checkpoint**: US4 tests pass — all timestamps auto-managed

---

## Phase 7: Edge Cases & Validation

**Purpose**: Enforce constraints defined in spec edge cases

- [ ] T033 [P] Write test: create task with empty title, assert validation error raised (FR-011)
- [ ] T034 [P] Write test: create task with title > 200 chars, assert validation error raised (FR-011)
- [ ] T035 [P] Write test: create task with description > 1000 chars, assert validation error raised
- [ ] T036 [P] Write test: create task with user_id referencing non-existent user, assert FK violation (FR-014)

**Checkpoint**: All edge case tests pass

---

## Phase 8: Polish & Verification

**Purpose**: Coverage, cleanup, quickstart validation

- [ ] T037 Run `uv run pytest --cov=backend --cov-report=term-missing` — assert 90%+ coverage on models.py + db.py (SC-005)
- [ ] T038 [P] Verify all Python functions have type hints (Constitution §V)
- [ ] T039 [P] Confirm no secrets hardcoded — `.env` pattern only (Constitution §V)
- [ ] T040 Add task-spec comment header to `backend/models.py` and `backend/db.py`: `# [Task]: T005-T010 [From]: specs/phase2-web/database-schema/spec.md`

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: Start immediately, all can run in parallel
- **Phase 2 (Foundation)**: Depends on Phase 1 — blocks all phases 3-7
- **Phases 3-6 (User Stories)**: All depend on Phase 2 completion; test tasks within each phase can run in parallel
- **Phase 7 (Edge Cases)**: Depends on Phase 2 — can run in parallel with phases 3-6
- **Phase 8 (Polish)**: Depends on all previous phases

### Within Each User Story
1. Write tests FIRST (let them FAIL)
2. Implement to make tests GREEN
3. Refactor if needed
