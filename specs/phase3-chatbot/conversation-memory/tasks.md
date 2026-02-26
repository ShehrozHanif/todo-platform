# Tasks: Conversation Memory

**Input**: Design documents from `specs/phase3-chatbot/conversation-memory/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Backend — Context Resolution (US1)

**Goal**: AI correctly resolves pronoun references using conversation history.

- [ ] T001 [US1] Enhance system prompt in `backend/agent.py` to explicitly instruct context resolution using conversation history. Add instruction about resolving "it", "that one", "the first task" from prior messages.

**Checkpoint**: Test via curl — "Add task Buy milk" then "delete it" should work.

---

## Phase 2: Backend — History Endpoint (US2)

**Goal**: Frontend can retrieve conversation history from backend.

- [ ] T002 [US2] Add `GET /api/{user_id}/chat/history` endpoint in `backend/routes/chat.py` that returns last 20 messages from the user's latest conversation. Return `{ messages: [{role, content, timestamp}] }`. Return empty messages array if no conversation exists.
- [ ] T003 [US2] Add response schema `ChatHistoryResponse` in `backend/models.py` with `messages: list[ChatMessageItem]` where `ChatMessageItem` has `role: str`, `content: str`, `timestamp: str`.

**Checkpoint**: `curl GET /api/{user_id}/chat/history` returns previous messages.

---

## Phase 3: Frontend — API Client (US2)

**Goal**: Frontend can call the history endpoint.

- [ ] T004 [US2] Add `getChatHistory(userId: string)` function in `frontend/lib/api.ts` that calls `GET /api/${userId}/chat/history` and returns the messages array.

**Checkpoint**: Function callable, returns data from backend.

---

## Phase 4: Frontend — History Loading + New Chat (US2, US3)

**Goal**: Chat loads previous messages on mount, user can start fresh.

- [ ] T005 [US2] Add `useEffect` in FallbackChat (`frontend/components/chat/ChatWindow.tsx`) that calls `getChatHistory(userId)` on mount and populates the messages state. Handle errors silently (show empty state).
- [ ] T006 [US3] Add "New Chat" button in `frontend/components/chat/ChatWindow.tsx` that clears messages state and sets a flag to create a new conversation on next send. Button visible only when messages exist. Placed at top of chat area.
- [ ] T007 [US3] Add `POST /api/{user_id}/chat/new` endpoint in `backend/routes/chat.py` OR pass `new_conversation: true` flag in existing POST body to force new conversation creation.

**Checkpoint**: Refresh page → messages persist. Click "New Chat" → empty state. New message → fresh conversation.

---

## Phase 5: Polish

- [ ] T008 Verify end-to-end: multi-turn context resolution, history persistence, new chat reset
- [ ] T009 Verify no regressions to existing chat (send, receive, voice input, suggestions)

---

## Dependencies & Execution Order

```
T001 (system prompt) — independent, can start immediately
T002 + T003 (GET endpoint + schema) — sequential
T004 (frontend API) — depends on T002
T005 (history loading) — depends on T004
T006 + T007 (New Chat) — depends on T005
T008 + T009 (verification) — depends on all above
```

## Notes

- No new DB tables or migrations
- No new npm packages
- Total: ~50 lines across 4 files
- All changes are additive — no existing behavior modified (except system prompt enhancement)
