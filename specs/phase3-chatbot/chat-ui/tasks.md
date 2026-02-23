# Tasks: Chat UI

**Feature:** Chat UI for natural language task management
**Phase:** 3 — AI Chatbot
**Status:** Complete
**Date:** 2026-02-23

---

## T001: Add sendChatMessage to API client
**Status:** Complete
**File:** `frontend/lib/api.ts`

**What:**
- Add `ChatResponse` interface (`response: string`, `conversation_id: string`)
- Add `sendChatMessage(userId, message)` function
- Reuse existing `apiFetch` with POST method

**Acceptance:**
- [x] Function exported from `lib/api.ts`
- [x] Uses JWT auth via `apiFetch`
- [x] Returns `ChatResponse` type

---

## T002: Add refreshTasks to TaskContext
**Status:** Complete
**File:** `frontend/context/TaskContext.tsx`

**What:**
- Add `refreshTasks()` method to `TaskContextValue` interface
- Implement as `useCallback` that re-fetches tasks from backend
- Expose via `TaskContext.Provider`

**Acceptance:**
- [x] `refreshTasks()` available from `useTaskContext()`
- [x] Re-fetches tasks and dispatches `SET_TASKS`
- [x] No-op when userId is null

---

## T003: Create ChatWindow component
**Status:** Complete
**File:** `frontend/components/chat/ChatWindow.tsx`

**What:**
- `ChatWindow` — main component with messages state, input handling, API calls
- `EmptyState` — greeting, description, 4 suggestion buttons
- `MessageBubble` — user (indigo, right) vs AI (gray, left) styling
- Typing indicator with animated dots
- Auto-scroll on new messages
- Auto-resize textarea
- Error handling as assistant bubbles
- `refreshTasks()` after each AI response

**Acceptance:**
- [x] Empty state shows on first load with user's name
- [x] Suggestions are clickable and send messages
- [x] User messages right-aligned, AI messages left-aligned
- [x] Typing indicator shows during loading
- [x] Auto-scrolls to bottom
- [x] Enter sends, Shift+Enter newline
- [x] Errors displayed as assistant message
- [x] Tasks refresh after AI response

---

## T004: Create chat page route
**Status:** Complete
**File:** `frontend/app/(app)/chat/page.tsx`

**What:**
- Create `app/(app)/chat/page.tsx`
- Render `ChatWindow` with full height calculation
- Height: `calc(100vh - 56px topbar - 82px mobilenav)` on mobile, `calc(100vh - 56px)` on desktop

**Acceptance:**
- [x] `/chat` route renders ChatWindow
- [x] Protected by auth (redirects to login)
- [x] Inherits app layout (Sidebar, Topbar, MobileNav)

---

## T005: Add Chat to navigation
**Status:** Complete
**Files:** `Sidebar.tsx`, `MobileNav.tsx`, `Topbar.tsx`

**What:**
- Sidebar: Add `{ href: '/chat', label: 'AI Chat', icon: chatBubbleSVG }` to `navItems[]`
- MobileNav: Add `{ href: '/chat', label: 'Chat', icon: chatBubbleSVG }` to `navItems[]`
- Topbar: Add `'/chat': 'AI Chat'` to `pageTitles`

**Acceptance:**
- [x] "AI Chat" appears in desktop sidebar with chat bubble icon
- [x] "Chat" appears in mobile bottom nav
- [x] Topbar shows "AI Chat" title on `/chat` page
- [x] Active state highlighting works

---

## T006: Deploy Chat UI to Vercel
**Status:** Complete

**What:**
- Push frontend code to GitHub
- Vercel auto-deploys
- Verify `/chat` route accessible at production URL

**Acceptance:**
- [x] `https://frontend-eight-coral-50.vercel.app/chat` returns 307 (auth redirect) for unauthenticated users
- [x] Logged-in users can access the chat page
- [x] All 5 AI operations work end-to-end (add, list, complete, update, delete)
