# SpecifyPlus (Spec-Kit Plus) — Complete LLM Reference Guide

## What Is SpecifyPlus?

SpecifyPlus (also called Spec-Kit Plus) is a **Spec-Driven Development (SDD)** framework that provides a structured, repeatable workflow for building projects with AI collaboration. Instead of ad-hoc prompting, it enforces a cascade of artifacts — Constitution → Specification → Clarification → Plan → Tasks → Implementation — where each phase feeds the next and every output is traceable back to requirements.

It works inside **Claude Code** (or similar AI-native tools) using slash commands (`/sp.*`) and produces structured files (specs, plans, tasks, ADRs, PHRs) that guide AI execution with human-controlled checkpoints.

---

## Core Principle: The Cascade

Each layer inherits constraints from above. A weak upstream artifact produces weak downstream work. A strong cascade produces measurable, validated output.

### Complete Correct Order (All Commands)

```
┌─────────────────────────────────────────────────────────┐
│  SETUP (once per project)                               │
│                                                         │
│  1. /sp.constitution    → Quality standards             │
│     git commit          → Lock standards                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  DEFINE (per feature)                                   │
│                                                         │
│  2. /sp.specify         → What are we building?         │
│  3. /sp.clarify         → Any gaps or ambiguities?      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  DESIGN (per feature)                                   │
│                                                         │
│  4. /sp.plan            → How will we build it?         │
│     /sp.adr             → Document significant decisions│
│                           (on-demand, not automatic)    │
│  5. /sp.tasks           → Break into work units         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  VALIDATE (before building)                             │
│                                                         │
│  6. /sp.analyze         → Spec ↔ Plan ↔ Tasks aligned? │
│  7. /sp.checklist       → Generate validation checklist │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  BUILD (per feature)                                    │
│                                                         │
│  8. /sp.implement       → Execute tasks + checkpoints   │
│     (use checklist at each checkpoint to validate)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  SHIP (per feature)                                     │
│                                                         │
│  9. /sp.git.commit_pr   → Commit work + create PR      │
└─────────────────────────────────────────────────────────┘

Note: PHRs (Prompt History Records) are created AUTOMATICALLY after every
step. /sp.adr is triggered ON-DEMAND when a significant decision is detected
(usually during /sp.plan or /sp.tasks).
```

---

## Project Structure

```
project-root/
├── CLAUDE.md                          # AI behavioral instructions
├── .specify/
│   ├── memory/
│   │   └── constitution.md            # Global quality standards (one per project)
│   ├── templates/                     # Templates for spec, plan, tasks, PHR
│   └── scripts/                       # Helper scripts
├── specs/<feature-name>/
│   ├── spec.md                        # Feature specification (WHAT)
│   ├── plan.md                        # Implementation plan (HOW)
│   └── tasks.md                       # Atomic work units (WORK)
├── history/
│   ├── prompts/                       # Prompt History Records (PHRs)
│   │   ├── constitution/              # PHRs for constitution work
│   │   ├── <feature-name>/            # PHRs for feature work
│   │   └── general/                   # PHRs for general work
│   └── adr/                           # Architecture Decision Records
└── .claude/
    ├── commands/                      # Slash commands (from specifyplus init)
    └── skills/                        # User-created reusable intelligence
        └── <skill-name>/
            └── SKILL.md
```

---

## Complete Workflow (Step by Step)

### Phase 0: Initialize Project

```bash
# Greenfield (new project)
specifyplus init

# Brownfield (existing project — BACK UP CLAUDE.md FIRST!)
git checkout -b experiment/specifykit
cp CLAUDE.md CLAUDE.md.backup
specifyplus init --here
# Then merge old CLAUDE.md content into constitution.md / CLAUDE.md
```

---

### Phase 1: Constitution (`/sp.constitution`)

**Purpose:** Define project-wide quality standards that apply to ALL features/work.

**What it produces:** `.specify/memory/constitution.md`

**When:** Once per project, before any feature work.

