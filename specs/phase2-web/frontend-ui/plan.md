# Architecture Plan: Frontend UI
# Phase: phase2-web | Feature: frontend-ui
# Last updated: 2026-02-19

## Technical Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 16+ |
| Language | TypeScript | 5.x (strict) |
| Styling | Tailwind CSS | 3.x |
| Auth | Better Auth | latest |
| Auth Client | better-auth/react | same |
| HTTP | Native fetch (via lib/api.ts) | — |
| Node | Node.js | 20+ LTS |

---

## Directory Structure

```
frontend/
├── app/
│   ├── globals.css              # Tailwind directives
│   ├── layout.tsx               # Root layout (server component)
│   ├── page.tsx                 # Landing — redirects based on session
│   ├── login/
│   │   └── page.tsx             # Sign-in form
│   ├── signup/
│   │   └── page.tsx             # Registration form
│   ├── dashboard/
│   │   └── page.tsx             # Protected task dashboard
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts    # Better Auth catch-all handler
├── components/
│   ├── AuthGuard.tsx            # Auth protection wrapper
│   ├── TaskList.tsx             # Task list container
│   ├── TaskItem.tsx             # Single task row
│   ├── AddTaskForm.tsx          # Create task form
│   └── EditTaskModal.tsx        # Edit task modal
├── lib/
│   ├── auth.ts                  # Better Auth server config (JWT plugin)
│   ├── auth-client.ts           # Better Auth React client
│   └── api.ts                   # Typed API client with JWT auto-attach
├── types/
│   └── task.ts                  # TypeScript interfaces matching backend
├── .env.local.example           # Required environment variables
├── next.config.ts               # Next.js config
└── package.json
```

---

## Key Design Decisions

### 1. Server vs Client Components
- **Root layout** (`app/layout.tsx`): server component — enables metadata export
- **Auth pages, dashboard, landing**: client components — need `useSession()`, `useRouter()`
- **All `components/`**: client components — interactive state, browser APIs

### 2. API Client Pattern
- All API calls go through `lib/api.ts`
- `apiFetch()` is the single wrapper: handles JWT, Content-Type, errors, 204 responses
- `getToken()` fetches JWT from Better Auth session — never localStorage
- Components import named functions (`getTasks`, `createTask`, etc.)

### 3. Auth Guard Pattern
- `AuthGuard` is a client component wrapper
- Checks session on mount; redirects to `/login` if no session
- Shows loading state during `isPending`
- `DashboardPage` wraps its content in `AuthGuard`

### 4. Optimistic Updates
- Toggle complete uses optimistic update: immediate UI change, revert on error
- Other operations (add, update, delete) wait for server confirmation then update local state

### 5. Better Auth Integration
- Server config (`lib/auth.ts`): JWT plugin + emailAndPassword + Neon DB
- Client (`lib/auth-client.ts`): `createAuthClient` from `better-auth/react`
- Route handler (`app/api/auth/[...all]/route.ts`): `toNextJsHandler(auth)` catches all auth routes

---

## Data Flow

```
User Action
    → Component (useState)
    → lib/api.ts (apiFetch)
    → lib/auth-client.ts (getToken)
    → FastAPI backend (/api/{user_id}/tasks)
    → Response → setTasks()
    → Re-render
```

---

## Environment Variables

| Variable | Used In | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `lib/auth.ts` | Neon PostgreSQL (node-postgres format) |
| `BETTER_AUTH_SECRET` | `lib/auth.ts` | Shared secret — must match backend |
| `BETTER_AUTH_URL` | `lib/auth.ts` | Next.js base URL |
| `NEXT_PUBLIC_APP_URL` | `lib/auth-client.ts` | Client-visible app URL |
| `NEXT_PUBLIC_API_URL` | `lib/api.ts` | Client-visible FastAPI URL |

---

## API Contract

Frontend calls these FastAPI endpoints (all defined in `specs/phase2-web/rest-api/`):

| Operation | Method | Path |
|-----------|--------|------|
| List tasks | GET | `/api/{user_id}/tasks` |
| Create task | POST | `/api/{user_id}/tasks` |
| Update task | PUT | `/api/{user_id}/tasks/{id}` |
| Delete task | DELETE | `/api/{user_id}/tasks/{id}` |
| Toggle complete | PATCH | `/api/{user_id}/tasks/{id}/complete` |

---

## Acceptance Checks

- [ ] `npm run build` exits 0 with zero TS errors
- [ ] Login/signup pages functional with Better Auth
- [ ] Dashboard loads tasks from backend API
- [ ] All CRUD operations (add, edit, delete, toggle) work end-to-end
- [ ] Unauthenticated access to `/dashboard` redirects to `/login`
- [ ] All error states handled with inline messages
- [ ] Responsive layout on mobile and desktop
