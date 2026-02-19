# Tasks: REST API — Task CRUD Endpoints

**Branch**: `002-rest-api` | **Date**: 2026-02-19
**Prerequisites**: Feature 1 (database-schema) complete ✅

## Phase 1: Setup

- [ ] T001 Update `backend/schemas.py` — add `TaskRead` response schema with timestamps
- [ ] T002 Create `backend/routes/__init__.py`
- [ ] T003 Update `backend/main.py` — add CORS middleware + mount tasks router at `/api`

## Phase 2: Route Implementation

- [ ] T004 Create `backend/routes/tasks.py` — `GET /api/{user_id}/tasks` (list tasks)
- [ ] T005 [P] Create route `POST /api/{user_id}/tasks` (create task, 201)
- [ ] T006 [P] Create route `GET /api/{user_id}/tasks/{task_id}` (get single, 200/404)
- [ ] T007 Create route `PUT /api/{user_id}/tasks/{task_id}` (update, 200/404)
- [ ] T008 Create route `DELETE /api/{user_id}/tasks/{task_id}` (delete, 204/404)
- [ ] T009 Create route `PATCH /api/{user_id}/tasks/{task_id}/complete` (toggle, 200/404)
- [ ] T010 Add `_get_user_task` helper with 404 enforcement

**Checkpoint**: Server starts, routes register, `/health` returns 200

## Phase 3: Tests

- [ ] T011 Add `client` + `seed_user` + `seed_task` fixtures to `backend/tests/conftest.py`
- [ ] T012 [P] Write `backend/tests/test_routes.py` — TestListTasks (3 tests)
- [ ] T013 [P] Write TestCreateTask (6 tests: create, title only, strip whitespace, 422 cases)
- [ ] T014 [P] Write TestGetTask (3 tests: found, 404, cross-user 404)
- [ ] T015 Write TestUpdateTask (5 tests)
- [ ] T016 Write TestDeleteTask (3 tests: 204, verify gone, 404)
- [ ] T017 Write TestToggleComplete (3 tests: on, off, 404)
- [ ] T018 Write TestHealthCheck (1 test)

**Checkpoint**: All 24 route tests pass — run `uv run pytest tests/test_routes.py -v`
