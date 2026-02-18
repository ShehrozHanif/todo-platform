---
name: nextjs-todo-ui-generator
description: |
  Generate Next.js 16+ App Router frontend with pages, components, and API client for todo management.
  This skill should be used when users ask to create a Next.js frontend, todo web UI, task dashboard,
  or React pages with authentication and CRUD operations.
---

# Next.js Todo UI Generator

Generate a **production-quality Next.js 16+ App Router frontend** for a todo management application. Includes authentication pages, protected dashboard, reusable components, typed API client with JWT, and responsive Tailwind CSS styling.

## What This Skill Does

- Creates Next.js App Router pages (landing, login, signup, dashboard)
- Generates reusable React components (TaskList, TaskItem, AddTaskForm, EditTaskModal, AuthGuard)
- Produces typed API client that auto-attaches JWT Bearer tokens
- Integrates Better Auth client for authentication flows
- Implements responsive UI with Tailwind CSS

## What This Skill Does NOT Do

- Create backend API endpoints (see `fastapi-crud-generator`)
- Configure Better Auth server (see `better-auth-jwt-generator`)
- Create database models (see `neon-sqlmodel-generator`)
- Handle deployment to Vercel or other platforms
- Implement real-time updates or WebSocket connections

---

## Before Implementation

Gather context to ensure successful implementation:

| Source | Gather |
|--------|--------|
| **Codebase** | Existing `frontend/` structure, `lib/auth-client.ts` from Feature 3 |
| **Conversation** | User's specific UI preferences, branding, component requirements |
| **Skill References** | Next.js patterns from `references/nextjs-app-router.md`, component patterns from `references/component-patterns.md` |
| **User Guidelines** | Project constitution, AGENTS.md conventions, task IDs |

**Prerequisites:** All 3 previous skills must be completed (database, API, auth).

---

## Implementation Steps

Execute in this exact order.

### Phase 1: Project Setup

1. Initialize Next.js in `frontend/` if not exists: `npx create-next-app@latest frontend --typescript --tailwind --app --eslint`
2. Verify Tailwind CSS is configured
3. Create directory structure:
   ```
   frontend/
   ├── app/
   │   ├── layout.tsx              # Root layout with providers
   │   ├── page.tsx                # Landing → redirect
   │   ├── login/page.tsx          # Sign-in form
   │   ├── signup/page.tsx         # Registration form
   │   └── dashboard/page.tsx      # Protected task view
   ├── components/
   │   ├── AuthGuard.tsx           # Auth wrapper
   │   ├── TaskList.tsx            # Task list container
   │   ├── TaskItem.tsx            # Single task row
   │   ├── AddTaskForm.tsx         # New task form
   │   └── EditTaskModal.tsx       # Edit modal
   ├── lib/
   │   ├── auth.ts                 # (from Feature 3)
   │   ├── auth-client.ts          # (from Feature 3)
   │   └── api.ts                  # API client with JWT
   └── types/
       └── task.ts                 # TypeScript interfaces
   ```

### Phase 2: Types & API Client

1. Create `frontend/types/task.ts` — see [templates/types.md](templates/types.md)
2. Create `frontend/lib/api.ts` — see [templates/api-client.md](templates/api-client.md)
3. Verify types match backend TaskResponse schema

### Phase 3: Auth Components & Pages

1. Create `frontend/components/AuthGuard.tsx` — see [templates/components.md](templates/components.md)
2. Create `frontend/app/login/page.tsx` — see [templates/auth-pages.md](templates/auth-pages.md)
3. Create `frontend/app/signup/page.tsx` — see [templates/auth-pages.md](templates/auth-pages.md)

### Phase 4: Task Components & Dashboard

1. Create `frontend/components/TaskList.tsx` — see [templates/components.md](templates/components.md)
2. Create `frontend/components/TaskItem.tsx` — see [templates/components.md](templates/components.md)
3. Create `frontend/components/AddTaskForm.tsx` — see [templates/components.md](templates/components.md)
4. Create `frontend/components/EditTaskModal.tsx` — see [templates/components.md](templates/components.md)
5. Create `frontend/app/dashboard/page.tsx` — see [templates/dashboard-page.md](templates/dashboard-page.md)

### Phase 5: Layout & Landing