**How to run:**
```
/sp.constitution
Project: [Project name and description]
Core principles:
- [Principle 1]
- [Principle 2]
Key standards:
- [Testable standard 1]
- [Testable standard 2]
Constraints:
- [Constraint 1]
Success criteria:
- [Criterion 1]
```

**Rules:**
- Standards MUST be testable, not vague (e.g., "Flesch-Kincaid grade 10-12" not "well-written")
- Commit constitution to git BEFORE starting feature work
- Constitution is written once; specifications are written per feature

**Constitution vs Specification:**
| Constitution | Specification |
|---|---|
| Global rules for ALL features | Rules for ONE feature |
| Written once per project | Written per feature |
| "All papers must use APA" | "This paper's thesis is X" |

---

### Phase 2: Specification (`/sp.specify`)

**Purpose:** Define WHAT you're building for a specific feature — intent, constraints, success criteria, non-goals.

**What it produces:** `specs/<feature-name>/spec.md`

**Two-part workflow:**

1. **Pre-specification conversation** — Ask AI to help you think through requirements:
   - What aspects to focus on?
   - Who is the audience?
   - What does success look like?
   - What constraints apply?

2. **Formalize with `/sp.specify`:**
```
/sp.specify [Feature description]
Target audience: [who]
Focus: [what aspects]
Success criteria:
- [SMART criterion 1]
- [SMART criterion 2]
Constraints:
- [Constraint 1]
Not building:
- [Non-goal 1]
```

**Spec structure:** Intent → Constraints → Success Evals → Non-Goals

**Critical rules:**
- Specs describe WHAT (outcomes), never HOW (process)
- Success criteria must be SMART: Specific, Measurable, Achievable, Relevant, Time-bound
- Non-goals must be explicit to prevent scope creep
- Never skip the pre-specification conversation

---

### Phase 3: Clarification (`/sp.clarify`)

**Purpose:** Identify gaps, ambiguities, and missing assumptions in the spec before planning.

**What it does:** Analyzes the spec and reports:
1. **Ambiguous Terms** — Words that could mean multiple things
2. **Missing Assumptions** — Unstated scope (citation style, audience, length)
3. **Incomplete Requirements** — Unspecified scenarios
4. **Scope Conflicts** — Unclear or inconsistent focus

**How to run:**
```
/sp.clarify
My specification is at specs/<feature>/spec.md
Analyze for ambiguous terms, missing assumptions, incomplete requirements, scope conflicts.
```

**Workflow:**
1. Run `/sp.clarify` → get categorized feedback
2. Classify each finding as CRITICAL (blocks planning) or NICE-TO-HAVE (defer)
3. Update spec with critical clarifications
4. Optionally re-run `/sp.clarify` to verify readiness (1-2 rounds typical)

**Critical gap test:** "If planning didn't know this, would it make a different choice?" If yes → it's critical.

---

### Phase 4: Plan (`/sp.plan`)

**Purpose:** Transform the spec's WHAT into an architectural HOW — components, phases, dependencies, design decisions.

**What it produces:** `specs/<feature-name>/plan.md`

**How to run:**
```
/sp.plan
Create: architecture sketch, section structure, approach, quality validation.
Decisions needing documentation: list important choices with options and tradeoffs.
Testing strategy: validation checks based on acceptance criteria.
```

**Plan contains:**
- Architecture overview
- Implementation phases (3-5 phases, ordered)
- Component breakdown
- Dependencies and sequencing
- Design decisions highlighted

**ADR (Architecture Decision Record) — triggered during planning:**

When a significant decision is detected (long-term impact + multiple alternatives + cross-cutting), suggest:
```
📋 Architectural decision detected: [brief]. Document? Run `/sp.adr [title]`
```

Create ADR only if ALL three are true:
1. Long-term consequences?
2. Multiple viable alternatives existed?
3. Someone will question this in 6 months?

**ADR structure:** Status → Context → Decision → Alternatives Considered (with pros/cons) → Rationale → Consequences (positive AND negative)

**ADRs stored in:** `history/adr/`

---

### Phase 5: Tasks (`/sp.tasks`)

**Purpose:** Break the plan into atomic work units (15-30 min each) with explicit dependencies and human checkpoints.

