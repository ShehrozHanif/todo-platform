# Feature Specification: Authentication — Better Auth + JWT

**Feature Branch**: `003-authentication`
**Created**: 2026-02-19
**Status**: Clarified
**Input**: Phase II Feature 3 — Better Auth (Next.js) + JWT verification (FastAPI)

## User Scenarios & Testing

### User Story 1 — User Signup and Signin (Priority: P1)

As a new user, I want to create an account with email/password and sign in so I can access my tasks.

**Acceptance Scenarios**:
1. **Given** a valid email and password, **When** POST to `/api/auth/sign-up/email`, **Then** account created and JWT token returned.
2. **Given** existing credentials, **When** POST to `/api/auth/sign-in/email`, **Then** JWT token returned.
3. **Given** wrong password, **When** signin attempted, **Then** 401 error returned.

---

### User Story 2 — Protected Routes Require Valid JWT (Priority: P1)

As the system, I want all task API endpoints to require a valid JWT token so only authenticated users can access tasks.

**Acceptance Scenarios**:
1. **Given** a valid JWT for User A, **When** accessing `/api/{user_A_id}/tasks`, **Then** 200 with tasks.
2. **Given** no Authorization header, **When** accessing any task route, **Then** 401 returned.
3. **Given** User A's JWT, **When** accessing `/api/{user_B_id}/tasks`, **Then** 403 returned.
4. **Given** an expired JWT, **When** accessing any task route, **Then** 401 returned.

---

### User Story 3 — User Isolation via JWT (Priority: P2)

As the system, I want the JWT's `sub` claim to be verified against the URL `{user_id}` so users can only access their own data.

**Acceptance Scenarios**:
1. **Given** JWT with `sub="user-1"`, **When** accessing `/api/user-1/tasks`, **Then** authorized.
2. **Given** JWT with `sub="user-1"`, **When** accessing `/api/user-2/tasks`, **Then** 403 Forbidden.

---

## Requirements

- **FR-001**: System MUST verify Bearer tokens on all task API endpoints.
- **FR-002**: Missing or malformed Authorization header MUST return 401.
- **FR-003**: Invalid or expired JWT MUST return 401 with descriptive message.
- **FR-004**: JWT `sub` claim MUST match URL `{user_id}` — mismatch returns 403.
- **FR-005**: Health check endpoint (`/health`) MUST be publicly accessible (no auth).
- **FR-006**: JWT secret (`BETTER_AUTH_SECRET`) MUST come from environment variable — never hardcoded.
- **FR-007**: Better Auth with JWT plugin MUST be configured in Next.js frontend.
- **FR-008**: JWTs MUST be signed with HS256 algorithm.
- **FR-009**: JWTs MUST include `sub` and `exp` claims.

## Success Criteria

- **SC-001**: 14+ auth tests covering valid, missing, invalid, expired, mismatch scenarios.
- **SC-002**: 90%+ coverage on `backend/middleware/auth.py`.
- **SC-003**: All existing route tests pass with auth headers.
- **SC-004**: No secrets hardcoded anywhere in source code.
- **SC-005**: `/health` endpoint returns 200 without any Authorization header.

## Scope

**In Scope**: JWT middleware, Better Auth server config, Better Auth client, auth route handler.
**Out of Scope**: OAuth providers, token refresh rotation, user management UI, rate limiting.
**Dependencies**: Feature 1 (database-schema) + Feature 2 (REST API) complete.
