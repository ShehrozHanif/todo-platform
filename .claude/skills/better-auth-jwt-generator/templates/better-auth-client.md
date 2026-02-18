# Better Auth Client Template

## frontend/lib/auth-client.ts

```typescript
// [Task]: T00X [From]: specs/phase2-web/authentication/plan.md §Auth Client
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Convenience exports for components
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
```

## Usage in Components

### Sign Up
```typescript
import { signUp } from "@/lib/auth-client";

const result = await signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "User Name",
});
```

### Sign In
```typescript
import { signIn } from "@/lib/auth-client";

const result = await signIn.email({
  email: "user@example.com",
  password: "securepassword",
});

// result contains the JWT token for API calls
const token = result.token;
```

### Sign Out
```typescript
import { signOut } from "@/lib/auth-client";

await signOut();
```

### Get Current Session (React Hook)
```typescript
"use client";
import { useSession } from "@/lib/auth-client";

export function ProfileCard() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Not logged in</div>;

  return <div>Hello, {session.user.name}</div>;
}
```

### Sending JWT to Backend API
```typescript
import { authClient } from "@/lib/auth-client";

export async function fetchTasks(userId: string) {
  const session = await authClient.getSession();
  const token = session?.token;

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/${userId}/tasks`,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  return response.json();
}
```

## Key Points

- `createAuthClient` is from `better-auth/react` — provides React hooks
- `baseURL` points to the Next.js app (where `/api/auth/*` routes live)
- `useSession()` is a React hook — only works in client components (`"use client"`)
- `signIn.email()` returns session with JWT token
- Token is sent to FastAPI backend as `Authorization: Bearer <token>`
