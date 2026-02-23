# Spec: Chat UI — AI Task Management Interface

**Feature:** Chat UI for natural language task management
**Phase:** 3 — AI Chatbot
**Spec Location:** `specs/phase3-chatbot/chat-ui/`
**Status:** Complete
**Date:** 2026-02-23

---

## 1. Purpose

Provide a chat interface within the existing Next.js frontend where users can manage their tasks via natural language conversation with an AI assistant.

## 2. Background

Phase 3 added an MCP Server (Feature 1) and AI Agent (Feature 2) that handle natural language task management. This feature (Feature 3) provides the user-facing chat interface that connects to the AI Agent's `POST /api/{user_id}/chat` endpoint.

## 3. In Scope

- Chat page at `/chat` route (inside the authenticated app layout)
- ChatWindow component with message history and input
- MessageBubble component with user vs AI styling
- Empty state with greeting and quick-action suggestions
- Typing indicator while AI is processing
- Auto-scroll to latest message
- Auth integration (session user_id flows to chat API)
- Task list auto-refresh after AI operations (add/delete/complete/update)
- Navigation integration (Sidebar, MobileNav, Topbar)
- Responsive design (mobile + desktop)

## 4. Out of Scope

- Voice input (bonus feature, not in base spec)
- Streaming responses (future enhancement)
- Multiple conversations / conversation history UI
- File/image attachments
- Markdown rendering in AI responses

## 5. Functional Requirements

### FR-001: Chat Page Route
- New page at `app/(app)/chat/page.tsx`
- Protected by existing auth middleware (redirects to login if unauthenticated)
- Inherits app layout (Sidebar, Topbar, MobileNav, TaskModal)
- Full height: `calc(100vh - topbar - mobilenav)`

### FR-002: Chat Window Component
- `components/chat/ChatWindow.tsx`
- Displays message history as a scrollable list
- Input area at bottom with textarea + send button
- Textarea auto-resizes up to 120px
- Send on Enter key (Shift+Enter for newline)
- Send button disabled when input is empty or loading

### FR-003: Message Bubbles
- User messages: right-aligned, indigo background, white text, rounded-tr-sm
- AI messages: left-aligned, gray background, dark text, rounded-tl-sm
- Avatars: user icon (gray circle) / AI icon (indigo gradient circle with chat icon)
- Timestamp shown below each message (HH:MM format)

### FR-004: Empty State
- Shown when no messages exist
- Greeting: "Hi {firstName}!"
- Description: explains AI can add, list, complete, update, delete tasks
- 4 suggestion buttons: clickable, send message on click
  - "Add a task called 'Review PR'"
  - "List all my tasks"
  - "Complete task 1"
  - "What tasks do I have?"

### FR-005: Typing Indicator
- Shown while waiting for AI response
- 3 animated bouncing dots in a gray bubble
- AI avatar shown next to the indicator

### FR-006: API Integration
- Uses `sendChatMessage(userId, message)` from `lib/api.ts`
- Calls `POST /api/{user_id}/chat` with JWT Bearer token
- Request body: `{ "message": string }`
- Response: `{ "response": string, "conversation_id": string }`

### FR-007: Task Refresh
- After each successful AI response, calls `refreshTasks()` from TaskContext
- Ensures task list, dashboard stats, and sidebar counts update automatically

### FR-008: Error Handling
- On API failure, display error as an assistant message bubble
- Message: "Sorry, something went wrong. {error.message}"
- Does not crash the UI

### FR-009: Navigation Integration
- Sidebar: "AI Chat" nav item with chat bubble SVG icon, href="/chat"
- MobileNav: "Chat" bottom nav item with same icon
- Topbar: pageTitles['/chat'] = 'AI Chat'

## 6. Non-Functional Requirements

| NFR | Target |
|-----|--------|
| First render | < 100ms (static page, no data fetch) |
| Message send → response | Depends on AI (typically 3-15s) |
| Bundle size impact | < 5KB gzipped (single component) |
| Accessibility | Keyboard-navigable, textarea focus on load |
| Dark mode | Full support via existing Tailwind dark: classes |

## 7. Acceptance Criteria

- [ ] `/chat` route exists and is protected by auth
- [ ] Empty state shows greeting with user's first name
- [ ] Clicking a suggestion sends the message
- [ ] User messages appear right-aligned in indigo
- [ ] AI responses appear left-aligned in gray
- [ ] Typing indicator shows while waiting
- [ ] Tasks refresh after AI operations
- [ ] Error messages display as assistant bubbles
- [ ] Sidebar, MobileNav, and Topbar show Chat nav item
- [ ] Works on mobile and desktop
- [ ] Dark mode supported

## 8. Dependencies

- Feature 1 (MCP Server) — must be deployed on Render
- Feature 2 (AI Agent) — `POST /api/{user_id}/chat` must be available
- `lib/api.ts` — `sendChatMessage()` function
- `context/TaskContext.tsx` — `refreshTasks()` method
- `lib/auth-client.ts` — `useSession()` for user_id
