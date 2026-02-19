# Feature Spec: Frontend UI
# Phase: phase2-web | Feature: frontend-ui
# Last updated: 2026-02-19

## Overview

A Next.js 16+ App Router web interface for the Todo Platform. Provides authenticated task management with login, signup, and a protected dashboard for CRUD operations. Integrates with Better Auth for session management and the FastAPI backend via a typed API client.

---

## User Stories

### US-001: Authentication
**As a** visitor, **I want to** sign up and log in with email/password **so that** I can access my personal task list securely.

### US-002: Task Dashboard
**As an** authenticated user, **I want to** view all my tasks on a dashboard **so that** I can see my current task list at a glance.

### US-003: Create Task
**As an** authenticated user, **I want to** add new tasks with a title and optional description **so that** I can track new work items.

### US-004: Update Task
**As an** authenticated user, **I want to** edit a task's title and description **so that** I can correct or update task details.

### US-005: Delete Task
**As an** authenticated user, **I want to** delete tasks with confirmation **so that** I can remove completed or irrelevant items.

### US-006: Toggle Complete
**As an** authenticated user, **I want to** mark tasks as complete/incomplete **so that** I can track my progress.

### US-007: Sign Out
**As an** authenticated user, **I want to** sign out **so that** my session ends securely.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Login page accepts email + password; valid credentials redirect to `/dashboard` |
| FR-002 | Signup page accepts name, email, password (min 8 chars); success redirects to `/dashboard` |
| FR-003 | Invalid credentials show inline error message |
| FR-004 | Dashboard is protected — unauthenticated users redirected to `/login` |
| FR-005 | Dashboard loads and displays user's task list from backend API |
| FR-006 | Add Task form validates: title required, non-empty; submission creates task via API |
| FR-007 | Edit modal pre-fills existing values; save updates task via PUT API |
| FR-008 | Delete requires `window.confirm()` before calling DELETE API |
| FR-009 | Toggle complete calls PATCH API; optimistic UI update reverts on error |
| FR-010 | Sign out clears session and redirects to `/login` |
| FR-011 | Landing page (`/`) redirects authenticated users to `/dashboard`, others to `/login` |
| FR-012 | All loading states show feedback (button disabled, spinner text) |
| FR-013 | All API errors show inline error messages |

---

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | TypeScript strict mode — no `any` types |
| NFR-002 | Tailwind CSS for all styling — no CSS modules, no inline styles |
| NFR-003 | Responsive design — mobile-first, works on 320px+ screens |
| NFR-004 | `npm run build` succeeds with zero TypeScript errors |
| NFR-005 | JWT token auto-attached to all API calls — components never handle tokens directly |
| NFR-006 | API calls only through `lib/api.ts` — no raw `fetch()` in components |

---

## Pages & Routes

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | `app/page.tsx` | No — redirects based on session |
| `/login` | `app/login/page.tsx` | No |
| `/signup` | `app/signup/page.tsx` | No |
| `/dashboard` | `app/dashboard/page.tsx` | Yes — wrapped in AuthGuard |

---

## Components

| Component | Purpose |
|-----------|---------|
| `AuthGuard` | Redirects to `/login` if no session; shows loading during check |
| `TaskList` | Renders list of TaskItem components; handles loading/empty states |
| `TaskItem` | Single task row with toggle, edit, delete actions |
| `AddTaskForm` | Controlled form to create new tasks |
| `EditTaskModal` | Modal overlay to edit task title and description |

---

## Constraints

- Better Auth handles all auth — no custom JWT logic in frontend
- `BETTER_AUTH_SECRET` must match backend exactly
- `NEXT_PUBLIC_API_URL` is the only allowed API base URL source
- JWT token obtained from Better Auth session — never stored in localStorage
- All components in `components/` directory are client components
