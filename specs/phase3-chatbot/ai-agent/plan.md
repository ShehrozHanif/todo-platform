# Plan: AI Agent — Architecture

**Feature:** AI Agent
**Phase:** 3 — AI Chatbot
**Date:** 2026-02-23

---

## 1. Key Decisions

### 1.1 Agent lives in the backend (not a separate service)

**Decision:** Add the chat endpoint and agent logic to the existing FastAPI backend.

**Rationale:**
- Reuses existing JWT auth middleware
- Reuses existing DB session management
- One less service to deploy and manage
- The agent is lightweight — just an API call wrapper

### 1.2 Conversation per user (not per session)

**Decision:** Each user has one active conversation. New messages append to it.

**Rationale:**
- Simpler than managing multiple conversations per user
- For a task management chatbot, one ongoing conversation makes sense
- Can extend to multiple conversations later if needed

### 1.3 Manual history management (not SQLiteSession)

**Decision:** Store messages in Neon DB (Message table) and pass history manually via `to_input_list()` pattern.

**Rationale:**
- SQLiteSession stores locally — doesn't work across serverless instances
- We need Neon DB for persistence across Vercel/Render deployments
- More control over history (can limit context window, prune old messages)

### 1.4 Model: gpt-4o-mini

**Decision:** Use `gpt-4o-mini` as default model.

**Rationale:**
- Fast, cheap (~$0.15/1M input tokens)
- Good at tool calling
- Configurable via env var if user wants to upgrade

---

## 2. Architecture

```
Browser (Chat UI)
    │
    │ POST /api/{user_id}/chat
    │ { "message": "Add buy groceries" }
    │
    ▼
FastAPI Backend (existing)
    │
    ├── JWT Auth Middleware (existing)
    │
    ├── Chat Route (/api/{user_id}/chat)
    │   ├── Find/create conversation
    │   ├── Store user message
    │   ├── Build history from Message table
    │   ├── Create Agent + connect MCP
    │   ├── Run agent with history
    │   ├── Store assistant response
    │   └── Return response
    │
    ▼
OpenAI Agents SDK
    │
    │ MCPServerSse("http://localhost:8001/sse")
    │
    ▼
MCP Server (Feature 1)
    │
    ▼
Neon PostgreSQL
```

## 3. File Structure

```
backend/
  routes/
    tasks.py          ← existing (no changes)
    chat.py           ← NEW: POST /api/{user_id}/chat
  models.py           ← ADD: Conversation + Message models
  agent.py            ← NEW: Agent setup + MCP connection
  main.py             ← ADD: mount chat router
```

## 4. Agent Implementation

```python
# agent.py
from agents import Agent
from agents.mcp import MCPServerSse

MCP_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """You are TaskFlow Assistant..."""

async def run_agent(user_id: str, message: str, history: list) -> str:
    async with MCPServerSse(
        name="todo-mcp",
        params={"url": MCP_URL},
        cache_tools_list=True,
    ) as mcp_server:
        agent = Agent(
            name="TaskFlow Assistant",
            instructions=SYSTEM_PROMPT.format(user_id=user_id),
            model=MODEL,
            mcp_servers=[mcp_server],
        )
        # Build input: history + new message
        input_items = history + [{"role": "user", "content": message}]
        result = await Runner.run(agent, input_items)
        return result.final_output
```

## 5. Environment Variables (new)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `MCP_SERVER_URL` | No | `http://localhost:8001/sse` | MCP server SSE endpoint |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use |
