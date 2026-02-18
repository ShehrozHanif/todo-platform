---
name: better-auth-jwt-generator
description: |
  Generate Better Auth configuration with JWT plugin for Next.js frontends and JWT verification
  middleware for FastAPI backends. This skill should be used when users ask to add authentication,
  JWT tokens, user login/signup, or protect API routes with Better Auth.
---

# Better Auth JWT Generator

Generate a **complete cross-stack authentication layer** using Better Auth (Next.js) + JWT verification (FastAPI). Encodes the full auth flow: user signup/signin on frontend, JWT token issuance, Bearer token transmission, backend verification, and user isolation enforcement.

## What This Skill Does

- Configures Better Auth with JWT plugin in Next.js frontend
- Creates auth API route handler (catch-all [...all] route)
- Generates auth client for frontend components (signin/signup/signout/session)
- Produces FastAPI JWT verification dependency with PyJWT
- Enforces user isolation: token user_id must match URL {user_id}
- Provides test patterns with mock JWT token helpers

## What This Skill Does NOT Do

- Create database models (see `neon-sqlmodel-generator`)
- Create API CRUD endpoints (see `fastapi-crud-generator`)
- Build login/signup UI pages (see `nextjs-todo-ui-generator`)
- Manage OAuth providers (Google, GitHub, etc.)
- Handle token refresh rotation (Better Auth handles sessions)

---

## Before Implementation

Gather context to ensure successful implementation:

| Source | Gather |
|--------|--------|
| **Codebase** | Existing `backend/routes/tasks.py`, `backend/db.py`, `frontend/` structure |
| **Conversation** | User's auth requirements, token expiry preferences |
| **Skill References** | Better Auth patterns from `references/better-auth-setup.md`, JWT patterns from `references/jwt-middleware.md` |
| **User Guidelines** | Project constitution, AGENTS.md conventions, task IDs |

**Prerequisites:** `neon-sqlmodel-generator` + `fastapi-crud-generator` must be completed first.

---

## Auth Flow (End-to-End)

```
1. User visits /login or /signup on Next.js frontend
2. Better Auth handles credentials → creates session + issues JWT
3. Frontend stores JWT (httpOnly cookie or memory)
4. Frontend API calls include: Authorization: Bearer <token>
5. FastAPI middleware extracts Bearer token from header
6. Middleware decodes JWT with BETTER_AUTH_SECRET (PyJWT)
7. Middleware validates: token.sub == URL {user_id}
8. Route handler executes with verified user context
9. Response filtered to authenticated user's data only
```

---

## Implementation Steps

Execute in this exact order. Write tests FIRST (RED), then implementation (GREEN).

### Phase 1: Backend JWT Middleware (RED → GREEN)

1. Add `pyjwt` dependency to `backend/pyproject.toml`
2. Write tests in `backend/tests/test_auth.py` — see [templates/test-patterns.md](templates/test-patterns.md)
   - Valid token passes, missing token 401, invalid token 401
   - Expired token 401, mismatched user_id 403
   - ~15 auth tests
3. Create `backend/middleware/__init__.py`
4. Implement `backend/middleware/auth.py` — see [templates/jwt-middleware.md](templates/jwt-middleware.md)
5. Run `uv run pytest -v` — verify all auth tests pass

### Phase 2: Protect Existing Routes

1. Update `backend/routes/tasks.py` — add `Depends(get_current_user)` to all handlers
2. Update route tests to include valid JWT headers
3. Run `uv run pytest -v` — verify all route + auth tests pass

### Phase 3: Frontend Better Auth Setup

1. Install: `npm install better-auth`
2. Create `frontend/lib/auth.ts` — see [templates/better-auth-server.md](templates/better-auth-server.md)
3. Create `frontend/lib/auth-client.ts` — see [templates/better-auth-client.md](templates/better-auth-client.md)
4. Create `frontend/app/api/auth/[...all]/route.ts` — see [templates/auth-route-handler.md](templates/auth-route-handler.md)
5. Create environment files — see [templates/env-setup.md](templates/env-setup.md)

### Phase 4: Final Verification

