# Auth Route Handler Template

## frontend/app/api/auth/[...all]/route.ts

```typescript
// [Task]: T00X [From]: specs/phase2-web/authentication/plan.md §Auth Routes
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

## What This Does

This catch-all route delegates ALL auth-related HTTP requests to Better Auth:

| Better Auth Endpoint | Method | Purpose |
|---------------------|--------|---------|
| `/api/auth/sign-up` | POST | Register new user |
| `/api/auth/sign-in/email` | POST | Login with email/password |
| `/api/auth/sign-out` | POST | Logout (invalidate session) |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/csrf` | GET | CSRF token |

## Key Points

- `[...all]` is Next.js catch-all dynamic route — matches any sub-path under `/api/auth/`
- `toNextJsHandler` adapts Better Auth's handler to Next.js App Router format
- Only exports `GET` and `POST` — those are the only methods Better Auth uses
- `auth` is imported from our server config (`lib/auth.ts`)
- No custom logic needed — Better Auth handles everything internally

## File Location

```
frontend/
└── app/
    └── api/
        └── auth/
            └── [...all]/
                └── route.ts    ← This file
```
