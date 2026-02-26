# Tasks: Smart Suggestions

**Input**: Design documents from `specs/phase3-chatbot/smart-suggestions/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Backend — System Prompt + Parsing

- [ ] T001 [US1] Add suggestion generation instruction to system prompt in `backend/agent.py`. Instruct AI to append `<!--suggestions:["..."]-->` at the end of every response.
- [ ] T002 [US1] Add `parse_suggestions()` function in `backend/routes/chat.py` that extracts suggestions JSON from `<!--suggestions:[...]-->` marker and returns clean text + suggestions list.
- [ ] T003 [US1] Add `suggestions: list[str] = []` field to `ChatResponse` model in `backend/routes/chat.py`.
- [ ] T004 [US1] Call `parse_suggestions()` on agent response in the POST handler, store clean text in DB, return suggestions in API response.

**Checkpoint**: `curl POST /api/{user_id}/chat` returns `{response: "...", suggestions: ["...", "..."]}`.

---

## Phase 2: Frontend — API + Chips

- [ ] T005 [US1] Add `suggestions?: string[]` to `ChatResponse` interface in `frontend/lib/api.ts`.
- [ ] T006 [US1] Add `suggestions` field to `ChatMessage` interface and store suggestions from API response in `frontend/components/chat/ChatWindow.tsx`.
- [ ] T007 [US1] Render suggestion chips below the latest AI message. Chips are clickable and call `handleSend(chipText)`. Style: small rounded buttons with indigo border.

**Checkpoint**: AI responds → suggestion chips appear → click sends as message.

---

## Phase 3: Polish

- [ ] T008 Verify suggestions are contextual (different after add vs list vs complete)
- [ ] T009 Verify graceful fallback when AI doesn't generate suggestions
- [ ] T010 Verify no suggestion marker text visible in chat bubbles

---

## Dependencies

```
T001 → T002 → T003 → T004 (backend, sequential)
T005 (frontend API, depends on T003)
T006 → T007 (frontend UI, depends on T005)
T008-T010 (verification, depends on all above)
```
