# Tasks: Authentication — Better Auth + JWT

**Branch**: `003-authentication` | **Date**: 2026-02-19
**Prerequisites**: Feature 1 + Feature 2 complete ✅

## Phase 1: Backend JWT Middleware

- [ ] T001 Create `backend/middleware/__init__.py`
- [ ] T002 Create `backend/middleware/auth.py` — `_extract_bearer_token`, `_decode_token`, `get_current_user`, `verify_user_access`
- [ ] T003 Write `backend/tests/test_auth.py` — 14 tests (extraction, decode, integration)
- [ ] T004 Run `uv run pytest tests/test_auth.py -v` — all pass

## Phase 2: Protect Existing Routes

- [ ] T005 Update `backend/routes/tasks.py` — add `Depends(verify_user_access)` to all 6 handlers
- [ ] T006 Update `backend/tests/conftest.py` — add `auth_headers` fixture + `create_test_token` helper
- [ ] T007 Update `backend/tests/test_routes.py` — add `auth_headers` to all requests
- [ ] T008 Run `uv run pytest -v` — all 38+ tests pass

## Phase 3: Frontend Better Auth Setup

- [ ] T009 Install `better-auth` in `frontend/`
- [ ] T010 Create `frontend/lib/auth.ts` — Better Auth server config with JWT plugin
- [ ] T011 Create `frontend/lib/auth-client.ts` — auth client for components
- [ ] T012 Create `frontend/app/api/auth/[...all]/route.ts` — catch-all handler
- [ ] T013 Create `frontend/.env.local.example` with BETTER_AUTH_SECRET placeholder

**Checkpoint**: All tests pass, frontend auth config in place
