# Spec: AI Agent — Natural Language Task Management

**Feature:** AI Agent using OpenAI Agents SDK + MCP integration
**Phase:** 3 — AI Chatbot
**Date:** 2026-02-23

---

## 1. Purpose

Create an AI agent that understands natural language commands and manages tasks by calling the MCP Server tools from Feature 1. Users type "Add buy groceries" and the agent creates the task.

## 2. In Scope

- OpenAI Agents SDK integration with MCP Server (SSE transport)
- System prompt optimized for task management
- Multi-turn conversation with session persistence
- FastAPI chat endpoint: `POST /api/{user_id}/chat`
- Conversation + Message DB models for chat history
- User-scoped conversations (each user has their own chat)

## 3. Out of Scope

- Voice input (bonus feature, later)
- Chat UI frontend (Feature 3)
- Streaming responses (v1 returns full response, streaming in v2)
- Multi-agent handoffs

## 4. Dependencies

- **MCP Server** (Feature 1) — running on port 8001 (local) or Render URL (prod)
- **OpenAI API** — `OPENAI_API_KEY` environment variable
- **Neon PostgreSQL** — same database, new tables for chat history

## 5. Agent Configuration

### 5.1 System Prompt

```
You are TaskFlow Assistant, an AI that helps users manage their to-do tasks.
You have access to tools that can add, list, complete, delete, and update tasks.

Rules:
- When the user asks to add a task, use the add_task tool.
- When the user asks to see their tasks, use the list_tasks tool.
- When the user asks to complete/finish a task, use the complete_task tool.
- When the user asks to delete/remove a task, use the delete_task tool.
- When the user asks to update/edit a task, use the update_task tool.
- Always pass the user_id that was provided in the context.
- After performing an action, confirm what you did in a friendly, concise way.
- If the user's request is ambiguous, ask for clarification.
- For list_tasks, format the results in a readable way.
```

### 5.2 Model

- Default: `gpt-4o-mini` (fast, cheap, good enough for tool calling)
- Configurable via `OPENAI_MODEL` env var

### 5.3 MCP Connection

- Connect to MCP Server via `MCPServerSse` at `MCP_SERVER_URL` env var
- `cache_tools_list=True` (tools don't change at runtime)

## 6. Chat Endpoint

### `POST /api/{user_id}/chat`

**Request body:**
```json
{
  "message": "Add a task called Buy groceries"
}
```

**Response body:**
```json
{
  "response": "Done! I've added 'Buy groceries' to your tasks.",
  "conversation_id": "conv_abc123"
}
```

**Headers:** `Authorization: Bearer <JWT>` (same auth as existing endpoints)

**Error responses:**
- 401: Missing/invalid JWT
- 400: Empty message
- 500: Agent/MCP error

## 7. Database Models

### 7.1 Conversation

| Column | Type | Description |
|--------|------|-------------|
| id | str (PK) | UUID |
| user_id | str (FK) | Owner |
| created_at | datetime | Auto-set |
| updated_at | datetime | Auto-refreshed |

### 7.2 Message

| Column | Type | Description |
|--------|------|-------------|
| id | str (PK) | UUID |
| conversation_id | str (FK) | Parent conversation |
| role | str | "user" or "assistant" |
| content | text | Message text |
| created_at | datetime | Auto-set |

## 8. Conversation Flow

1. User sends message to `POST /api/{user_id}/chat`
2. Backend finds or creates a conversation for the user
3. Stores user message in the Message table
4. Creates agent with MCP connection, passes user_id in context
5. Runs agent with conversation history
6. Stores assistant response in the Message table
7. Returns response to the client

## 9. Acceptance Criteria

- [ ] Agent connects to MCP Server and discovers all 5 tools
- [ ] "Add buy groceries" → creates a task in the DB
- [ ] "Show my tasks" → returns formatted task list
- [ ] "Complete task 28" → toggles task completion
- [ ] "Delete task 28" → removes the task
- [ ] "Update task 28 title to Buy milk" → updates the task
- [ ] Multi-turn works: "Add 3 tasks" → "Delete the last one"
- [ ] Chat history persisted in Conversation + Message tables
- [ ] Each user has isolated conversations
- [ ] Endpoint requires JWT authentication
