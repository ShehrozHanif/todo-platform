# Phase 3 — AI Chatbot (200 pts)

## Overview

Phase 3 adds a **third interface** to the todo platform: natural language chat. Users will be able to manage tasks by talking to an AI instead of clicking buttons or typing commands.

```
Phase 1: CLI       → type commands in terminal
Phase 2: Web UI    → click buttons in browser
Phase 3: AI Chat   → tell the AI in natural language what to do
```

**Points:** 200 (base) + potential bonus features

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEON PostgreSQL                          │
│  (Same DB as Phase 2 — tasks, users, sessions + NEW: messages)  │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
          ┌────────┴────────┐    ┌────────┴────────┐
          │  FastAPI Backend │    │   MCP Server    │
          │  (Vercel)        │    │   (Render)      │
          │  REST/HTTP       │    │   MCP Protocol  │
          └────────┬────────┘    └────────┬────────┘
                   │                      │
          ┌────────┴────────┐    ┌────────┴────────┐
          │  Next.js Frontend│    │   AI Agent      │
          │  (Vercel)        │    │   (Render)      │
          │  Web Dashboard   │    │   OpenAI SDK    │
          └─────────────────┘    └────────┬────────┘
                                          │
                                 ┌────────┴────────┐
                                 │   Chat UI       │
                                 │   (Vercel)      │
                                 │   ChatKit       │
                                 └─────────────────┘
```

### Key Principle: Two Doors, Same Room

- **FastAPI Backend** = API for the browser (REST/HTTP)
- **MCP Server** = API for the AI (MCP protocol)
- Both connect to the **same Neon database**
- A task added via chat appears instantly in the web dashboard

### Deployment Strategy

| Service | Platform | Why |
|---------|----------|-----|
| Frontend + Chat UI | Vercel | Already deployed, static + serverless |
| FastAPI Backend | Vercel | Already deployed, no changes needed |
| MCP Server + AI Agent | Render | Needs long-running process, persistent connections |
| Database | Neon PostgreSQL | Shared across all services, no changes to existing tables |

**Phase 2 is completely untouched.** We only ADD new services and new DB tables.

---

## Three Features (Strict Execution Order)

### Feature 1: MCP Server
**Spec location:** `specs/phase3-chatbot/mcp-server/`

**What:** A Python server that exposes 5 tools via the MCP protocol, allowing any AI to manage tasks.

**5 MCP Tools:**

| Tool | Input | Output | Maps to |
|------|-------|--------|---------|
| `add_task` | user_id, title, description? | Created task object | POST /api/{user_id}/tasks |
| `list_tasks` | user_id | Array of tasks | GET /api/{user_id}/tasks |
| `complete_task` | user_id, task_id | Updated task object | PATCH /api/{user_id}/tasks/{id}/complete |
| `delete_task` | user_id, task_id | Success confirmation | DELETE /api/{user_id}/tasks/{id} |
| `update_task` | user_id, task_id, title?, description? | Updated task object | PUT /api/{user_id}/tasks/{id} |

**Why MCP instead of direct DB access:**
1. **Separation of concerns** — AI calls tools, doesn't know SQL
2. **Reusability** — Any AI (Claude, Gemini, local LLMs) can use the same server
3. **Safety** — MCP server is a gatekeeper with only 5 validated operations
4. **Hackathon requirement** — Phase 3 explicitly requires an MCP Server

**Properties:**
- Stateless (no in-memory state, everything in Neon DB)
- Reuses existing DB schema from Phase 2
- Lives in `agents/mcp-server/`

---

### Feature 2: AI Agent
**Spec location:** `specs/phase3-chatbot/ai-agent/`

**What:** An OpenAI Agents SDK integration that takes natural language input, understands intent, and calls the appropriate MCP tools.

**Flow:**
```
User: "Add a task called Buy groceries"
  ↓
AI Agent parses intent → add_task
  ↓
Calls MCP tool: add_task(title="Buy groceries")
  ↓
MCP Server creates task in Neon DB
  ↓
AI Agent responds: "Done! I've added 'Buy groceries' to your tasks."
```

**Capabilities:**
- Natural language → tool mapping
- Multi-turn conversation (remembers context within a session)
- Conversation + Message persistence in DB
- New endpoint: `POST /api/{user_id}/chat`

**New DB Tables:**
- `conversation` — Chat sessions per user
- `message` — Individual messages (user + AI) per conversation

---

### Feature 3: Chat UI
**Spec location:** `specs/phase3-chatbot/chat-ui/`

**What:** An OpenAI ChatKit frontend integrated into the existing Next.js app, providing a chat interface for task management.

**Components:**
- Chat page at `/chat` route (inside the app layout)
- ChatWindow component (message history + input)
- MessageBubble component (user vs AI styling)
- Domain allowlist configuration
- Auth integration (session → user_id → chat)

---

## Execution Plan

### SDD Cascade Per Feature

Each feature goes through the full Spec-Driven Development cycle:

```
/sp.specify  → Define WHAT we're building (requirements)
     ↓
/sp.clarify  → Find gaps and ambiguities
     ↓
/sp.plan     → Design HOW we'll build it (architecture)
     ↓
Create Skill → Build reusable template based on the plan
     ↓
/sp.tasks    → Break into atomic work units
     ↓
/sp.analyze  → Verify spec ↔ plan ↔ tasks alignment
     ↓
/sp.checklist → Generate validation checklist
     ↓
