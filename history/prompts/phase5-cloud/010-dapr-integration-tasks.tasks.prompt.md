---
id: 010
title: Dapr Integration Tasks Breakdown
stage: tasks
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: dapr-integration
branch: 002-dapr-integration
user: Shehroz Hanif
command: /sp.tasks
labels: ["dapr","pub-sub","state-store","jobs-api","secrets","service-invocation","phase5","tasks","TDD"]
links:
  spec: specs/phase5-cloud/dapr-integration/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/dapr-integration/tasks.md
tests: []
---

## Prompt

/sp.tasks

## Response snapshot

Generated `specs/phase5-cloud/dapr-integration/tasks.md` — 33 tasks across 7 phases.

**Task counts per phase/story**:
- Phase 1 Setup: T001–T005 (5 tasks) — pyproject.toml + cloud/dapr/components/ YAML files
- Phase 2 US4 Secrets: T006–T009 (4 tasks) — backend/dapr/secrets.py + db.py lifespan wiring
- Phase 3 US1 Pub/Sub (P1 MVP): T010–T013 (4 tasks) — backend/dapr/pubsub.py + routes/tasks.py swap
- Phase 4 US2 Jobs (P2): T014–T019 (6 tasks) — backend/dapr/jobs.py + routes/jobs.py + main.py + db.py
- Phase 5 US3 State Store (P3): T020–T025 (6 tasks) — backend/dapr/state.py + routes/tasks.py cache layer
- Phase 6 US5 Service Invocation (P3): T026–T029 (4 tasks) — Helm chart annotations only
- Phase 7 Polish: T030–T033 (4 tasks) — headers + lint + full test suite

**TDD tasks**: T006 (US4 RED), T010 (US1 RED), T014 (US2 RED), T020 (US3 RED) — tests before implementation in each story.

**Parallel opportunities**: 8 tasks marked [P] — Phase 1 component YAMLs, Phase 6 deployment YAMLs, Phase 7 polish.

**Implementation order**: US4 first (db.py lifespan blocks engine init), then US1 (MVP), US2 (uses US1's _publish_sync), US3/US5 in parallel after US4.

**MVP scope**: Phase 1 + 2 + 3 (T001–T013) — Dapr replaces direct Kafka producer calls.

## Outcome

- ✅ Impact: 33 fully-specified executable tasks covering all 5 Dapr building blocks; immediately actionable for /sp.implement
- 🧪 Tests: 4 RED test tasks (one per user story) + 5 run-tests verification tasks
- 📁 Files: tasks.md (1 file)
- 🔁 Next prompts: /sp.implement
- 🧠 Reflection: Implementation order (US4→US1→US2→US3→US5) differs from spec priority order (P1→P2→P3→P2→P3) because US4's secrets loading is a runtime dependency of the database engine — not just a testing concern

## Evaluation notes (flywheel)

- Failure modes observed: check-prerequisites.ps1 returned specs/002-dapr-integration/ (branch-named path) instead of canonical path; worked around by reading all docs from specs/phase5-cloud/dapr-integration/ directly
- Graders run and results (PASS/FAIL): task format validation — all 33 tasks follow checkbox + ID + [P?] + [Story?] + description pattern; PASS
- Prompt variant (if applicable): /sp.tasks with all 6 design artifacts present (spec, plan, research, data-model, contracts/, quickstart)
- Next experiment: /sp.implement — verify T012 (routes/tasks.py swap) doesn't break existing 94 tests
