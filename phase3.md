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

## Spec Structure

All features (base + bonus) follow the same SDD hierarchy under `specs/phase3-chatbot/`:

```
specs/phase3-chatbot/
├── mcp-server/          ← Feature 1 (done ✅)
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── ai-agent/            ← Feature 2 (done ✅)
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── chat-ui/             ← Feature 3 (done ✅)
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── voice-input/         ← Bonus 1
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── conversation-memory/ ← Bonus 2
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── smart-suggestions/   ← Bonus 3
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
└── multi-language/      ← Bonus 4
    ├── spec.md
    ├── plan.md
    └── tasks.md
```

---

## Execution Plan

### SDD Cascade Per Feature

Each feature (base AND bonus) goes through the full Spec-Driven Development cycle:

```
/sp.specify  → Write spec.md (WHAT we're building)
     ↓
/sp.clarify  → Find gaps and ambiguities in the spec
     ↓
/sp.plan     → Write plan.md (HOW we'll build it)
     ↓
/sp.tasks    → Write tasks.md (atomic work units)
     ↓
/sp.analyze  → Verify spec ↔ plan ↔ tasks alignment
     ↓
/sp.implement → Execute tasks locally
     ↓
User tests + approves → commit + deploy
```

**Base features:** Commit and deploy after each feature is complete.
**Bonus features:** Hold commit until user explicitly approves. If something breaks → revert to previous working version.

### Execution Order (strict, sequential)

```
Feature 1: MCP Server           ← Must exist first (AI Agent calls its tools)
     ↓ complete ✅
Feature 2: AI Agent              ← Must exist next (Chat UI talks to it)
     ↓ complete ✅
Feature 3: Chat UI               ← Needs both above working
     ↓ complete ✅
─── BASE COMPLETE (200 pts) ───
     ↓
Bonus 1: Voice Input             ← Frontend only, mic button + Web Speech API
     ↓ user approved → commit + deploy
Bonus 2: Conversation Memory     ← Verify + enhance history + "New Chat" button
     ↓ user approved → commit + deploy
Bonus 3: Smart Suggestions       ← AI generates follow-up chips
     ↓ user approved → commit + deploy
Bonus 4: Multi-language           ← Language matching + RTL support
     ↓ user approved → commit + deploy
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
- [x] MCP Server deployed on Render (https://todo-mcp-server-ept4.onrender.com)
- [x] Backend (with AI Agent) deployed on Vercel (https://backend-beta-green-78.vercel.app)
- [x] Chat UI deployed on Vercel (https://frontend-eight-coral-50.vercel.app/chat)
- [x] End-to-end test: user chats → AI calls MCP → task appears in dashboard (local)

---

## Bonus Features (After Base Completion)

All 3 base features are complete and deployed. Now we execute 4 bonus features **one at a time, sequentially**. Each bonus feature follows the same discipline:

1. Implement locally
2. Test until user is satisfied
3. Only commit + deploy after user approval
4. If something breaks → revert to previous working version, no partial commits

### Execution Order (strict, sequential)

```
Bonus 1: Voice Input          ← Frontend only, easiest win
     ↓ user approved → commit + deploy
Bonus 2: Conversation Memory  ← Already partially done, verify + enhance
     ↓ user approved → commit + deploy
Bonus 3: Smart Suggestions    ← AI prompt engineering + frontend UI
     ↓ user approved → commit + deploy
Bonus 4: Multi-language       ← Mostly free, verify + add UI language selector
     ↓ user approved → commit + deploy