**What it produces:** `specs/<feature-name>/tasks.md`

**How to run:**
```
/sp.tasks
```

**Task properties:**
- **Size:** 15-30 minutes (too small = overhead, too large = hidden complexity)
- **Criterion:** Single, testable acceptance condition
- **Independence:** Can be reviewed individually
- **Dependency:** Clear ordering (what must complete before what)

**Checkpoint pattern (CRITICAL):**
```
Tasks in Phase → CHECKPOINT → Human reviews → Human approves → Next phase
```

At each checkpoint, human answers: "Does this meet the specification?"
- **Approve:** "Commit and proceed"
- **Reject:** "Iterate on this task" (give specific feedback)
- **Revise:** "Adjust the plan" (rare, for structural issues)

**Task dependency graph example:**
```
Phase 1: Task 1.1 → 1.2 → 1.3 → [CHECKPOINT 1]
Phase 2: Task 2.1 → 2.2 → 2.3 → 2.4 → [CHECKPOINT 2]
Phase 3: Task 3.1 → 3.2 → [CHECKPOINT 3]
Phase 4: Task 4.1 → [CHECKPOINT 4 — COMPLETE]
```

**Lineage traceability:** Every task must trace back through: Specification → Plan → Task → Acceptance Criterion.

---

### Phase 6: Pre-Build Validation (`/sp.analyze`)

**Purpose:** Check cross-artifact consistency — does spec match plan match tasks? Run AFTER `/sp.tasks` and BEFORE `/sp.implement`.

**How to run:**
```
/sp.analyze
```

