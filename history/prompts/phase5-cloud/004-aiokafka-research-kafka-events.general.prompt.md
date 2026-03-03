---
id: 004
title: aiokafka Research for Kafka Events Feature
stage: general
date: 2026-03-03
surface: agent
model: claude-sonnet-4-6
feature: kafka-events
branch: master
user: Shehroz Hanif
command: research aiokafka best practices
labels: ["research","aiokafka","kafka","fastapi","kraft","consumer","producer","admin"]
links:
  spec: specs/phase5-cloud/kafka-events/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - history/prompts/phase5-cloud/004-aiokafka-research-kafka-events.general.prompt.md
tests:
  - none
---

## Prompt

Research aiokafka (Python async Kafka library) best practices for the following use case:

1. **AIOKafkaProducer singleton**: How to initialize once in FastAPI lifespan, share across request handlers, fire-and-forget publish (send without awaiting ack), graceful shutdown
2. **Topic auto-creation**: Using AIOKafkaAdminClient to create topics with specific retention (7 days, 24h, 1h) at startup if they don't exist
3. **AIOKafkaConsumer groups**: Pattern for running multiple consumer groups (one per topic) in a single standalone service using asyncio tasks, offset commit pattern (manual commit after processing), graceful restart/offset resume
4. **Error handling**: Producer fail-open pattern (catch all exceptions, log, never raise to caller). Consumer malformed message handling (try/except around processing, log raw message to stderr, continue)
5. **KRaft mode Kafka**: Bitnami Docker image environment variables needed for single-broker KRaft setup (no ZooKeeper)

Use context7 or web search. Return concrete code patterns and key configuration values. Focus on aiokafka 0.10+ (latest). Include the correct env vars for Bitnami Kafka KRaft docker image.

## Response snapshot

Delivered comprehensive research covering:
1. AIOKafkaProducer singleton via FastAPI lifespan + app.state, fire-and-forget via asyncio.create_task + add_done_callback, graceful shutdown in lifespan finally block
2. AIOKafkaAdminClient topic creation with retention.ms configs dict, TopicAlreadyExistsError guard, proper start()/stop() lifecycle
3. Multiple AIOKafkaConsumer groups as asyncio.gather tasks, enable_auto_commit=False, manual commit after processing using TopicPartition + offset+1
4. Fail-open producer error pattern, consumer try/except with raw message logging and continue
5. Full Bitnami KRaft env vars for single-broker docker-compose (KAFKA_CFG_PROCESS_ROLES, KAFKA_CFG_NODE_ID, KAFKA_CFG_CONTROLLER_QUORUM_VOTERS, listeners, advertised listeners, security protocol map)

## Outcome

- Impact: Research document ready to drive kafka-events plan.md and tasks.md
- Tests: none (research phase)
- Files: PHR written
- Next prompts: /sp.plan for kafka-events feature
- Reflection: aiokafka 0.10 uses asyncio.create_task for fire-and-forget; add_done_callback is the correct error-logging hook; NewTopic topic_configs uses str:str dict; KRaft single-broker needs KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093

## Evaluation notes (flywheel)

- Failure modes observed: WebFetch blocked; relied on WebSearch for all findings
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Validate NewTopic topic_configs str values against a running KRaft broker before implementing
