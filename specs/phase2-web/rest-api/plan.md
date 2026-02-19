# Implementation Plan: REST API — Task CRUD Endpoints

**Branch**: `002-rest-api` | **Date**: 2026-02-19 | **Spec**: specs/phase2-web/rest-api/spec.md

## Summary

Expose 6 FastAPI async endpoints (`/api/{user_id}/tasks`) that provide full CRUD + toggle-complete for Task records. All endpoints enforce user isolation via `user_id` path parameter and delegate persistence to the SQLModel session from Feature 1.

## Technical Context

**Language/Version**: Python 3.13+
**Primary Dependencies**: FastAPI 0.115+, SQLModel 0.0.22+, httpx (test client)
**Storage**: Neon PostgreSQL via asyncpg (prod) / SQLite aiosqlite (tests)
**Testing**: pytest + pytest-asyncio + httpx AsyncClient
**Target Platform**: Linux server / Docker (Phase IV)
**Performance Goals**: <200ms p95 per endpoint
**Constraints**: User isolation enforced per request — never query without `user_id` filter

## Architecture

### Route Structure

```
backend/
├── routes/
│   ├── __init__.py
│   └── tasks.py          ← 6 route handlers + _get_user_task helper
├── main.py               ← CORS + router mount at /api prefix
└── tests/
    └── test_routes.py    ← httpx AsyncClient integration tests
```

### Key Decisions

1. **`user_id` in path (not JWT)**: Authentication is Feature 3. This feature passes `user_id` as path param — auth layer will validate it later.
2. **`_get_user_task` helper**: DRY 404 enforcement for GET/PUT/DELETE/PATCH.
3. **PUT semantics**: Partial update — `None` values keep existing field, only provided fields update.
4. **PATCH for toggle**: Semantic clarity — toggles completed boolean, doesn't accept body.

## Endpoints Contract

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/{user_id}/tasks` | — | `List[TaskRead]` 200 |
| POST | `/api/{user_id}/tasks` | `TaskCreate` | `TaskRead` 201 |
| GET | `/api/{user_id}/tasks/{task_id}` | — | `TaskRead` 200/404 |
| PUT | `/api/{user_id}/tasks/{task_id}` | `TaskUpdate` | `TaskRead` 200/404 |
| DELETE | `/api/{user_id}/tasks/{task_id}` | — | 204 |
| PATCH | `/api/{user_id}/tasks/{task_id}/complete` | — | `TaskRead` 200/404 |

## Error Taxonomy

| Code | When |
|------|------|
| 200 | Successful GET/PUT/PATCH |
| 201 | Successful POST |
| 204 | Successful DELETE |
| 404 | Task not found or wrong user |
| 422 | Pydantic validation failure (bad body) |
| 500 | Unhandled server error |