**What it checks:**
- Does the plan cover ALL spec requirements?
- Do tasks map to ALL plan components?
- Are there orphan tasks (tasks that don't trace back to spec)?
- Are there missing tasks (spec requirements with no task)?
- Are dependencies consistent across artifacts?

**When to run:** After `/sp.tasks`, before `/sp.implement`. This is the last moment to catch misalignment before you start building.

**If misalignment found:** Fix the artifact (spec, plan, or tasks), then re-run `/sp.analyze` until consistent.

---

### Phase 7: Generate Validation Checklist (`/sp.checklist`)

**Purpose:** Generate a custom validation checklist tailored to your specific feature. Use this checklist during implementation checkpoints.

**How to run:**
```
/sp.checklist
```

**What it produces:** A feature-specific checklist based on your spec, plan, and tasks — so you know exactly what to verify at each checkpoint during implementation.

**When to run:** After `/sp.analyze` confirms alignment, before `/sp.implement`. You need the checklist ready before you start building.

---

### Phase 8: Implementation (`/sp.implement`)

**Purpose:** Execute tasks with AI collaboration, validating each output against spec success criteria.

**How to run:**
```
/sp.implement
```

**What happens:**
1. Agent reads `tasks.md`
2. Executes tasks in dependency order
3. Shows output at checkpoints
4. Waits for human review and approval
5. Continues on approval; iterates on feedback

**The execution cycle:**
```
You specify task → AI proposes approach → You refine → AI executes
        ↑                                                 ↓
        ←←←←←←← You validate against spec ←←←←←←←←←←←←←
```

**Checkpoint decisions:**
1. **"Commit and Proceed"** — All tasks meet spec
2. **"Iterate on This Task"** — Specific task needs refinement (give targeted feedback)
3. **"Revise the Plan"** — Checkpoint revealed structural issue (rare)

**Anti-patterns to avoid:**
- Approving without actually reviewing against spec
- Accepting "close enough" instead of enforcing spec criteria
- Not iterating when first pass doesn't meet spec
- Letting agent run autonomously without checkpoints

---

### Phase 9: Ship (`/sp.git.commit_pr`)

**Purpose:** Commit the completed work and create a pull request.

**How to run:**
```
/sp.git.commit_pr Commit the feature work
```

**What it does:**
- Creates a conventional commit for the feature
- Pushes to a feature branch
- Creates a draft PR (or shares compare URL)

---

### Phase 10: Reusable Intelligence (Skills — After Project)

**Purpose:** Encode successful patterns from good sessions into reusable skill files for future projects.

**When to create a skill (2+ of these must be YES):**
1. Will I do this again? (3+ times across projects)
2. Did it involve multiple decisions? (5+ decision points)
3. Would I want the same quality next time?

**Skill vs Subagent:**
| Skill (2-6 decisions) | Subagent (7+ decisions) |
|---|---|
| Human guides, AI assists | AI works autonomously |
| You apply framework | AI makes judgments |
| section-writer, outline-refiner | research-validator, fact-checker |

**Skill file structure** (saved at `.claude/skills/<name>/SKILL.md`):
```yaml
---
name: "skill-name"
description: "When to use this skill..."
version: "1.0.0"
---
# Skill Name
## When to Use This Skill
## How This Skill Works (numbered steps)
## Output Format
## Quality Criteria
## Example (input → output)
```

**Creation workflow:**
1. After a good session, start conversation: "I want to create a skill for [workflow]..."
2. Answer AI's questions about your process
3. AI generates SKILL.md file
4. Save to `.claude/skills/<name>/SKILL.md`
5. Test on a real task
6. Iterate until consistent results

**Intelligence compounds:** Project 1 takes 3.5 hours. Project 2 with skill takes 70 min (65% faster). Project 5 takes 30 min. Each skill accelerates all future work.

---

## Prompt History Records (PHRs)

Every user interaction gets recorded as a PHR — a structured record of what was asked, what was done, and what was produced.

**PHR routing (all under `history/prompts/`):**
- Constitution work → `history/prompts/constitution/`
- Feature work → `history/prompts/<feature-name>/`
- General work → `history/prompts/general/`

**PHR stages:** constitution | spec | plan | tasks | red | green | refactor | explainer | misc | general

**PHRs are created automatically after every user interaction** using the template at `.specify/templates/phr-template.prompt.md`.

---

## Brownfield Adoption (Existing Projects)

**Problem:** `specifyplus init --here` OVERWRITES `CLAUDE.md`. Custom commands in `.claude/commands/` and all source code are preserved.

**Safe workflow:**
```bash
git checkout -b experiment/specifykit        # Isolate from main
cp CLAUDE.md CLAUDE.md.backup                # Manual backup
git add -A && git commit -m 'backup'         # Git backup
specifyplus init --here                      # Now safe to run
git diff --name-only                         # Inspect what changed
```

**Content routing after init:**
- Coding standards, architecture principles → Move to `constitution.md`
- AI collaboration patterns, behavioral instructions → Append to new `CLAUDE.md`

---

## Quick Command Reference (In Correct Execution Order)

| Step | Command | Purpose | Output |
|---|---|---|---|
| 0 | `specifyplus init` | Initialize new project | Project structure + templates |
| 0 | `specifyplus init --here` | Initialize in existing project | Same (OVERWRITES CLAUDE.md!) |
| 1 | `/sp.constitution` | Create global quality standards | `.specify/memory/constitution.md` |
| 2 | `/sp.specify` | Write feature specification | `specs/<feature>/spec.md` |
| 3 | `/sp.clarify` | Find gaps in specification | Updated `spec.md` |
| 4 | `/sp.plan` | Generate implementation plan | `specs/<feature>/plan.md` |
| 4+ | `/sp.adr` | Document architecture decision (on-demand) | `history/adr/<N>-<title>.md` |
| 5 | `/sp.tasks` | Generate atomic task breakdown | `specs/<feature>/tasks.md` |
| 6 | `/sp.analyze` | Cross-artifact consistency check | Analysis report |
| 7 | `/sp.checklist` | Generate validation checklist | Checklist for feature |
| 8 | `/sp.implement` | Execute tasks with checkpoints | Implemented feature |
| 9 | `/sp.git.commit_pr` | Commit work and create PR | Git commit + PR |
| Auto | `/sp.phr` | Create prompt history record (automatic) | `history/prompts/<route>/<file>.md` |
| Any | `/sp.reverse-engineer` | Reverse engineer existing codebase | SDD artifacts from code |
| Any | `/sp.taskstoissues` | Convert tasks to GitHub issues | GitHub issues |

---

## Testing & Validation (Embedded Across All Phases)

SpecifyPlus does NOT have a single "test phase." Instead, **validation is built into every phase** through testable criteria and human checkpoints.

### Validation At Each Phase

| Step | Phase | What Gets Validated | How |
|---|---|---|---|
| 1 | **Constitution** | Are all standards testable, not vague? | Review: "Flesch-Kincaid grade 10-12" not "well-written" |
| 2 | **Specification** | Are success criteria SMART? | SMART test: Specific, Measurable, Achievable, Relevant, Time-bound |
| 3 | **Clarification** | Are there gaps or ambiguities? | `/sp.clarify` identifies 4 gap types |
| 4 | **Plan** | Does plan match all spec requirements? | Review: components, dependencies, phases align with spec |
| 5 | **Tasks** | Is each task atomic with testable criterion? | Check: 15-30 min, single acceptance criterion, clear dependency |
| 6 | **Analyze** | Do spec ↔ plan ↔ tasks all align? | `/sp.analyze` cross-artifact consistency check |
| 7 | **Checklist** | Do you have validation criteria ready? | `/sp.checklist` generates feature-specific checklist |
| 8 | **Implementation** | Does output meet spec success criteria? | Checkpoint pattern: human validates at every phase boundary |

### The Checkpoint Validation Pattern (During Implementation)

At every checkpoint, use this checklist:

```
1. SUCCESS CRITERIA MET?
   - Does output match explicit criteria from task definition?
   - Word count? Format? Tone? Completeness?

2. SPECIFICATION REQUIREMENTS FULFILLED?
   - Does this task's output advance toward spec's overall success evals?
   - Are we building the right thing?

3. QUALITY STANDARDS? (from Constitution)
   - Does output meet constitutional standards?
   - Academic rigor? Clarity? Coherence? Security? Performance?

4. READY FOR NEXT TASK?
   - Can the next task safely build on this output?
   - Any risks or dependencies that aren't met?
```

**If all pass** → Commit and proceed.
**If any fail** → Iterate (give specific feedback, AI refines, re-validate).

### Cross-Artifact Validation (`/sp.analyze`)

After generating spec, plan, and tasks, run `/sp.analyze` to check consistency across all artifacts:

```
/sp.analyze
```

**What it checks:**
- Does the plan cover all spec requirements?
- Do tasks map to all plan components?
- Are there orphan tasks (tasks that don't trace to spec)?
- Are there missing tasks (spec requirements with no task)?
- Are dependencies consistent across artifacts?

**When to run:** After `/sp.tasks` and before `/sp.implement` — catches misalignment before you start building.

### Custom Checklists (`/sp.checklist`)

Generate a feature-specific validation checklist:

```
/sp.checklist
```

Creates a checklist tailored to your feature's spec, plan, and tasks — so you know exactly what to verify during implementation.

### TDD Stages (For Code Projects)

For software projects, SpecifyPlus supports Red-Green-Refactor TDD workflow:

| Stage | Meaning | PHR Label |
|---|---|---|
| **Red** | Write a failing test first | `red` |
| **Green** | Write minimum code to pass the test | `green` |
| **Refactor** | Clean up code while keeping tests passing | `refactor` |

These stages are tracked in PHRs (Prompt History Records) for traceability.

### Validation Summary (In Correct Order)

```
Step 1: Constitution    → Standards must be TESTABLE
Step 2: Specification   → Success criteria must be SMART
Step 3: Clarification   → Gaps must be IDENTIFIED and RESOLVED
Step 4: Plan            → Architecture must MATCH spec
Step 5: Tasks           → Each task must have TESTABLE acceptance criterion
Step 6: /sp.analyze     → Spec ↔ Plan ↔ Tasks must be CONSISTENT
Step 7: /sp.checklist   → Validation checklist must be READY
Step 8: Implementation  → Every checkpoint must VALIDATE against spec
Step 9: Ship            → All criteria MET before commit/PR
```

**The core idea: You never "test at the end." You validate continuously at every phase, catching issues early before they cascade downstream.**

---

## Code Testing (Unit, Integration, E2E)

SpecifyPlus validates **artifacts** (spec ↔ plan ↔ tasks alignment). It does **NOT** write or run actual code tests. Those are YOUR responsibility — but SpecifyPlus ensures they are defined, required, and verified.

### What SpecifyPlus Does vs Does NOT Do

| SpecifyPlus DOES (artifact validation) | SpecifyPlus Does NOT Do (code testing) |
|---|---|
| Check spec matches plan (`/sp.analyze`) | Write unit tests |
| Check tasks map to spec (`/sp.analyze`) | Run pytest / jest / vitest |
| Verify criteria are testable (`/sp.checklist`) | Check code coverage |
| Validate output meets spec (checkpoints) | Run integration or E2E tests |

### Where Code Tests Are Defined (3 Places)

**1. Constitution — Testing Standards (Global Rules)**

```markdown
# constitution.md
Testing Standards:
- All code must have unit tests
- Minimum 80% test coverage
- All API endpoints must have integration tests
- No PR merged without passing tests
```

This ensures AI knows: "Every feature MUST include tests."

**2. Specification — What To Test (Per Feature)**

```markdown
# spec.md
Success Criteria:
- Login endpoint returns 200 with valid credentials
- Login endpoint returns 401 with invalid credentials
- Token expires after 24 hours
- Rate limiting: max 5 attempts per minute
```

Each success criterion becomes a test case.

**3. Tasks — Tests As Separate Work Units (Per Feature)**

When `/sp.tasks` generates tasks, tests should be their own tasks:

```
Task 3.1: Write login endpoint logic
Task 3.2: Write unit tests for login endpoint        ← TEST TASK
Task 3.3: Write integration tests for auth flow      ← TEST TASK
          [CHECKPOINT — review code + tests together]
```

### How Tests Are Written During Implementation

During `/sp.implement`, tests follow the **Red-Green-Refactor** (TDD) pattern:

```
Step 1 (RED):      Write a failing test first
                   → test runner shows FAIL ❌

Step 2 (GREEN):    Write minimum code to make test pass
                   → test runner shows PASS ✅

Step 3 (REFACTOR): Clean up code while tests still pass
                   → test runner shows PASS ✅

                   [CHECKPOINT — human reviews code + tests]
```

### How Tests Flow Through The Full Workflow

```
Constitution:  "All code needs tests, 80% coverage"
                    ↓
Specification: "Login must return 401 on bad credentials"
                    ↓
Plan:          "Phase 2 includes test writing for all endpoints"
                    ↓
Tasks:         "Task 3.2: Write unit tests for login"
                    ↓
/sp.analyze:   Checks: Every spec criterion has a matching task
                    ↓
/sp.checklist: Includes: "All success criteria have test coverage"
                    ↓
/sp.implement: AI writes tests using Red-Green-Refactor
                    ↓
Checkpoint:    You review: Do tests cover all spec criteria?
                    ↓
Ship:          Tests pass → commit → PR
```

### Key Point

**SpecifyPlus doesn't replace your testing framework. It ensures tests are DEFINED in constitution, REQUIRED in spec, PLANNED as tasks, CHECKED by /sp.analyze, and VALIDATED at checkpoints. The actual test writing and running happens during `/sp.implement` as part of task execution.**

---

## Key Principles Summary

1. **Specification Primacy:** Your ability to write clear specs is more valuable than writing code. Bad specs break everything downstream.
2. **Testability:** All standards and success criteria must be measurable, not subjective.
3. **What vs How:** Specs define WHAT (outcomes). Plans define HOW (architecture). Tasks define WORK (atomic units).
4. **Human Control:** Checkpoints keep humans in the loop. Agent never proceeds autonomously past phase boundaries.
5. **Smallest Viable Diff:** Prefer the smallest change that fulfills the requirement.
6. **Traceability:** Every task traces back to spec. Every spec respects constitution.
7. **Intelligence Compounds:** Skills encode patterns for reuse. Each project gets faster as your skill library grows.
8. **Commit Before Proceeding:** Always commit constitution before specs, commit specs before planning. Git provides traceability and reversibility.