/sp.implement → Execute using skills + sub-agents
     ↓
/sp.git.commit_pr → Commit and ship
```

**Important:** Skills are created AFTER planning (not before), because we need the spec and plan to know what the skill should generate.

### Execution Order (strict, sequential)

```
Feature 1: MCP Server    ← Must exist first (AI Agent calls its tools)
     ↓ complete
Feature 2: AI Agent      ← Must exist next (Chat UI talks to it)
     ↓ complete
Feature 3: Chat UI       ← Needs both above working
     ↓ complete
Bonus: Voice Input       ← Optional enhancement on top of Chat UI
```

No parallel feature work. Each feature is fully done before the next starts.

---

## Skills Required

| # | Skill | Purpose | Status | Used In |
|---|-------|---------|--------|---------|
| 1 | MCP Server Generator | Scaffold MCP server with tool definitions + DB connection | **Create during Feature 1 plan** | Feature 1 |
| 2 | OpenAI Agent Generator | Scaffold AI agent with tool mapping + system prompt | **Create during Feature 2 plan** | Feature 2 |
| 3 | Neon SQLModel Generator | DB models and async Neon connection | Already exists | Feature 1, 2 |
| 4 | FastAPI CRUD Generator | REST API endpoints | Already exists | Feature 2 |
| 5 | Next.js Todo UI Generator | Frontend pages and components | Already exists | Feature 3 |

---

## Sub-Agent Hierarchy

### Feature 1: MCP Server

```
Main Claude
│
├─ Explore Agent ─── Research MCP SDK, protocol, existing code
│
├─ Plan Agent ────── Design server structure, tool schemas, DB strategy
│
├─ Main Claude ───── Create "MCP Server Generator" skill
│
├─ General Purpose Agent ─── Build server.py + tools.py (uses MCP skill)
├─ General Purpose Agent ─── Reuse DB connection (uses Neon SQLModel skill)
├─ Bash Agent ────────────── Install deps, run server, test tools
│
└─ Bash Agent ─── Integration tests, git commit
```

### Feature 2: AI Agent

```
Main Claude
│
├─ Explore Agent ─── Research OpenAI Agents SDK, MCP integration
│
├─ Plan Agent ────── Design system prompt, tool mapping, conversation flow
│
├─ Main Claude ───── Create "OpenAI Agent Generator" skill
│
├─ General Purpose Agent ─── Build agent.py (uses OpenAI Agent skill)
├─ General Purpose Agent ─── Create Conversation + Message models (uses Neon SQLModel skill)
├─ General Purpose Agent ─── Create POST /api/{user_id}/chat (uses FastAPI CRUD skill)
├─ Bash Agent ────────────── Install SDK, test agent, verify tool calls
│
└─ Bash Agent ─── Tests, git commit
```

### Feature 3: Chat UI

```
Main Claude
│
├─ Explore Agent ─── Research ChatKit, domain allowlist, frontend patterns
│
├─ Plan Agent ────── Design chat page, message streaming, auth integration
│
├─ General Purpose Agent ─── Build chat page + components (uses Next.js UI skill)
├─ Bash Agent ────────────── Install deps, test end-to-end, deploy
│
└─ Bash Agent ─── Tests, git commit, Vercel deploy
```

---

## Deliverables Checklist

- [x] `agents/mcp-server/` — Python MCP server with 5 tools
- [x] `backend/agent.py` — OpenAI Agents SDK integration (lives in backend)
- [x] `POST /api/{user_id}/chat` endpoint
- [x] Chat UI page at `/chat` in the Next.js frontend
- [x] New DB tables: `conversation`, `message`
- [x] Conversation + Message models
- [ ] MCP Server deployed on Render
- [ ] Backend (with AI Agent) deployed on Vercel
- [ ] Chat UI deployed on Vercel
- [x] End-to-end test: user chats → AI calls MCP → task appears in dashboard (local)

---

## Bonus Features (After Base Completion)

These are enhancements to add ONLY after all 3 base features are working:

| Feature | Effort | How |
|---------|--------|-----|
| **Voice Input** | Low (~30 lines) | Browser Web Speech API → text → same chat flow |
| **Conversation Memory** | Medium | AI remembers context across messages using DB history |
| **Smart Suggestions** | Medium | AI proactively suggests based on task patterns |
| **Multi-language** | Free | OpenAI handles natively, no extra code |

**Strategy:** Build the solid foundation first. Voice is literally just plugging a microphone into the text input — useless without a working chat, trivial with one.

---

## Discussion Notes (From Planning Session)

### Why MCP over direct DB access?
- Standardized protocol — any AI can plug in
- Safety gatekeeper — only 5 validated operations
- Separation of concerns — AI doesn't know SQL
- Hackathon requirement

### Why Render for Phase 3 backend?
- MCP Server needs long-running process (not serverless)
- OpenAI Agent SDK needs persistent connections
- Free tier is sufficient
- Phase 2 Vercel deployment stays untouched

### Why skills after planning, not before?
- Skills are code generation templates
- Without knowing the exact requirements (from spec + plan), we'd be guessing
- Building skills from real architectural decisions = templates that actually match

### Execution philosophy
- One feature at a time, fully complete before next
- No parallel feature work
- Each feature follows full SDD cascade
- Smallest viable diff — don't refactor unrelated code

---

## Next Step

Start Feature 1 (MCP Server) with `/sp.specify` to define the full specification.
