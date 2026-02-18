# Better Auth Setup Reference

## What is Better Auth?

Better Auth is a TypeScript-first authentication library for Next.js and other frameworks. It handles user registration, login, sessions, and can issue JWT tokens via its JWT plugin.

## Installation

```bash
npm install better-auth
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Auth Instance** | Server-side config created with `betterAuth()` in `lib/auth.ts` |
| **Auth Client** | Client-side helper created with `createAuthClient()` for React components |
| **API Route** | Catch-all `[...all]/route.ts` that handles all auth endpoints |
| **JWT Plugin** | Optional plugin that issues JWTs alongside sessions |
| **Session** | Server-managed session; JWT is an additional token for cross-service auth |

## Server Configuration (auth.ts)

```typescript
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    type: "postgres",
    url: process.env.DATABASE_URL!,
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  plugins: [
    jwt({
      jwt: {
        expiresIn: "7d",        // Token TTL
        issuer: "todo-platform", // iss claim
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,               // Enable email/password signup+signin
  },
});
```

### Key Config Options

| Option | Purpose |
|--------|---------|
| `database.url` | Neon PostgreSQL connection for storing users/sessions |
| `secret` | HMAC secret for signing JWTs — MUST match backend |
| `plugins: [jwt()]` | Enables JWT issuance on authentication |
| `emailAndPassword.enabled` | Allows email+password registration |

## JWT Plugin Details

When the JWT plugin is enabled:
- After successful login, Better Auth issues a JWT token
- Token is available via the session response
- Token `sub` claim = user ID
- Token is signed with `BETTER_AUTH_SECRET` using HS256
- Frontend sends this token to backend as `Authorization: Bearer <token>`

### JWT Token Payload Structure

```json
{
  "sub": "user-uuid-string",
  "email": "user@example.com",
  "name": "User Name",
  "iat": 1700000000,
  "exp": 1700604800,
  "iss": "todo-platform"
}
```

## Client Configuration (auth-client.ts)

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
```

The client provides React hooks:
- `authClient.signUp.email()` — register with email/password
- `authClient.signIn.email()` — login with email/password
- `authClient.signOut()` — logout
- `authClient.useSession()` — React hook for current session

## API Route Handler

Better Auth needs a catch-all API route to handle its internal endpoints:

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

This handles: `/api/auth/sign-up`, `/api/auth/sign-in`, `/api/auth/sign-out`, `/api/auth/session`, etc.

## Better Auth Database Tables

Better Auth auto-creates these tables on first run:
- `user` — id, email, name, emailVerified, image, createdAt, updatedAt
- `session` — id, userId, expiresAt, token, ipAddress, userAgent
- `account` — id, userId, accountId, providerId, accessToken, refreshToken
- `verification` — id, identifier, value, expiresAt

**Important:** The `user` table Better Auth creates is the same table our `User` SQLModel references. The `id` field is a string (UUID format).

## Environment Variables

```env
# Frontend (.env.local)
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://...neon-connection-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Getting JWT Token on Frontend

After sign-in, get the JWT to send to backend:

```typescript
// After successful login
const session = await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
});

// The JWT token for API calls
const token = session.token;

// Send to backend
fetch(`${API_URL}/api/${userId}/tasks`, {
  headers: {
    "Authorization": `Bearer ${token}`,
  },
});
```

## Security Considerations

- `BETTER_AUTH_SECRET` must be at least 32 characters
- Never expose the secret in client-side code (use server-only)
- Use HTTPS in production
- Set reasonable token expiry (7 days default)
- Better Auth handles password hashing (bcrypt) internally
