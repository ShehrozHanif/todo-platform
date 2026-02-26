# Implementation Plan: Conversation Memory

**Branch**: `master` | **Date**: 2026-02-26 | **Spec**: `specs/phase3-chatbot/conversation-memory/spec.md`

## Summary

Enhance the existing conversation infrastructure to support context resolution, history persistence across page reloads, and a "New Chat" reset. Four files modified, ~50 lines total, no schema changes.

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Next.js/React (all existing)
**Storage**: Neon PostgreSQL (existing Conversation + Message tables)
**Testing**: Manual browser testing + curl
**Constraints**: No new DB tables, no new npm packages, bounded to 20 messages

## Constitution Check

- Smallest viable diff: YES (4 files, ~50 lines)
- No new dependencies: YES
- Reuses existing models: YES
- No security implications: YES (GET endpoint uses same JWT auth as POST)

## Project Structure

### Files Modified

```text
backend/
├── agent.py              # MODIFY: Enhance system prompt for context resolution
└── routes/chat.py        # MODIFY: Add GET /api/{user_id}/chat/history endpoint

frontend/
├── lib/api.ts            # MODIFY: Add getChatHistory() function
└── components/chat/
    └── ChatWindow.tsx     # MODIFY: Load history on mount, add "New Chat" button
```

No new files. No schema migrations.

## Architecture Decision

**Decision**: Reuse existing Conversation model, add GET endpoint, load on frontend mount.

**Why**:
- Conversation + Message tables already persist every message
- POST endpoint already loads last 20 messages for the agent
- GET endpoint mirrors the same query but returns to frontend
- "New Chat" = clear frontend state + set flag to create new Conversation on next POST

**Rejected alternatives**:
- WebSocket for real-time history sync — overkill for this use case
- LocalStorage cache — adds complexity, DB is the source of truth
- Separate conversation list page — out of scope, just show latest conversation

## Implementation Details

### 1. System Prompt Enhancement (agent.py)

Add to the existing system prompt:
```
Use the conversation history to resolve references. If the user says "it", "that one",
"the first task", or similar, look at previous messages to determine what they're referring to.
```

### 2. GET Endpoint (routes/chat.py)

```python
@router.get("/{user_id}/chat/history")
async def get_chat_history(user_id: str, db: AsyncSession):
    # Find latest conversation for user
    # Return last 20 messages as [{role, content, created_at}]
    # Return empty array if no conversation exists
```

Response schema: `{ messages: [{role: string, content: string, timestamp: string}] }`

### 3. Frontend API Function (api.ts)

```typescript
export async function getChatHistory(userId: string): Promise<ChatMessage[]> {
    return apiFetch<{messages: ...}>(`/api/${userId}/chat/history`);
}
```

### 4. Frontend Integration (ChatWindow.tsx)

- `useEffect` on mount: call `getChatHistory(userId)`, map to `ChatMessage[]`, set state
- "New Chat" button: clear messages state, set `conversationId` to null
- Button placement: top-right of chat area or in the header area

## Complexity Tracking

No constitution violations. Four-file change, additive only.
