# **AGENTS.md — Todo Platform Hackathon II**

## **Purpose**

This project uses **Spec-Driven Development (SDD)** — a workflow where **no agent is allowed to write code until the specification is complete and approved**.
All AI agents (Claude, Copilot, Gemini, local LLMs, etc.) must follow the **Spec-Kit lifecycle**:

> **Specify → Clarify → Plan → Tasks → Analyze → Implement**

This prevents "vibe coding," ensures alignment across agents, and guarantees that every implementation step maps back to an explicit requirement.

---

## **How Agents Must Work**

Every agent in this project MUST obey these rules:

1. **Never generate code without a referenced Task ID.**
2. **Never modify architecture without updating the relevant `plan.md`.**
3. **Never propose features without updating the relevant `spec.md` (WHAT).**
4. **Never change approach without updating `constitution.md` (Principles).**
5. **Every code file must contain a comment linking it to the Task and Spec sections.**

If an agent cannot find the required spec, it must **stop and request it**, not improvise.

**Conflict resolution hierarchy:** Constitution > Spec > Plan > Tasks

---

## **Hackathon Overview**

A 5-phase progressive project that evolves a simple Python todo app into a cloud-native, AI-powered distributed system — all built using Spec-Driven Development (no manual coding). Total: **1000 points + 600 bonus**.

| Phase | What You Build | Stack | Points |
|-------|---------------|-------|--------|
| **I** | In-memory Python console todo app | Python 3.13+, UV | 100 |
| **II** | Full-stack web app with auth | Next.js + FastAPI + SQLModel + Neon DB + Better Auth | 150 |
| **III** | AI chatbot managing todos via natural language | OpenAI ChatKit + Agents SDK + MCP Server | 200 |
| **IV** | Containerize & deploy locally on Kubernetes | Docker + Minikube + Helm + kubectl-ai | 250 |
| **V** | Advanced features + cloud deployment | Kafka + Dapr + AKS/GKE/OKE | 300 |

---

## **Project Structure (Monorepo)**

```
todo-platform/
│
├── .specify/
│   ├── memory/
│   │   └── constitution.md              # Global quality standards (ONE per project)
│   ├── templates/                       # SDD templates (spec, plan, tasks, PHR, ADR)
│   └── scripts/                         # Helper scripts
│
├── specs/                               # ALL specs organized by phase → feature
│   ├── phase1-cli/
│   │   └── task-crud/                   # Single feature: all 5 CRUD operations
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   │
│   ├── phase2-web/
│   │   ├── database-schema/             # Neon DB + SQLModel schema design
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   └── tasks.md
│   │   ├── rest-api/                    # FastAPI endpoints for task CRUD
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   └── tasks.md
│   │   ├── authentication/              # Better Auth + JWT integration
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   └── tasks.md
│   │   └── frontend-ui/                 # Next.js App Router UI
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   │
│   ├── phase3-chatbot/
│   │   ├── mcp-server/                  # MCP tools (add, list, complete, delete, update)
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   └── tasks.md
│   │   ├── ai-agent/                    # OpenAI Agents SDK integration
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   └── tasks.md
│   │   └── chat-ui/                     # OpenAI ChatKit frontend
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   │
│   ├── phase4-k8s/
│   │   ├── containerization/            # Dockerfiles for frontend + backend
│   │   │   ├── spec.md
│   │   │   ├── plan.md
│   │   │   └── tasks.md
│   │   └── helm-deployment/             # Helm charts + Minikube deployment
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   │
│   └── phase5-cloud/
│       ├── advanced-features/           # Priorities, Tags, Search, Recurring, Reminders
│       │   ├── spec.md
│       │   ├── plan.md
│       │   └── tasks.md
│       ├── kafka-events/                # Event-driven architecture
│       │   ├── spec.md
│       │   ├── plan.md
│       │   └── tasks.md
│       ├── dapr-integration/            # Pub/Sub, State, Service Invocation, Jobs, Secrets
│       │   ├── spec.md
│       │   ├── plan.md
│       │   └── tasks.md
│       └── cloud-deployment/            # AKS/GKE/OKE + CI/CD + Monitoring
│           ├── spec.md
│           ├── plan.md
│           └── tasks.md
│
├── core/                                # Shared business logic (REUSED across phases)
│   ├── models.py                        # Task data model
│   └── manager.py                       # CRUD operations
│
├── cli/                                 # Phase I — Python console interface
│
├── backend/                             # Phase II+ — FastAPI server
│   ├── CLAUDE.md                        # Backend-specific guidelines
│   ├── main.py
│   ├── models.py
│   ├── routes/
│   └── db.py
│
├── frontend/                            # Phase II+ — Next.js app
│   ├── CLAUDE.md                        # Frontend-specific guidelines
│   └── ...
│
├── agents/                              # Phase III — MCP server + OpenAI Agents
│
├── k8s/                                 # Phase IV — Dockerfiles, Helm charts
│
├── cloud/                               # Phase V — Dapr configs, Kafka, CI/CD
│
├── history/
│   ├── prompts/                         # Prompt History Records (PHRs)
│   │   ├── constitution/
│   │   ├── phase1-cli/
│   │   ├── phase2-web/
│   │   ├── phase3-chatbot/
│   │   ├── phase4-k8s/
│   │   ├── phase5-cloud/
│   │   └── general/
│   └── adr/                             # Architecture Decision Records
│
├── .claude/
│   ├── commands/                        # Slash commands (sp.* from SpecifyPlus)
│   └── skills/                          # Reusable intelligence
│
├── CLAUDE.md                            # Root AI instructions
├── AGENTS.md                            # This file — cross-agent rules & roadmap
└── README.md                            # Setup instructions
```