```

**Rule:** No commit and no deploy until the user explicitly says "looks good, ship it." If something goes wrong, `git checkout` back to the last working state.

---

### Bonus 1: Voice Input
**Status:** [x] Implemented
**Effort:** Low (~30 lines of frontend code)
**Touches:** Frontend only — `ChatWindow.tsx`

**What:** Add a microphone button next to the send button. When clicked, it uses the browser's Web Speech API (`SpeechRecognition`) to transcribe voice to text, then sends it as a normal chat message.

**How it works:**
```
User clicks 🎤 → Browser listens → Speech-to-text → Text fills input → Auto-send
```

**Technical details:**
- Uses `window.SpeechRecognition` or `window.webkitSpeechRecognition` (built into Chrome/Edge)
- No external API needed — runs entirely in the browser, zero cost
- Falls back gracefully: if browser doesn't support it, hide the mic button
- Language auto-detected by the browser (supports English, Urdu, etc.)

**Files changed:**
- `frontend/components/chat/ChatWindow.tsx` — Add mic button + speech recognition logic

**Acceptance criteria:**
- [ ] Mic button visible next to send button
- [ ] Click mic → browser starts listening (visual indicator)
- [ ] Speech is transcribed to text and sent as message
- [ ] Works in Chrome and Edge
- [ ] Graceful fallback: mic button hidden if browser doesn't support speech
- [ ] Stop listening when user clicks mic again or after silence timeout

**Sub-Agent Hierarchy:**
```
Main Claude
│
├─ Read existing ChatWindow.tsx
├─ Add SpeechRecognition hook + mic button
├─ Test locally in browser
│
└─ Wait for user approval → commit + deploy
```

---

### Bonus 2: Conversation Memory
**Status:** [ ] Not started (partially implemented — DB stores messages, agent loads last 20)
**Effort:** Low-Medium (verify existing + minor enhancements)
**Touches:** Backend (`agent.py`, `routes/chat.py`) + Frontend (optional UI)

**What:** The AI remembers what you said earlier in the conversation. If you say "Add task Buy milk" then later say "Actually delete that one", the AI knows which task you mean.

**Current state (already built):**
- `Conversation` + `Message` tables store all messages in Neon DB
- `routes/chat.py` loads last 20 messages and passes them to the agent as history
- Agent receives history as `input_items` before the new message

**What needs verification/enhancement:**
1. **Verify** multi-turn context works end-to-end (test: add → list → "delete the first one")
2. **Enhance** system prompt to explicitly reference prior messages for context resolution
3. **Add conversation reset** — button or command to start a fresh conversation
4. **Show conversation continuity** — on page reload, load previous messages from DB

**Files changed:**
- `backend/agent.py` — Enhance system prompt for context awareness
- `backend/routes/chat.py` — Add GET endpoint to load conversation history
- `frontend/components/chat/ChatWindow.tsx` — Load previous messages on mount, add "New Chat" button
- `frontend/lib/api.ts` — Add `getChatHistory()` function

**Acceptance criteria:**
- [ ] AI correctly resolves references like "that one", "the first task", "delete it"
- [ ] Previous messages load when returning to chat page
- [ ] "New Chat" button clears conversation and starts fresh
- [ ] Context window is bounded (last 20 messages, not unbounded)

**Sub-Agent Hierarchy:**
```
Main Claude
│
├─ Explore Agent ─── Read current chat.py, agent.py, ChatWindow.tsx
├─ Test multi-turn context via curl or browser
│
├─ Main Claude ─── Enhance system prompt for context resolution
├─ Main Claude ─── Add GET /api/{user_id}/chat/history endpoint
├─ Main Claude ─── Add getChatHistory() to api.ts
├─ Main Claude ─── Load history on mount + "New Chat" button in ChatWindow.tsx
│
├─ Test end-to-end in browser
│
└─ Wait for user approval → commit + deploy
```

---

### Bonus 3: Smart Suggestions
**Status:** [ ] Not started
**Effort:** Medium (backend prompt engineering + frontend component)
**Touches:** Backend (agent system prompt) + Frontend (suggestion chips)

**What:** After the AI responds, it proactively suggests 2-3 relevant follow-up actions based on what just happened and the user's current task list.

**Examples:**
```
User: "Add task Review PR"
AI: "Done! I've added 'Review PR' to your tasks."
Suggestions: [📋 "List all tasks"] [✅ "Complete Review PR"] [➕ "Add another task"]

User: "List my tasks"
AI: "You have 5 tasks: ..."
Suggestions: [✅ "Complete task 3"] [🗑️ "Delete completed tasks"] [➕ "Add a new task"]
```

**How it works:**
1. **Backend:** Modify the system prompt to instruct the AI to end every response with a JSON block of suggestions
2. **Response parsing:** Backend strips the suggestion JSON from the response text
3. **Frontend:** Render suggestion chips below the AI response, clickable to send as new message

**Response format from AI:**
```
Done! I've added 'Review PR' to your tasks.

