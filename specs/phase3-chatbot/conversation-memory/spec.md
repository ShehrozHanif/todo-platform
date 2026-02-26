# Spec: Conversation Memory — Persistent Chat Context

**Feature:** Conversation memory with history persistence and context resolution
**Phase:** 3 — AI Chatbot (Bonus 2)
**Spec Location:** `specs/phase3-chatbot/conversation-memory/`
**Status:** Draft
**Date:** 2026-02-26

---

## 1. Purpose

Enable the AI assistant to remember prior messages within a conversation, resolve pronoun references ("that one", "delete it"), persist chat history across page reloads, and allow users to start fresh conversations.

## 2. Background

Phase 3 base features already built the foundation:
- `Conversation` and `Message` DB tables exist and store all messages
- `POST /api/{user_id}/chat` loads last 20 messages and passes them as history to the AI agent
- The AI agent receives history but the system prompt doesn't explicitly instruct context resolution
- Frontend does NOT load previous messages on mount — every page visit starts with an empty chat
- No way to start a new conversation

## 3. In Scope

- Enhance AI system prompt for explicit context resolution ("that one", "the first task", "delete it")
- Add `GET /api/{user_id}/chat/history` endpoint to retrieve conversation messages
- Add `getChatHistory()` function to frontend API client
- Load previous messages on chat page mount
- Add "New Chat" button to start a fresh conversation
- Context window bounded to last 20 messages (already implemented)

## 4. Out of Scope

- Multiple conversation list / conversation switcher UI
- Conversation search
- Message editing or deletion
- Exporting conversation history
- Cross-conversation memory (remembering things from previous conversations)

## 5. User Scenarios & Testing

### User Story 1 — Context Resolution (Priority: P1)

User has a multi-turn conversation where they reference previous messages. The AI correctly understands what "it", "that one", "the first task" refers to.

**Why this priority**: This is the core value of conversation memory — without it, the AI feels stateless.

**Independent Test**: Send "Add task Buy milk", then send "delete it" — AI should delete "Buy milk".

**Acceptance Scenarios**:

1. **Given** user sent "Add a task called Buy milk", **When** user sends "delete it", **Then** AI deletes the "Buy milk" task.
2. **Given** user sent "List my tasks" and got 3 tasks, **When** user sends "complete the first one", **Then** AI completes the first task from the list.
3. **Given** user sent "Add task Review PR", **When** user sends "actually rename that to Review documentation", **Then** AI updates the task title.

---

### User Story 2 — History Persistence (Priority: P1)

User navigates away from chat page and returns — previous messages are still visible.

**Why this priority**: Without this, the chat feels broken on every page reload.

**Independent Test**: Send a message, navigate to dashboard, return to chat — messages should be there.

**Acceptance Scenarios**:

1. **Given** user has sent 5 messages in chat, **When** user refreshes the page, **Then** all 5 messages (user + AI) are displayed.
2. **Given** user navigates to dashboard then back to chat, **When** chat page loads, **Then** previous conversation messages appear.
3. **Given** a conversation has 30+ messages, **When** chat loads, **Then** only the last 20 messages are shown (bounded context).

---

### User Story 3 — New Chat (Priority: P2)

User can start a fresh conversation by clicking "New Chat", clearing the current messages.

**Why this priority**: Users need an escape hatch to start over without stale context.

**Independent Test**: Send messages, click "New Chat", verify chat is empty and next message starts a new conversation.

**Acceptance Scenarios**:

1. **Given** user has an active conversation with messages, **When** user clicks "New Chat", **Then** the message list clears and the empty state (greeting + suggestions) appears.
2. **Given** user clicked "New Chat", **When** user sends a new message, **Then** a new `Conversation` is created in the database (old one is preserved).

---

### Edge Cases

- User has no previous conversation → show empty state as usual
- GET history returns empty array → show empty state
- GET history fails (network error) → show empty state, don't block chat
- Very long messages in history → render normally (already handled by existing UI)
- User sends message while history is still loading → queue it, don't lose it

## 6. Functional Requirements

- **FR-001**: Backend MUST provide `GET /api/{user_id}/chat/history` returning messages from the latest conversation
- **FR-002**: GET endpoint MUST return at most 20 messages, ordered by creation time
- **FR-003**: AI system prompt MUST explicitly instruct context resolution using conversation history
- **FR-004**: Frontend MUST call `getChatHistory()` on chat page mount and populate message list
- **FR-005**: Frontend MUST show a "New Chat" button when messages exist
- **FR-006**: "New Chat" MUST clear local messages and create a new conversation on next send
- **FR-007**: History loading MUST NOT block the chat — if it fails, show empty state silently

## 7. Technical Constraints

- Reuse existing `Conversation` and `Message` models (no schema changes)
- Bounded to last 20 messages (already enforced in POST endpoint)
- No streaming — history loaded in a single GET request
- JWT auth required on GET endpoint (same as POST)

## 8. Success Criteria

- **SC-001**: "Add task X" → "delete it" works correctly (AI resolves "it")
- **SC-002**: Page refresh preserves chat history
- **SC-003**: "New Chat" clears messages and starts fresh conversation
- **SC-004**: No regressions to existing chat functionality
