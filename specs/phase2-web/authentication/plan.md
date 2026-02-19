# Implementation Plan: Authentication — Better Auth + JWT

**Branch**: `003-authentication` | **Date**: 2026-02-19 | **Spec**: specs/phase2-web/authentication/spec.md

## Summary

Implement JWT-based authentication using Better Auth (Next.js frontend) for user management and a custom HS256 JWT middleware (FastAPI backend) for route protection. A bridging `/api/token` endpoint in Next.js converts Better Auth sessions into HS256 JWTs that the backend can verify.

## Technical Context

**Frontend**: Next.js 16+ with Better Auth v1.4+, `pg` (node-postgres), `jose` (JWT signing)
**Backend**: FastAPI with PyJWT for HS256 verification
**Shared Secret**: `BETTER_AUTH_SECRET` environment variable (same value in both .env files)
**Algorithm**: HS256 (symmetric)
**Token Lifetime**: 7 days

## Architecture

### Authentication Flow

```
1. User signs up/in via Better Auth (Next.js)
       ↓
2. Better Auth creates session (cookie-based, opaque token)
       ↓
3. Frontend calls GET /api/token (custom Next.js route)
       ↓
4. /api/token verifies session via auth.api.getSession()
       ↓
5. Issues HS256 JWT with { sub: user.id, exp: 7d }
       ↓
6. Frontend attaches JWT as Authorization: Bearer <token>
       ↓
7. FastAPI middleware decodes JWT with BETTER_AUTH_SECRET
       ↓
8. verify_user_access checks sub == URL {user_id}
       ↓
9. Route handler executes with authenticated context
```

### Key Decisions

1. **Custom /api/token bridge endpoint**: Better Auth's JWT plugin uses RSA (asymmetric) keys stored in a `jwks` table. The backend uses HS256 (symmetric) with a shared secret. Rather than managing RSA key exchange, we bridge with a custom endpoint that verifies the session cookie and issues an HS256 JWT.

2. **HS256 over RS256**: Simpler setup — single shared secret vs RSA key pair management. Acceptable for a monorepo where frontend and backend share the same secret.

3. **Session cookie + JWT hybrid**: Better Auth manages sessions via HTTP-only cookies (secure). The JWT is only used for backend API calls, not for session management.

4. **User isolation at middleware level**: `verify_user_access` dependency checks JWT `sub` claim matches URL `{user_id}` parameter. Returns 403 on mismatch.

5. **No FK constraint between Better Auth and backend tables**: Better Auth owns user/session/account/verification/jwks tables. Backend only owns the task table. Avoids table creation ordering issues.

### Directory Structure

```
frontend/
├── lib/
│   ├── auth.ts              ← Better Auth server config (JWT plugin, pg Pool)
│   └── auth-client.ts       ← Better Auth React client (signIn, signUp, signOut, useSession)
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts  ← Better Auth catch-all handler
│   │   └── token/route.ts          ← Custom HS256 JWT issuer
│   ├── login/page.tsx
│   └── signup/page.tsx

backend/
├── middleware/
│   ├── __init__.py
│   └── auth.py              ← JWT verification + user isolation
└── tests/
    └── test_auth.py         ← 14 auth tests
```

### Better Auth Configuration

- **Database**: Neon PostgreSQL via `pg.Pool` with `ssl: { rejectUnauthorized: false }`
- **Tables owned by Better Auth**: `user`, `session`, `account`, `verification`, `jwks`
- **Plugins**: JWT (RSA keys in jwks table, 7d expiry)
- **Auth methods**: Email/password enabled

### Backend Middleware Functions

| Function              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `_extract_bearer_token` | Extract JWT from `Authorization: Bearer <token>` header |
| `_decode_token`         | Decode HS256 JWT, require `exp` + `sub` claims        |
| `get_current_user`      | FastAPI dependency — extract and verify JWT            |
| `verify_user_access`    | Combined auth + user isolation — `sub` must match `{user_id}` |

## Error Taxonomy

| Code | Scenario                              |
|------|---------------------------------------|
| 401  | Missing Authorization header          |
| 401  | Malformed Bearer token                |
| 401  | Expired JWT                           |
| 401  | Invalid JWT signature                 |
| 403  | JWT `sub` does not match URL `{user_id}` |
| 200  | `/health` — public, no auth required  |

## Environment Variables

| Variable             | Where         | Purpose                          |
|----------------------|---------------|----------------------------------|
| `BETTER_AUTH_SECRET` | Both          | HS256 signing/verification key   |
| `DATABASE_URL`       | Both          | Neon PostgreSQL connection string |
| `BETTER_AUTH_URL`    | Frontend      | Better Auth base URL             |
| `NEXT_PUBLIC_APP_URL`| Frontend      | Public app URL for auth client   |

## Testing Strategy

- **Backend**: 14 tests in `test_auth.py` covering token extraction (valid/missing/malformed), decode (valid/expired/invalid), user isolation (sub mismatch), and route integration
- **Frontend**: TypeScript strict mode + build verification (no runtime test suite)
- **Integration**: Manual E2E — signup, login, dashboard CRUD with JWT flow
- **Target**: 90%+ coverage on `middleware/auth.py` (SC-002)
