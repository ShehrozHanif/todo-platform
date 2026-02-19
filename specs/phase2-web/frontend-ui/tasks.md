# Tasks: Frontend UI
# Phase: phase2-web | Feature: frontend-ui
# Last updated: 2026-02-19
# Spec: specs/phase2-web/frontend-ui/spec.md
# Plan: specs/phase2-web/frontend-ui/plan.md

---

## Task Group 1: Project Setup

### T001 — Initialize Next.js App
- **Story**: US-001 (auth) + US-002 (dashboard)
- **Action**: Run `npx create-next-app@latest frontend --typescript --tailwind --app --eslint --no-src-dir`
- **Acceptance**: `frontend/` directory exists with `package.json`, `tsconfig.json`, `tailwind.config.ts`, `app/` directory

### T002 — Install Better Auth dependencies
- **Story**: US-001
- **Action**: `npm install better-auth` in `frontend/`
- **Acceptance**: `better-auth` appears in `package.json` dependencies

### T003 — Create .env.local.example
- **Story**: All
- **Action**: Create `frontend/.env.local.example` with DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL
- **Acceptance**: File exists; no secrets committed

---

## Task Group 2: Types & API Client

### T004 — Create TypeScript interfaces
- **Story**: US-002 to US-006
- **Action**: Create `frontend/types/task.ts` with Task, TaskCreateInput, TaskUpdateInput interfaces matching backend schemas
- **Spec**: NFR-001 (TypeScript strict)
- **Acceptance**: Interfaces compile with strict mode; `Task.id` is number, `Task.user_id` is string

### T005 — Create API client
- **Story**: US-002 to US-006
- **Action**: Create `frontend/lib/api.ts` with `apiFetch` wrapper and 6 task functions (getTasks, createTask, getTask, updateTask, deleteTask, toggleComplete)
- **Spec**: FR-005 to FR-009, NFR-005, NFR-006
- **Acceptance**: All 6 functions present; JWT auto-attached; 204 handled; errors throw Error with backend detail

---

## Task Group 3: Better Auth Setup

### T006 — Create Better Auth server config
- **Story**: US-001
- **Action**: Create `frontend/lib/auth.ts` with betterAuth, JWT plugin, emailAndPassword, Neon DB connection
- **Spec**: FR-001, FR-002
- **Acceptance**: File compiles; exports `auth` object with jwt plugin

### T007 — Create Better Auth client
- **Story**: US-001, US-007
- **Action**: Create `frontend/lib/auth-client.ts` exporting authClient, signIn, signUp, signOut, useSession
- **Spec**: FR-001, FR-002, FR-010
- **Acceptance**: All named exports present; `useSession` available for client components

### T008 — Create auth route handler
- **Story**: US-001
- **Action**: Create `frontend/app/api/auth/[...all]/route.ts` using `toNextJsHandler(auth)`
- **Spec**: FR-001, FR-002
- **Acceptance**: GET and POST exported; file compiles

---

## Task Group 4: Auth Components & Pages

### T009 — Create AuthGuard component
- **Story**: US-002 (dashboard protection)
- **Action**: Create `frontend/components/AuthGuard.tsx` — checks session, redirects to /login if none, shows loading during isPending
- **Spec**: FR-004
- **Acceptance**: Unauthenticated renders null + redirects; loading state shown; children rendered when session exists

### T010 — Create Login page
- **Story**: US-001
- **Action**: Create `frontend/app/login/page.tsx` with email/password form, signIn.email(), error display, redirect to /dashboard on success
- **Spec**: FR-001, FR-003, FR-012, FR-013
- **Acceptance**: Form submits; invalid creds show error; valid creds redirect to /dashboard

### T011 — Create Signup page
- **Story**: US-001
- **Action**: Create `frontend/app/signup/page.tsx` with name/email/password form, client-side min-8 validation, signUp.email(), redirect on success
- **Spec**: FR-002, FR-003, FR-012, FR-013
- **Acceptance**: Password < 8 shows error; valid submission redirects to /dashboard

---

## Task Group 5: Task Components

### T012 — Create AddTaskForm component
- **Story**: US-003
- **Action**: Create `frontend/components/AddTaskForm.tsx` with title (required) + description (optional), loading state, error display
- **Spec**: FR-006, FR-012, FR-013
- **Acceptance**: Empty title blocked; loading during submit; error displayed on failure; resets after success

### T013 — Create TaskItem component
- **Story**: US-004, US-005, US-006
- **Action**: Create `frontend/components/TaskItem.tsx` with checkbox toggle, edit button, delete with window.confirm()
- **Spec**: FR-007, FR-008, FR-009
- **Acceptance**: Completed tasks have line-through style; delete shows confirm dialog; edit calls onEdit prop

### T014 — Create TaskList component
- **Story**: US-002
- **Action**: Create `frontend/components/TaskList.tsx` that renders TaskItem list, handles loading state, handles empty state
- **Spec**: FR-005, FR-012
- **Acceptance**: Loading shows "Loading tasks..."; empty shows "No tasks yet"; tasks render as list

### T015 — Create EditTaskModal component
- **Story**: US-004
- **Action**: Create `frontend/components/EditTaskModal.tsx` with pre-filled title/description, save/cancel buttons, error display
- **Spec**: FR-007, FR-012, FR-013
- **Acceptance**: Pre-fills existing values; empty title blocked; cancel closes modal; save calls onSave prop

---

## Task Group 6: Dashboard & Layout

### T016 — Create Dashboard page
- **Story**: US-002 to US-007
- **Action**: Create `frontend/app/dashboard/page.tsx` with AuthGuard, session-based userId, all CRUD handlers, optimistic toggle
- **Spec**: FR-004 to FR-010
- **Acceptance**: Wrapped in AuthGuard; loads tasks on mount; all operations work; sign out redirects to /login

### T017 — Create Root layout
- **Story**: All
- **Action**: Update `frontend/app/layout.tsx` with metadata (title: "Todo Platform"), globals.css import, antialiased body
- **Spec**: NFR-002
- **Acceptance**: Server component; no "use client"; metadata exported

### T018 — Create Landing page
- **Story**: All
- **Action**: Create `frontend/app/page.tsx` that redirects authenticated → /dashboard, unauthenticated → /login
- **Spec**: FR-011
- **Acceptance**: Session present → /dashboard; no session → /login; shows "Redirecting..." during check

---

## Task Group 7: Verification

### T019 — Build verification
- **Story**: All
- **Action**: Run `npm run build` in `frontend/`
- **Spec**: NFR-004
- **Acceptance**: Exit 0; zero TypeScript errors; zero build errors

### T020 — Configure next.config for CORS
- **Story**: US-002 to US-006
- **Action**: Update `frontend/next.config.ts` if needed for API proxying or headers
- **Spec**: NFR-005
- **Acceptance**: `npm run build` still passes

---

## Dependency Order

```
T001 → T002 → T003
T001 → T004 → T005
T001 → T006 → T007 → T008
T001 → T009 → T016
T004 → T013 → T014 → T016
T004 → T015 → T016
T004 → T012 → T016
T007 → T010 → T016
T007 → T011
T017 → T018
T016 → T019
```
