# Tasks: AI Agent

**Feature:** AI Agent
**Phase:** 3 — AI Chatbot
**Date:** 2026-02-23

---

## T001: Add Conversation + Message DB models

**Files to modify:** `backend/models.py`

**Add:**
- `Conversation` model (id, user_id, created_at, updated_at)
- `Message` model (id, conversation_id, role, content, created_at)

**Acceptance criteria:**
- [ ] Tables created on backend startup
- [ ] Models match spec §7

---

## T002: Install openai-agents dependency

**Files to modify:** `backend/pyproject.toml`

**Add:** `openai-agents` to dependencies

**Acceptance criteria:**
- [ ] `uv sync` installs the package

---

## T003: Create agent.py with MCP connection

**Files to create:** `backend/agent.py`

**Implement:**
- `run_agent(user_id, message, history)` function
- MCPServerSse connection to MCP server
- System prompt with user_id injection
- Returns assistant text response

**Acceptance criteria:**
- [ ] Agent connects to MCP server
- [ ] Discovers all 5 tools
- [ ] Returns text response for a task command

---

## T004: Create chat route

**Files to create:** `backend/routes/chat.py`
**Files to modify:** `backend/main.py`

**Implement:**
- `POST /api/{user_id}/chat` endpoint
- Find or create conversation for user
- Store user message, run agent, store response
- Return response with conversation_id
- JWT auth via existing middleware

**Acceptance criteria:**
- [ ] Endpoint requires auth
- [ ] Creates conversation on first message
- [ ] Stores messages in DB
- [ ] Returns agent response
- [ ] Multi-turn works (history passed to agent)

---

## T005: Test end-to-end

**Test:**
1. Start MCP server
2. Start backend
3. Send "Add a task called Test from AI"
4. Verify task appears in DB
5. Send "Show my tasks"
6. Verify response lists the task
7. Send "Delete that task"
8. Verify task removed

**Acceptance criteria:**
- [ ] Full conversation flow works
- [ ] Tasks created/modified via chat appear in web dashboard

---

## Dependencies

```
T001 (models) + T002 (install) → T003 (agent.py) → T004 (chat route) → T005 (test)
```
