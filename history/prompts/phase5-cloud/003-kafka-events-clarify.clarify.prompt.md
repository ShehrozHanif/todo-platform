---
id: "003"
title: "Kafka Events Clarify"
stage: clarify
date: "2026-03-03"
surface: agent
model: claude-sonnet-4-6
feature: phase5-cloud/kafka-events
branch: 001-kafka-events
user: Shehroz Hanif
command: "/sp.clarify"
labels: ["phase5", "kafka", "clarify", "kafka-events"]
links:
  spec: "specs/phase5-cloud/kafka-events/spec.md"
  ticket: null
  adr: null
  pr: null
files:
  - "specs/phase5-cloud/kafka-events/spec.md"
tests:
  - "Spec ambiguity scan: 4 questions resolved, 0 outstanding"
---

## Prompt

/sp.clarify

(Run on current feature: specs/phase5-cloud/kafka-events/spec.md, branch 001-kafka-events)

## Response

Ran full ambiguity scan on the Kafka Events spec. Detected and resolved 4 critical ambiguities across 4 questions.

### Questions Asked & Answered

| # | Category | Question | Answer |
|---|----------|----------|--------|
| Q1 | Functional Scope | Reminder scan approach: scheduled background scan vs event-driven at save time? | **C — Event-driven** at task save time when `due_date ≤ 24h` |
| Q2 | Integration / Error Handling | Dead-letter log destination for malformed events? | **A — Stdout/stderr only**; no DLQ topic or file |
| Q3 | Data Model | Reminder de-duplication state storage? | **A — In-memory set** in producer process (reset on restart) |
| Q4 | Data Model | `changed_fields` format in `task.updated` events? | **A — Flat list** of field name strings e.g. `["title", "due_date"]` |

### Spec Sections Updated

- **FR-002**: Added explicit flat-list format for `changed_fields`
- **FR-009**: Changed from scheduled scan to event-driven (publish at save time)
- **FR-010**: Pinned de-duplication to in-memory set; added restart behavior note
- **FR-011**: Removed (scheduled scan no longer needed)
- **FR-014**: Replaced vague "dead-letter log" with "logged to stderr/stdout with raw message and error reason"
- **TaskEvent entity**: Clarified `changed_fields` as flat list of field name strings
- **Assumptions**: Updated reminder de-duplication assumption to match chosen approach
- **Clarifications section**: Added `### Session 2026-03-03` with all 4 Q→A bullets

### Coverage Summary

| Category | Status |
|----------|--------|
| Functional Scope & Behavior | Resolved |
| Domain & Data Model | Resolved |
| Edge Cases & Failure Handling | Resolved |
| Integration & External Dependencies | Clear |
| Non-Functional Quality Attributes | Clear |
| Constraints & Tradeoffs | Clear |
| Terminology & Consistency | Clear |
| Completion Signals | Clear |

## Outcome

4/4 questions asked and answered. 0 outstanding. Spec is ready for `/sp.plan`.
