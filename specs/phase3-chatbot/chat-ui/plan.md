# Plan: Chat UI — Architecture

**Feature:** Chat UI for natural language task management
**Phase:** 3 — AI Chatbot
**Status:** Complete
**Date:** 2026-02-23

---

## 1. Key Decisions

### D1: Single component vs component tree
- **Chose:** Single `ChatWindow.tsx` with inline `EmptyState` and `MessageBubble` sub-components
- **Why:** Chat UI is self-contained, no shared state with other pages. Sub-components are small enough to co-locate. Avoids unnecessary file proliferation.

### D2: State management — local useState vs ChatContext
- **Chose:** Local `useState` inside ChatWindow
- **Why:** Chat messages are page-scoped (not shared across pages). No need for a global context. Only `refreshTasks()` bridges to the TaskContext.

### D3: Message persistence — client-side only
- **Chose:** Messages stored in React state (cleared on page navigation)
- **Why:** Backend already persists conversation history in the `message` table. The chat endpoint loads history for the AI agent. Displaying old messages would require a separate GET endpoint, which is out of scope.

### D4: API integration pattern — reuse existing apiFetch
- **Chose:** Add `sendChatMessage()` to existing `lib/api.ts`
- **Why:** Reuses the JWT token flow (via `/api/token` bridge), error handling, and base URL configuration. No new HTTP client needed.

### D5: Task refresh strategy
- **Chose:** Add `refreshTasks()` to TaskContext, call after every AI response
- **Why:** AI operations (add/delete/complete/update) modify tasks. The sidebar count, dashboard stats, and task list must reflect these changes. `refreshTasks()` re-fetches all tasks from the backend.

## 2. Architecture

```
Frontend (Next.js)
├── app/(app)/chat/page.tsx          ← Route entry point
├── components/chat/ChatWindow.tsx   ← Main chat component
├── lib/api.ts                       ← sendChatMessage() added
├── context/TaskContext.tsx           ← refreshTasks() added
├── components/layout/Sidebar.tsx    ← Chat nav item added
├── components/layout/MobileNav.tsx  ← Chat nav item added
└── components/layout/Topbar.tsx     ← Chat page title added
```

### Data Flow
```
User types message
  → ChatWindow.handleSend()
  → sendChatMessage(userId, message)
  → apiFetch('POST /api/{userId}/chat', { message })
  → /api/token (get JWT)
  → Backend chat endpoint
  → AI Agent → MCP Server → Neon DB
  → Response returned
  → Message added to local state
  → refreshTasks() called
  → UI updates (messages + task list)
```

## 3. Files Modified

| File | Change |
|------|--------|
| `frontend/lib/api.ts` | Added `sendChatMessage()` |
| `frontend/context/TaskContext.tsx` | Added `refreshTasks()` to context |
| `frontend/components/layout/Sidebar.tsx` | Added Chat nav item to `navItems[]` |
| `frontend/components/layout/MobileNav.tsx` | Added Chat nav item to `navItems[]` |
| `frontend/components/layout/Topbar.tsx` | Added `/chat` to `pageTitles` |

## 4. Files Created

| File | Purpose |
|------|---------|
| `frontend/app/(app)/chat/page.tsx` | Chat route page |
| `frontend/components/chat/ChatWindow.tsx` | Chat component (ChatWindow, EmptyState, MessageBubble) |

## 5. Risks

| Risk | Mitigation |
|------|------------|
| AI response latency (5-15s) | Typing indicator keeps user informed |
| Render cold start (30s) | First message may be slow; subsequent fast |
| Vercel function timeout | Backend has 60s timeout on Hobby plan; sufficient for most operations |