<!--suggestions:["List all tasks","Complete Review PR","Add another task"]-->
```

**Files changed:**
- `backend/agent.py` — Update system prompt to generate suggestions
- `backend/routes/chat.py` — Parse suggestions from response, return in API response
- `backend/models.py` — Add `suggestions` field to ChatResponse schema (optional)
- `frontend/components/chat/ChatWindow.tsx` — Render suggestion chips below AI messages
- `frontend/lib/api.ts` — Update ChatResponse type to include suggestions

**Acceptance criteria:**
- [ ] AI generates 2-3 contextual suggestions after every response
- [ ] Suggestions appear as clickable chips below the AI message
- [ ] Clicking a suggestion sends it as a new user message
- [ ] Suggestions are relevant to the action just performed
- [ ] If AI fails to generate suggestions, no chips shown (graceful fallback)

**Sub-Agent Hierarchy:**
```
Main Claude
│
├─ Explore Agent ─── Read current agent.py system prompt, ChatWindow.tsx
│
├─ Main Claude ─── Update system prompt with suggestion instructions
├─ Main Claude ─── Add suggestion parsing in chat.py
├─ Main Claude ─── Update ChatResponse model
├─ Main Claude ─── Add suggestion chips component in ChatWindow.tsx
├─ Main Claude ─── Update api.ts ChatResponse type
│
├─ Test end-to-end: verify suggestions appear and are clickable
│
└─ Wait for user approval → commit + deploy
```

---

### Bonus 4: Multi-language
**Status:** [ ] Not started (partially works — OpenAI handles translation natively)
**Effort:** Low (verify + add explicit support)
**Touches:** Backend (system prompt) + Frontend (language indicator)

**What:** Users can chat in any language (English, Urdu, Spanish, Arabic, etc.) and the AI responds in the same language. OpenAI models handle this natively, but we add explicit support to make it robust.

**Current state:**
- OpenAI GPT-4o-mini already understands and responds in many languages
- No explicit language handling in system prompt

**What needs to be done:**
1. **Verify** multi-language works (test: chat in Urdu, Spanish, Arabic)
2. **Update system prompt** to explicitly say "Respond in the same language the user uses"
3. **Add language selector** (optional) — small dropdown in chat UI to set preferred language
4. **Test RTL languages** (Arabic, Urdu) — ensure chat bubbles render correctly

**Files changed:**
- `backend/agent.py` — Add "respond in user's language" to system prompt
- `frontend/components/chat/ChatWindow.tsx` — Add RTL support for message bubbles, optional language selector

**Acceptance criteria:**
- [ ] Chat in Urdu → AI responds in Urdu
- [ ] Chat in Spanish → AI responds in Spanish
- [ ] Chat in Arabic → AI responds in Arabic with proper RTL text direction
- [ ] Mixed language works (English question about Urdu task name)
- [ ] System prompt explicitly instructs language matching

**Sub-Agent Hierarchy:**
```
Main Claude
│
├─ Main Claude ─── Update system prompt with language instructions
├─ Main Claude ─── Add RTL detection for message bubbles
├─ Main Claude ─── (Optional) Add language selector dropdown
│
├─ Test: chat in Urdu, Spanish, Arabic via browser
│
└─ Wait for user approval → commit + deploy
```

---

## Bonus Deliverables Checklist

- [x] **Bonus 1 — Voice Input:** Mic button in chat, browser speech-to-text
- [ ] **Bonus 2 — Conversation Memory:** History persistence, context resolution, "New Chat" button
- [ ] **Bonus 3 — Smart Suggestions:** AI-generated suggestion chips after each response
- [ ] **Bonus 4 — Multi-language:** Explicit language support, RTL rendering, language matching

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

### Bonus execution philosophy
- One bonus at a time, strictly sequential
- No commit until user approves
- No deploy until user approves
- If something breaks → `git checkout` to last working state
- Each bonus is an isolated, self-contained change

---

## Next Step

Start **Bonus 1 (Voice Input)** — add microphone button to ChatWindow.tsx with Web Speech API.






