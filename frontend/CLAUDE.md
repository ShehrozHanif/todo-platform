# Frontend — Claude Code Guidelines

## Stack

- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4
- **Auth**: Better Auth v1.4+ with JWT plugin
- **Database driver**: pg (node-postgres) for Better Auth's Kysely adapter
- **JWT**: jose library for HS256 token signing

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with Tailwind globals
│   ├── page.tsx             # Landing — redirects based on auth state
│   ├── login/page.tsx       # Email/password sign-in form
│   ├── signup/page.tsx      # Registration form with validation
│   ├── dashboard/page.tsx   # Protected task CRUD dashboard
│   └── api/
│       ├── auth/[...all]/route.ts  # Better Auth catch-all handler
│       └── token/route.ts          # Custom HS256 JWT issuer for backend
├── components/
│   ├── AuthGuard.tsx        # Session-based route protection
│   ├── AddTaskForm.tsx      # New task form with validation
│   ├── TaskList.tsx         # Task list with loading/empty states
│   ├── TaskItem.tsx         # Single task row (toggle, edit, delete)
│   └── EditTaskModal.tsx    # Modal for editing task title/description
├── lib/
│   ├── auth.ts              # Better Auth server config (pg Pool, JWT plugin)
│   ├── auth-client.ts       # Better Auth React client exports
│   └── api.ts               # Centralized API client with JWT auto-attach
├── types/
│   └── task.ts              # Task, TaskCreateInput, TaskUpdateInput interfaces
└── .env.local.example       # Environment variable template
```

## Key Patterns

- **Auth flow**: Better Auth manages sessions via cookies. The custom `/api/token` endpoint bridges sessions to HS256 JWTs for backend API calls.
- **API client**: All backend calls go through `lib/api.ts` which auto-attaches the JWT. Components never call `fetch` directly for task operations.
- **AuthGuard**: Wraps protected pages. Checks `useSession()`, redirects to `/login` if unauthenticated.
- **Optimistic updates**: Task toggle uses optimistic UI update with rollback on failure.
- **"use client"**: All interactive components and pages use the `"use client"` directive.

## Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npx next build

# Type check
npx tsc --noEmit
```

## Environment Variables

| Variable               | Required | Example                                    |
|------------------------|----------|--------------------------------------------|
| `DATABASE_URL`         | Yes      | `postgresql://user:pass@host/db?sslmode=require` |
| `BETTER_AUTH_SECRET`   | Yes      | Same value as backend's BETTER_AUTH_SECRET  |
| `BETTER_AUTH_URL`      | Yes      | `http://localhost:3000`                    |
| `NEXT_PUBLIC_APP_URL`  | Yes      | `http://localhost:3000`                    |
| `NEXT_PUBLIC_API_URL`  | Yes      | `http://localhost:8000`                    |

## Conventions

- Every code file must have a `// [Task]: Txxx [From]: specs/...` comment header linking to the spec.
- Use TypeScript strict mode — no `any` types unless absolutely necessary.
- No hardcoded secrets — always use environment variables via `.env.local`.
- Components are functional with hooks — no class components.
- Server components are the default; only add `"use client"` when interactivity is needed.
