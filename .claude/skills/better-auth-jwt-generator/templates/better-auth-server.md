# Better Auth Server Config Template

## frontend/lib/auth.ts

```typescript
// [Task]: T00X [From]: specs/phase2-web/authentication/plan.md §Better Auth
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.DATABASE_URL!,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  plugins: [
    jwt({
      jwt: {
        expiresIn: "7d",
        issuer: "todo-platform",
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
});
```

## Key Points

- `database.url` — same Neon PostgreSQL connection as backend
- `secret` — BETTER_AUTH_SECRET, must match backend for JWT verification
- `baseURL` — the Next.js app URL (where auth routes live)
- `jwt()` plugin — issues JWT tokens alongside sessions
- `emailAndPassword.enabled` — enables email/password signup and signin
- `expiresIn: "7d"` — tokens valid for 7 days
- `issuer: "todo-platform"` — identifies token source

## Database Tables

Better Auth auto-creates its tables on first request:
- `user` (id, email, name, emailVerified, image, createdAt, updatedAt)
- `session` (id, userId, expiresAt, token, ipAddress, userAgent)
- `account` (id, userId, accountId, providerId, etc.)
- `verification` (id, identifier, value, expiresAt)

The `user.id` is the string UUID that becomes `Task.user_id` in our SQLModel.