1. Create `frontend/app/layout.tsx` — see [templates/app-layout.md](templates/app-layout.md)
2. Create `frontend/app/page.tsx` — see [templates/app-layout.md](templates/app-layout.md)
3. Run `npm run build` — verify zero TypeScript errors
4. Run `npm run dev` — verify pages render correctly

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Component model | Server by default, `"use client"` for interactivity | Next.js 16+ best practice; smaller JS bundle |
| Styling | Tailwind CSS utility classes | Fast iteration, no CSS files, responsive built-in |
| API client | Centralized `lib/api.ts` | Single place for JWT injection, base URL, error handling |
| Auth state | `useSession()` hook from Better Auth | Reactive, auto-refreshes, SSR compatible |
| Auth guard | Client component wrapper | Redirects before rendering protected content |
| Forms | Controlled React forms with useState | Simple, no form library overhead |
| Delete UX | `window.confirm()` dialog | Simple, native, no extra library |
| Error display | Inline error messages | User sees errors in context, not disconnected toasts |

---

## Critical Invariants

- All components in `components/` are client components (`"use client"`)
- `lib/api.ts` auto-attaches JWT to every request — components never handle tokens
- `AuthGuard` checks session on mount — redirects to `/login` if unauthenticated
- Dashboard page is wrapped in `AuthGuard` — never renders without auth
- API client uses `NEXT_PUBLIC_API_URL` env var — never hardcoded
- TypeScript `Task` interface matches backend `TaskResponse` exactly
- Forms validate before submit (title required, not empty)
- Delete always requires confirmation

---

## Output Specification

| File | Purpose | Template |
|------|---------|----------|
| `frontend/types/task.ts` | TypeScript interfaces | [templates/types.md](templates/types.md) |
| `frontend/lib/api.ts` | API client with JWT | [templates/api-client.md](templates/api-client.md) |
| `frontend/components/AuthGuard.tsx` | Auth redirect wrapper | [templates/components.md](templates/components.md) |
| `frontend/components/TaskList.tsx` | Task list container | [templates/components.md](templates/components.md) |
| `frontend/components/TaskItem.tsx` | Single task with actions | [templates/components.md](templates/components.md) |
| `frontend/components/AddTaskForm.tsx` | Create task form | [templates/components.md](templates/components.md) |
| `frontend/components/EditTaskModal.tsx` | Edit task modal | [templates/components.md](templates/components.md) |
| `frontend/app/layout.tsx` | Root layout | [templates/app-layout.md](templates/app-layout.md) |
| `frontend/app/page.tsx` | Landing redirect | [templates/app-layout.md](templates/app-layout.md) |
| `frontend/app/login/page.tsx` | Login page | [templates/auth-pages.md](templates/auth-pages.md) |
| `frontend/app/signup/page.tsx` | Signup page | [templates/auth-pages.md](templates/auth-pages.md) |
| `frontend/app/dashboard/page.tsx` | Protected dashboard | [templates/dashboard-page.md](templates/dashboard-page.md) |

---

## Domain Standards

### Must Follow
- [ ] `"use client"` directive on all interactive components
- [ ] TypeScript strict mode, no `any` types
- [ ] API calls only through `lib/api.ts` (never raw fetch in components)
- [ ] JWT token attached automatically by API client
- [ ] Protected pages wrapped in `AuthGuard`
- [ ] Tailwind CSS for all styling (no inline styles, no CSS modules)
- [ ] Responsive design (mobile-first breakpoints)

### Must Avoid
- Storing JWT in `localStorage` (use session/memory)
- Raw `fetch()` calls in components (use api.ts)
- `"use client"` on components that don't need it
- Hardcoded API URLs or user IDs
- Missing loading states during API calls
- Missing error handling on API calls
- `any` type annotations

---

## Output Checklist

Before delivering, verify:
- [ ] All TypeScript interfaces match backend schemas
- [ ] API client attaches JWT to every request
- [ ] Login/signup pages work with Better Auth client
- [ ] Dashboard is protected by AuthGuard
- [ ] All CRUD operations work (add, view, update, delete, toggle)
- [ ] Delete has confirmation dialog
- [ ] Loading and error states present
- [ ] Responsive layout on mobile and desktop
- [ ] `npm run build` succeeds with zero errors
- [ ] Every file has Task ID comment referencing specs

---

## Reference Files

| File | When to Read |
|------|--------------|
| `references/nextjs-app-router.md` | App Router patterns, layouts, server/client components |
| `references/component-patterns.md` | React component patterns, hooks, state management |
| `templates/types.md` | TypeScript interface definitions |
| `templates/api-client.md` | API client with JWT auto-attach |
| `templates/components.md` | All 5 component code templates |
| `templates/auth-pages.md` | Login and signup page templates |
| `templates/dashboard-page.md` | Dashboard page template |
| `templates/app-layout.md` | Root layout and landing page |