---

## **Core Reuse Strategy**

The `core/` module contains shared business logic that evolves across phases but is **imported by every interface layer**:

```
Phase I:   cli/        imports core/  →  In-memory dict storage
Phase II:  backend/    imports core/  →  SQLModel + Neon DB storage
Phase III: agents/     imports core/  →  MCP tools call core functions
Phase IV:  k8s/        packages core/ →  Same code, containerized
Phase V:   cloud/      extends core/  →  Adds Kafka event publishing after operations
```

---

## **SDD Cascade (Per-Feature Workflow)**

Each feature within each phase follows this exact sequence:

```
/sp.constitution    → Once per project (already done)
        ↓
/sp.specify         → Write spec for ONE feature (e.g., specs/phase2-web/authentication/)
        ↓
/sp.clarify         → Find gaps and ambiguities in that spec
        ↓
/sp.plan            → Architecture for that feature
        ↓
/sp.adr             → (On-demand) Document significant decisions
        ↓
/sp.tasks           → Atomic work units for that feature
        ↓
/sp.analyze         → Verify spec ↔ plan ↔ tasks alignment
        ↓
/sp.checklist       → Generate validation checklist
        ↓
/sp.implement       → Execute tasks with checkpoints
        ↓
/sp.git.commit_pr   → Commit and ship that feature
```

**Key rule:** Complete the full cascade for ONE feature before starting the next. Never start implementing feature B while feature A's spec is incomplete.

---

## **Phase-by-Phase Execution Plan**

### **Step 0: Foundation Setup (Do First)**

1. `/sp.constitution` — Define project-wide quality standards
2. `git commit` — Lock constitution before any feature work
3. Create folder structure as defined above

---

### **Phase I: Console App (100 pts)**

**1 feature, 1 full SDD cycle:**

| # | Feature | Spec Location | What It Covers |
|---|---------|--------------|----------------|
| 1 | Task CRUD | `specs/phase1-cli/task-crud/` | Add, Delete, Update, View, Mark Complete — in-memory Python CLI |

**Deliverables:** `cli/` + `core/` with working console app, specs, README

---

### **Phase II: Full-Stack Web App (150 pts)**

**4 features, 4 separate SDD cycles (in order):**

| # | Feature | Spec Location | What It Covers |
|---|---------|--------------|----------------|
| 1 | Database Schema | `specs/phase2-web/database-schema/` | Neon PostgreSQL tables, SQLModel models, migrations |
| 2 | REST API | `specs/phase2-web/rest-api/` | 6 FastAPI endpoints (GET, POST, PUT, DELETE, PATCH) |
| 3 | Authentication | `specs/phase2-web/authentication/` | Better Auth + JWT plugin, middleware, user isolation |
| 4 | Frontend UI | `specs/phase2-web/frontend-ui/` | Next.js 16+ App Router, Tailwind, task list/forms |

**Execution order matters:** Database first → API second → Auth third → Frontend last (each builds on previous).

**Deliverables:** `backend/` + `frontend/` + Vercel deployment

---

### **Phase III: AI Chatbot (200 pts)**

**3 features, 3 separate SDD cycles:**

| # | Feature | Spec Location | What It Covers |
|---|---------|--------------|----------------|
| 1 | MCP Server | `specs/phase3-chatbot/mcp-server/` | 5 MCP tools (add, list, complete, delete, update), stateless, DB-backed |
| 2 | AI Agent | `specs/phase3-chatbot/ai-agent/` | OpenAI Agents SDK, natural language → tool mapping, conversation flow |
| 3 | Chat UI | `specs/phase3-chatbot/chat-ui/` | OpenAI ChatKit frontend, domain allowlist config |

