# Feature Specification: REST API — Task CRUD Endpoints

**Feature Branch**: `002-rest-api`
**Created**: 2026-02-19
**Status**: Clarified
**Input**: Phase II Feature 2 — FastAPI REST endpoints for todo task management

## User Scenarios & Testing

### User Story 1 — List and View My Tasks (Priority: P1)

As a user, I want to retrieve all my tasks and view individual tasks so I can see what I need to do.

**Why this priority**: Read operations are the most frequent; without them the app has no value.

**Independent Test**: Call `GET /api/{user_id}/tasks` and verify the response is a list. Call `GET /api/{user_id}/tasks/{id}` and verify the correct task is returned.

**Acceptance Scenarios**:

1. **Given** a user has 3 tasks, **When** `GET /api/{user_id}/tasks` is called, **Then** all 3 tasks are returned as a JSON array with status 200.
2. **Given** a user has no tasks, **When** `GET /api/{user_id}/tasks` is called, **Then** an empty array `[]` is returned with status 200.
3. **Given** task ID 5 belongs to User A, **When** User B calls `GET /api/{user_b_id}/tasks/5`, **Then** status 404 is returned.

---

### User Story 2 — Create a New Task (Priority: P1)

As a user, I want to create a new task so I can track something I need to do.

**Why this priority**: Without creation, there is nothing to read, update, or delete.

**Independent Test**: `POST /api/{user_id}/tasks` with a title returns 201 with the created task including auto-generated id and timestamps.

**Acceptance Scenarios**:

1. **Given** valid title and description, **When** `POST /api/{user_id}/tasks`, **Then** status 201 with task object including id, completed=false.
2. **Given** an empty title, **When** `POST /api/{user_id}/tasks`, **Then** status 422 with validation error.
3. **Given** title exceeding 200 characters, **When** `POST /api/{user_id}/tasks`, **Then** status 422.

---

### User Story 3 — Update a Task (Priority: P2)

As a user, I want to update a task's title or description.

**Acceptance Scenarios**:

1. **Given** task exists, **When** `PUT /api/{user_id}/tasks/{id}` with new title, **Then** 200 with updated title.
2. **Given** task doesn't exist, **When** `PUT /api/{user_id}/tasks/{id}`, **Then** 404.
3. **Given** empty body, **When** `PUT`, **Then** 200 with unchanged task.

---

### User Story 4 — Delete a Task (Priority: P2)

As a user, I want to delete a task I no longer need.

**Acceptance Scenarios**:

1. **Given** task exists, **When** `DELETE /api/{user_id}/tasks/{id}`, **Then** 204 with no body.
2. **Given** task deleted, **When** `GET /api/{user_id}/tasks/{id}`, **Then** 404.

---

### User Story 5 — Toggle Task Completion (Priority: P2)

As a user, I want to mark a task complete or incomplete.

**Acceptance Scenarios**:

1. **Given** incomplete task, **When** `PATCH /api/{user_id}/tasks/{id}/complete`, **Then** 200 with completed=true.
2. **Given** complete task, **When** `PATCH /api/{user_id}/tasks/{id}/complete`, **Then** 200 with completed=false.

---

## Requirements

### Functional Requirements

- **FR-001**: API MUST expose 6 endpoints: GET list, GET single, POST create, PUT update, DELETE, PATCH toggle-complete.
- **FR-002**: All endpoints MUST be scoped to `{user_id}` — no endpoint returns cross-user data.
- **FR-003**: POST MUST return HTTP 201 on success.
- **FR-004**: DELETE MUST return HTTP 204 with empty body.
- **FR-005**: GET/PUT/PATCH MUST return HTTP 200 with task JSON.
- **FR-006**: Any request for a non-existent task or wrong-user task MUST return 404 with `{"detail": "Task not found"}`.
- **FR-007**: Invalid request bodies MUST return 422 with Pydantic validation errors.
- **FR-008**: API MUST include CORS headers supporting the frontend origin.
- **FR-009**: All endpoints MUST be async and use database dependency injection.
- **FR-010**: Title whitespace MUST be stripped before storage.

### API Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/{user_id}/tasks` | List all user tasks | 200 |
| POST | `/api/{user_id}/tasks` | Create task | 201 |
| GET | `/api/{user_id}/tasks/{task_id}` | Get single task | 200/404 |
| PUT | `/api/{user_id}/tasks/{task_id}` | Update task | 200/404 |
| DELETE | `/api/{user_id}/tasks/{task_id}` | Delete task | 204/404 |
| PATCH | `/api/{user_id}/tasks/{task_id}/complete` | Toggle complete | 200/404 |

## Success Criteria

- **SC-001**: All 6 endpoints return correct HTTP status codes for success and error cases.
- **SC-002**: User isolation is enforced — no endpoint leaks cross-user data.
- **SC-003**: Integration tests cover all 6 endpoints with both happy path and error cases.
- **SC-004**: 90%+ test coverage on routes/tasks.py.
- **SC-005**: All endpoints respond within 500ms under normal load.

## Scope

**In Scope**: 6 CRUD endpoints, request validation, user isolation, CORS config, async engine.
**Out of Scope**: Authentication (Feature 3), pagination, sorting/filtering, rate limiting.
**Dependencies**: Feature 1 (database-schema) complete — models.py, db.py, schemas.py exist.
