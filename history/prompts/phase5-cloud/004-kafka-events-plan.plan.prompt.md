---
id: "004"
title: "Kafka Events Plan"
stage: plan
date: "2026-03-03"
surface: agent
model: claude-sonnet-4-6
feature: phase5-cloud/kafka-events
branch: 001-kafka-events
user: Shehroz Hanif
command: "/sp.plan"
labels: ["phase5", "kafka", "plan", "kafka-events", "aiokafka", "docker-compose", "helm"]
links:
  spec: "specs/phase5-cloud/kafka-events/spec.md"
  ticket: null
  adr: null
  pr: null
files:
  - "specs/phase5-cloud/kafka-events/plan.md"
  - "specs/phase5-cloud/kafka-events/research.md"
  - "specs/phase5-cloud/kafka-events/data-model.md"
  - "specs/phase5-cloud/kafka-events/quickstart.md"
  - "specs/phase5-cloud/kafka-events/contracts/producer-api.md"
  - "specs/phase5-cloud/kafka-events/contracts/consumer-api.md"
  - "specs/001-kafka-events/plan.md"
tests:
  - "Constitution Check: all gates PASS"
  - "Phase 0 research: all unknowns resolved (8 decisions documented)"
---

## Prompt

/sp.plan

(Run on current feature: specs/phase5-cloud/kafka-events/, branch 001-kafka-events)

## Response

Executed full `/sp.plan` workflow. All Phase 0 and Phase 1 artifacts generated.

### Artifacts Created

**`specs/phase5-cloud/kafka-events/research.md`** (Phase 0)
- R1: aiokafka chosen over confluent-kafka-python (native asyncio)
- R2: AIOKafkaProducer singleton pattern with fire-and-forget `send()` using `asyncio.create_task()`
- R3: Topic auto-creation via AIOKafkaAdminClient at startup (must call `.start()` before API use)
- R4: Consumer pattern — 3 asyncio Tasks, `enable_auto_commit=False`, manual `commit({tp: offset+1})`
- R5: Bitnami Kafka 3.9 KRaft env vars (confirmed via research agent + bitnami README)
- R6: In-memory `_reminded_tasks: set[int]` for reminder de-duplication (Clarification Q3)
- R7: Extend existing `db.py` lifespan (no new lifespan context manager)
- R8: AsyncMock-based test strategy

**`specs/phase5-cloud/kafka-events/data-model.md`** (Phase 1)
- TaskEvent envelope schema (all lifecycle events)
- TaskSnapshot nested payload schema (15 fields)
- ReminderEvent schema (7 fields)
- KafkaTopic configuration table (3 topics, retention, partitions, consumer group IDs)
- In-memory de-duplication state definition
- Environment variables table

**`specs/phase5-cloud/kafka-events/contracts/producer-api.md`** (Phase 1)
- `init_producer()`, `shutdown_producer()` contracts
- `publish_task_event(event_type, task, changed_fields)` contract
- `publish_reminder_if_needed(task)` contract with qualification rules
- Fail-open error contract (FR-006)

**`specs/phase5-cloud/kafka-events/contracts/consumer-api.md`** (Phase 1)
- Consumer group table (3 groups)
- Message processing loop contract (decode → parse → handle → log → commit)
- 3 handler function contracts with stdout output formats
- DLQ stderr format (FR-014, Clarification Q2)

**`specs/phase5-cloud/kafka-events/quickstart.md`** (Phase 1)
- 5-step local setup guide (Docker Compose → backend config → backend start → consumer start → verify)
- Troubleshooting table

**`specs/phase5-cloud/kafka-events/plan.md`** (Main artifact)
- Technical Context filled (Python 3.13+, aiokafka, fire-and-forget, at-least-once)
- Constitution Check: all gates PASS (with noted deviation: producer in backend/kafka/ not core/)
- Full project structure (new files + modified files)
- Complexity tracking (3 justified deviations)
- Component architecture diagram (producer → Kafka → consumer)
- Lifespan extension pseudocode
- Routes integration pattern (4 CRUD ops)
- Corrected Docker Compose (bitnami/kafka:3.9, KAFKA_CFG_INTER_BROKER_LISTENER_NAME, AUTO_CREATE=false)
- 17-task implementation sequence (T001–T017, TDD: RED before GREEN)
- Risk analysis (3 risks with mitigations)

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Kafka client | aiokafka 0.11+ | Native asyncio, no thread executors |
| Producer pattern | Module singleton + fire-and-forget | Zero API latency impact |
| Lifespan | Extend existing db.py lifespan | Smallest viable change |
| Consumer model | 3 asyncio Tasks in 1 process | Simple, independently deployable |
| Reminder dedup | In-memory set (Clarification Q3) | Phase 5 scope, no Redis needed |
| DLQ | Stderr log only (Clarification Q2) | No separate DLQ topic required |
| changed_fields | Flat string list (Clarification Q4) | Minimal payload, sufficient for Phase 5 |
| Kafka image | bitnami/kafka:3.9 KRaft | No ZooKeeper, standard dev image |

📋 Architectural decision detected: Producer as backend/kafka/ module vs core/ integration — Document reasoning? Run `/sp.adr kafka-producer-placement`

## Outcome

Plan complete. 6 artifacts generated. 17 tasks sequenced. Ready for `/sp.tasks`.