**New DB models:** Conversation, Message (stateless server with DB-persisted chat history)

**Deliverables:** `agents/` + ChatKit UI + `POST /api/{user_id}/chat` endpoint

---

### **Phase IV: Local K8s Deployment (250 pts)**

**2 features, 2 separate SDD cycles:**

| # | Feature | Spec Location | What It Covers |
|---|---------|--------------|----------------|
| 1 | Containerization | `specs/phase4-k8s/containerization/` | Dockerfiles for frontend + backend, Docker Compose, Gordon |
| 2 | Helm Deployment | `specs/phase4-k8s/helm-deployment/` | Helm charts, Minikube deploy, kubectl-ai, kagent |

**Deliverables:** `k8s/` with Dockerfiles + Helm charts, working Minikube deployment

---

### **Phase V: Advanced Cloud Deployment (300 pts)**

**4 features, 4 separate SDD cycles:**

| # | Feature | Spec Location | What It Covers |
|---|---------|--------------|----------------|
| 1 | Advanced Features | `specs/phase5-cloud/advanced-features/` | Priorities, Tags, Search/Filter, Sort, Recurring Tasks, Due Dates & Reminders |
| 2 | Kafka Events | `specs/phase5-cloud/kafka-events/` | Topics (task-events, reminders, task-updates), producers, consumers |
| 3 | Dapr Integration | `specs/phase5-cloud/dapr-integration/` | Pub/Sub, State, Service Invocation, Jobs API, Secrets |
| 4 | Cloud Deployment | `specs/phase5-cloud/cloud-deployment/` | AKS/GKE/OKE, CI/CD GitHub Actions, monitoring |

**Deliverables:** `cloud/` with Dapr configs, Kafka setup, live cloud URL

---

## **Agentic Dev Stack Integration**

| Component | Role | Responsibility |
| :---- | :---- | :---- |
| **AGENTS.md** | **The Brain** | Cross-agent truth. Defines *how* agents should behave, what tools to use, and coding standards. |
| **Spec-KitPlus** | **The Architect** | Manages spec artifacts (spec.md, plan.md, tasks.md). Ensures technical rigor before coding starts. |
| **Claude Code** | **The Executor** | The agentic environment. Reads project memory and executes Spec-Kit tools. |

### **Day-to-Day Workflow**

1. **Context Loading:** Start Claude Code → reads CLAUDE.md → AGENTS.md → constitution.md
2. **Spec Generation:** User describes feature → Claude runs `/sp.specify` for that feature
3. **Clarification:** Claude runs `/sp.clarify` to find gaps
4. **Planning:** Claude runs `/sp.plan` to design architecture
5. **Task Breakdown:** Claude runs `/sp.tasks` to create atomic work units
6. **Validation:** Claude runs `/sp.analyze` + `/sp.checklist`
7. **Implementation:** Claude runs `/sp.implement` with human checkpoints
8. **Ship:** Claude runs `/sp.git.commit_pr`

### **Constitution vs. AGENTS.md**

- **AGENTS.md (The "How"):** Focuses on **interaction**. "Use these tools, follow this order, one feature at a time."
- **constitution.md (The "What"):** Focuses on **standards**. "Python 3.13+, async/await, test coverage, security rules."

---

## **Agent Failure Modes (What Agents MUST Avoid)**

Agents are NOT allowed to:

- Freestyle code or architecture
- Generate missing requirements
- Create tasks on their own
- Alter stack choices without justification
- Add endpoints, fields, or flows that aren't in the spec
- Ignore acceptance criteria
- Produce "creative" implementations that violate the plan
- Start a new feature's spec before finishing the current feature's full SDD cycle

---

## **Execution Order (Start Here)**

```
1. /sp.constitution                          ← Define project standards FIRST
2. git commit                                ← Lock it in
3. Create folder structure                   ← As defined above
4. Phase I: specs/phase1-cli/task-crud/      ← Full SDD cycle
5. Phase II: specs/phase2-web/database-schema/ → rest-api/ → authentication/ → frontend-ui/
6. Phase III: specs/phase3-chatbot/mcp-server/ → ai-agent/ → chat-ui/
7. Phase IV: specs/phase4-k8s/containerization/ → helm-deployment/
8. Phase V: specs/phase5-cloud/advanced-features/ → kafka-events/ → dapr-integration/ → cloud-deployment/
```

**Each arrow (→) is a complete SDD cycle: specify → clarify → plan → tasks → analyze → checklist → implement → commit.**
