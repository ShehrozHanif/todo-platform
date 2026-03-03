---
id: "001"
title: "Search Filter Sort UI"
stage: green
date: "2026-03-03"
surface: agent
model: claude-sonnet-4-6
feature: phase5-cloud/advanced-features
branch: master
user: Shehroz Hanif
command: "implement T009 (search/filter/sort UI) now"
labels: ["phase5", "advanced-features", "frontend", "search", "filter", "sort", "T009"]
links:
  spec: "specs/phase5-cloud/advanced-features/spec.md"
  ticket: null
  adr: null
  pr: null
files:
  - "frontend/lib/api.ts"
  - "frontend/app/(app)/tasks/page.tsx"
tests:
  - "npx tsc --noEmit (0 errors)"
  - "uv run pytest -q (53/53 passed)"
---

## Prompt

implement T009 (search/filter/sort UI) now

## Response

Implemented T009 — Search/Filter/Sort UI on the tasks page.

### Changes

**`frontend/lib/api.ts`**
- Added `TaskQueryParams` interface (search, priority, category, completed, tags, due_date_from, due_date_to, sort, order)
- Updated `getTasks(userId, params?)` to build a URLSearchParams query string and append to the fetch path

**`frontend/app/(app)/tasks/page.tsx`** (full rewrite of filter logic)
- Added `search` + `debouncedSearch` local state (300ms debounce via useRef setTimeout)
- Added `sortValue` local state — string format `"field:order"` (e.g. `"due_date:asc"`)
- Added `displayTasks: Task[] | null` local state — populated by backend fetch when any params are active; null when no params (falls back to `state.tasks` from context)
- `useEffect` watches `[userId, debouncedSearch, sortValue, filter, state.activeCategory, state.tasks]`:
  - Maps FilterChips (High/Medium/Low/Completed/Today) → `TaskQueryParams`
  - Maps sortValue → `sort` + `order` params
  - If no params active: sets `displayTasks = null` (no extra API call)
  - If params active: fetches `api.getTasks(userId, params)` → sets `displayTasks`
- Removed client-side `applyFilter()` function — backend handles all filtering/sorting
- Added **search bar** (with clear ×button, indigo border when active)
- Added **sort dropdown** (Newest/Oldest/Due Date↑↓/Priority/Title A–Z/Z–A)
- Added **"Clear" button** — visible when any filter/search/sort is active; resets all params
- Added search result count label (e.g. "3 results for 'meeting'")
- Extracted `CatOption` component from inline JSX (DRY — used for All + builtIn + custom categories)
- Empty state message adapts: shows search term / category / generic depending on context

### Architecture

`shown = displayTasks ?? state.tasks`

- When no filters: zero extra API calls, uses already-loaded context tasks
- When filters active: fetches from backend with params, keeps results in sync after mutations (via `state.tasks` dep)
- FilterChips remain controlled via context (`SET_FILTER` action) — no breaking changes to context shape

## Outcome

- T009 complete — Feature 1 (Advanced Features) is fully implemented
- 53/53 backend tests pass
- TypeScript: 0 errors