1. Run `uv run pytest --cov=backend --cov-report=term-missing`
2. Verify 90%+ coverage on middleware/auth.py
3. Verify all existing route tests still pass with auth headers
4. Verify frontend builds without errors

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JWT library (backend) | PyJWT | Lightweight, well-maintained, sync decode is fine for middleware |
| Token transport | Authorization: Bearer header | Standard HTTP auth; works with any client |
| Token verification | Shared BETTER_AUTH_SECRET | Stateless; backend verifies independently |
| User ID claim | `sub` field in JWT payload | JWT standard for subject identifier |
| Mismatch response | 403 Forbidden (not 404) | User is authenticated but accessing wrong resource |
| Missing/invalid token | 401 Unauthorized | Standard HTTP auth failure code |
| Health check | No auth required | Public endpoint for monitoring |
| Test tokens | PyJWT encode with test secret | Deterministic, no Better Auth dependency in tests |

---

## Critical Invariants

- `BETTER_AUTH_SECRET` must be identical in frontend and backend `.env`
- Backend NEVER imports from `better-auth` (Python-only: uses PyJWT)
- Frontend NEVER verifies JWTs (only sends them)
- All `/api/{user_id}/*` routes require valid JWT via `Depends(get_current_user)`
- `/health` endpoint has NO auth dependency
- Token `sub` claim must match URL `{user_id}` — enforced in middleware
- Expired tokens return 401 (not 403)
- Tests use `create_test_token()` helper — never depend on Better Auth server

---

## Output Specification

| File | Stack | Purpose | Template |
|------|-------|---------|----------|
| `backend/middleware/__init__.py` | Python | Package marker | Empty with exports |
| `backend/middleware/auth.py` | Python | JWT verification dependency | [templates/jwt-middleware.md](templates/jwt-middleware.md) |
| `backend/tests/test_auth.py` | Python | Auth middleware tests | [templates/test-patterns.md](templates/test-patterns.md) |
| `frontend/lib/auth.ts` | TypeScript | Better Auth server config | [templates/better-auth-server.md](templates/better-auth-server.md) |
| `frontend/lib/auth-client.ts` | TypeScript | Better Auth client | [templates/better-auth-client.md](templates/better-auth-client.md) |
| `frontend/app/api/auth/[...all]/route.ts` | TypeScript | Auth API catch-all | [templates/auth-route-handler.md](templates/auth-route-handler.md) |
| `frontend/.env.local` / `backend/.env` | Config | Shared secrets | [templates/env-setup.md](templates/env-setup.md) |

---

## Domain Standards

### Must Follow
- [ ] JWT decoded with `algorithms=["HS256"]` explicitly (prevent algorithm confusion)
- [ ] `BETTER_AUTH_SECRET` from env var, never hardcoded
- [ ] `sub` claim used for user ID (JWT standard)
- [ ] 401 for missing/invalid/expired tokens
- [ ] 403 for valid token but wrong user_id
- [ ] All task routes protected; health check public
- [ ] PyJWT `options={"require": ["exp", "sub"]}` to enforce required claims

### Must Avoid
- Hardcoding secrets in source code
- Using `algorithms=["none"]` or not specifying algorithms
- Catching `jwt.DecodeError` too broadly (separate expired vs invalid)
- Storing JWT in localStorage (use httpOnly cookies or memory)
- Verifying JWTs on the frontend (only backend verifies)
- Importing better-auth in Python backend

---

## Output Checklist

Before delivering, verify:
- [ ] `backend/middleware/auth.py` — get_current_user dependency with PyJWT
- [ ] `backend/tests/test_auth.py` — 15+ tests (valid, missing, invalid, expired, mismatch)
- [ ] `frontend/lib/auth.ts` — Better Auth config with JWT plugin
- [ ] `frontend/lib/auth-client.ts` — createAuthClient export
- [ ] `frontend/app/api/auth/[...all]/route.ts` — catch-all handler
- [ ] Environment files with BETTER_AUTH_SECRET placeholder
- [ ] All existing route tests updated with auth headers
- [ ] Coverage ≥ 90% on middleware/auth.py
- [ ] No hardcoded secrets anywhere
- [ ] Every file has Task ID comment referencing specs

---

## Reference Files

| File | When to Read |
|------|--------------|
| `references/better-auth-setup.md` | Better Auth config, JWT plugin, session management |
| `references/jwt-middleware.md` | PyJWT decode patterns, claim validation, error handling |
| `templates/jwt-middleware.md` | Exact backend middleware code template |
| `templates/better-auth-server.md` | Exact frontend auth.ts code template |
| `templates/better-auth-client.md` | Exact frontend auth-client.ts code template |
| `templates/auth-route-handler.md` | Exact catch-all route code template |
| `templates/env-setup.md` | Environment variable templates |
| `templates/test-patterns.md` | Auth test examples with mock token helper |
