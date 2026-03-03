# Feature Specification: Kafka Event Streaming

**Feature Branch**: `001-kafka-events`
**Created**: 2026-03-03
**Status**: Draft
**Input**: Kafka event streaming for the todo platform. Every task CRUD operation (created/updated/deleted/completed) publishes an event to Kafka. 3 topics: task-events (task lifecycle), reminders (due date approaching), task-updates (real-time sync). Producer runs in the FastAPI backend. Consumer is a separate Python service. Stack: confluent-kafka-python (or aiokafka), running locally via Docker Compose Kafka, and on Kubernetes via Helm in production.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Task Operations Emit Events (Priority: P1)

Every time a user creates, updates, deletes, or toggles a task via the web app, a structured event is automatically published to the event stream. Other services can independently react to these events without polling the database.

**Why this priority**: This is the foundational capability — all other features depend on events flowing correctly. Without this, the remaining stories cannot be tested.

**Independent Test**: Create a task via the web app → verify that exactly one `task.created` event appears in the `task-events` stream with the correct task data and user ID. Repeat for update, delete, and toggle.

**Acceptance Scenarios**:

1. **Given** a user submits a new task, **When** the task is saved successfully, **Then** a `task.created` event is published to `task-events` containing the task ID, user ID, title, priority, category, due date, and a UTC timestamp — within 1 second of the save.
2. **Given** a user edits a task's fields, **When** the update is saved, **Then** a `task.updated` event is published to `task-events` with the full updated task snapshot and a `changed_fields` list.
3. **Given** a user deletes a task, **When** deletion completes, **Then** a `task.deleted` event is published to `task-events` with the task ID and user ID.
4. **Given** a user toggles a task's completion status, **When** the toggle succeeds, **Then** a `task.completed` or `task.reopened` event is published to `task-events` with the new `completed` value.
5. **Given** Kafka is unavailable, **When** a task operation occurs, **Then** the API still responds successfully (event failure is logged, not propagated to the user).

---

### User Story 2 — Reminder Events for Approaching Due Dates (Priority: P2)

When a task's due date is within 24 hours, the system automatically publishes a reminder event. A consumer can pick this up to send notifications (email, push, etc.) without the main app needing to know about notification channels.

**Why this priority**: Directly ties to the Phase 5 "Reminders" feature. Decoupling reminder delivery from the main app is the key value of this story.

**Independent Test**: Create a task with `due_date = today`. Wait for the reminder scan (or trigger it manually). Verify a `reminder.triggered` event appears in the `reminders` topic with the correct task and user data.

**Acceptance Scenarios**:

1. **Given** a task has a due date ≤ 24 hours from now and has not been completed, **When** the reminder scan runs, **Then** a `reminder.triggered` event is published to `reminders` with task ID, user ID, title, and due date/time.
2. **Given** a task is already completed, **When** the reminder scan runs, **Then** no reminder event is published for that task.
3. **Given** a task has no due date, **When** the reminder scan runs, **Then** no reminder event is published.
4. **Given** a reminder event was already sent for a task within the past 24 hours, **When** the scan runs again, **Then** the event is NOT re-published (de-duplication).

---

### User Story 3 — Real-Time Sync via Task-Updates Topic (Priority: P3)

Every task state change is also published to the `task-updates` topic, which is designed for low-latency consumers (e.g., a WebSocket gateway pushing live updates to browser clients). This topic has shorter retention than `task-events`.

**Why this priority**: Enables live multi-tab/multi-device sync without polling. Lower priority because the app works without it; it's an enhancement.

**Independent Test**: Open two browser tabs. In tab 1, create a task. Verify that a `task.created` event appears in `task-updates` within 1 second — the downstream consumer (simulated) would push the update to tab 2.

**Acceptance Scenarios**:

1. **Given** any task operation occurs (create/update/delete/toggle), **When** the event is published to `task-events`, **Then** the same event payload is also published to `task-updates`.
2. **Given** a consumer subscribes to `task-updates` filtered by `user_id`, **When** a task event for that user occurs, **Then** the consumer receives it within 2 seconds.

---

### User Story 4 — Consumer Service Processes All Topics (Priority: P2)

A standalone consumer service runs independently, subscribes to all three topics, and processes events. It acts as the entry point for all downstream reactions (logging, notifications, analytics).

**Why this priority**: Without a consumer, the events have no value. This story validates the full end-to-end flow.

**Independent Test**: Start the consumer service. Perform a task create, update, and delete. Verify the consumer logs show three distinct events with correct schemas.

**Acceptance Scenarios**:

1. **Given** the consumer service is running, **When** a `task.created` event is published, **Then** the consumer processes it and logs the event type, task ID, and user ID within 2 seconds.
2. **Given** the consumer service is running, **When** a `reminder.triggered` event is published, **Then** the consumer logs a reminder notification for the correct user and task.
3. **Given** the consumer service crashes and restarts, **When** it reconnects to Kafka, **Then** it resumes from its last committed offset — no events are permanently lost.
4. **Given** a malformed event (invalid JSON or missing fields) arrives, **When** the consumer attempts to process it, **Then** the event is moved to a dead-letter log and processing continues without crashing.

---

### User Story 5 — Local Development with Docker Compose (Priority: P1)

Developers can run the full Kafka stack locally with a single command. No cloud account or external services required.

**Why this priority**: Developer experience gate — if local setup is broken, nothing else can be tested.

**Independent Test**: On a fresh machine with only Docker installed, run `docker compose up`. Verify Kafka is reachable and topics are created automatically within 60 seconds.

**Acceptance Scenarios**:

1. **Given** Docker is installed, **When** `docker compose up` is run, **Then** Kafka starts and is reachable on `localhost:9092` within 60 seconds.
2. **Given** Kafka is running, **When** the FastAPI backend starts, **Then** the producer connects automatically without manual configuration beyond setting `KAFKA_BOOTSTRAP_SERVERS`.
3. **Given** all services are running, **When** a task is created via the UI, **Then** the event can be verified in a Kafka console consumer.

---

### Edge Cases

- What happens when Kafka bootstrap servers are unreachable on startup? → Producer initialization should fail gracefully; app must still start and serve requests.
- What if a topic does not exist when a message is published? → Topics are auto-created with sensible defaults (or pre-created at startup via admin client).
- What happens when the consumer's offset is lost (new consumer group on an existing topic)? → Default to reading from the earliest offset to avoid missing events.
- What if the same task operation triggers duplicate publishes (e.g., retry on API timeout)? → Consumer must be idempotent — duplicate messages processed without side effects.
- What if a task is deleted while a reminder event is in-flight? → Consumer checks current task state before acting on reminder events.
- What happens on Kubernetes pod restarts? → Kafka offsets are committed to Kafka's internal storage; the consumer resumes cleanly.

---

## Requirements *(mandatory)*

### Functional Requirements

**Producer (FastAPI backend)**

- **FR-001**: The system MUST publish a `task.created` event to the `task-events` topic whenever a new task is successfully created.
- **FR-002**: The system MUST publish a `task.updated` event to the `task-events` topic whenever a task's fields are successfully modified, including a `changed_fields` list containing the flat names of fields that changed (e.g., `["title", "due_date"]`).
- **FR-003**: The system MUST publish a `task.deleted` event to the `task-events` topic whenever a task is successfully deleted.
- **FR-004**: The system MUST publish a `task.completed` or `task.reopened` event to the `task-events` topic whenever a task's completion status is toggled.
- **FR-005**: The system MUST publish every task-lifecycle event to the `task-updates` topic in addition to `task-events`.
- **FR-006**: Producer failures MUST NOT cause the task API endpoint to return an error — publish errors are logged and the response is returned normally.
- **FR-007**: All events MUST be serialized as JSON with the standard envelope: `event_type`, `task_id`, `user_id`, `timestamp` (ISO 8601 UTC), and `payload` (full task snapshot).
- **FR-008**: Events MUST be partitioned by `user_id` so all events for a given user arrive in order.

**Reminder Events**

- **FR-009**: The system MUST publish a `reminder.triggered` event to the `reminders` topic whenever a task is created or updated with a `due_date` that falls within the next 24 hours — triggered synchronously at save time, not via a scheduled scan.
- **FR-010**: A reminder event for a given task MUST NOT be re-published if one was already emitted for that task within the same 24-hour window. De-duplication is implemented via an in-memory set of task IDs in the producer process; the set resets on restart (a single re-trigger on restart is acceptable).

**Consumer Service**

- **FR-012**: The consumer service MUST subscribe to `task-events`, `reminders`, and `task-updates` as separate consumer groups.
- **FR-013**: The consumer MUST commit offsets only after successfully processing each event (at-least-once delivery).
- **FR-014**: The consumer MUST handle malformed events without crashing — invalid messages MUST be logged to stderr/stdout with the raw message body and error reason, then skipped; no separate dead-letter storage is required.
- **FR-015**: The consumer MUST resume from the last committed offset after a restart.

**Topic Configuration**

- **FR-016**: Three topics MUST be created: `task-events` (retention: 7 days), `reminders` (retention: 24 hours), `task-updates` (retention: 1 hour).
- **FR-017**: Topics MUST be auto-created or pre-created at service startup if they do not exist.

**Infrastructure**

- **FR-018**: A `docker-compose.yml` extension (or standalone file) MUST start a Kafka broker locally without ZooKeeper (KRaft mode).
- **FR-019**: Kafka connection settings MUST be configurable via environment variables (`KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_TOPIC_PREFIX`).
- **FR-020**: The consumer service MUST be packaged as a Docker image deployable alongside the existing Kubernetes Helm chart.

### Key Entities

- **TaskEvent**: Represents a single task lifecycle change. Attributes: `event_type` (task.created | task.updated | task.deleted | task.completed | task.reopened), `task_id` (integer), `user_id` (string), `timestamp` (ISO 8601), `payload` (full task snapshot), `changed_fields` (flat list of changed field names e.g. `["title", "due_date"]`, present only on `task.updated` events).

- **ReminderEvent**: Represents an imminent due-date alert. Attributes: `event_type` (reminder.triggered), `task_id`, `user_id`, `title`, `due_date`, `due_time`, `triggered_at` (ISO 8601).

- **KafkaTopic**: Logical channel for events. Attributes: `name`, `retention_ms`, `partitions` (default: 3), `replication_factor` (1 for local, 3 for production).

- **ConsumerGroup**: A named group of consumers. Each topic has its own consumer group ID to allow independent offset tracking.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every task create, update, delete, and toggle operation results in an event visible in the `task-events` topic within 1 second, measured end-to-end.
- **SC-002**: Zero task API requests fail due to Kafka unavailability — the app degrades gracefully, publishing to a local queue or logging the failure.
- **SC-003**: The consumer processes 100% of published events with no permanent data loss, even after a restart (at-least-once guarantee validated by counting published vs. processed events).
- **SC-004**: Reminder events are published for all qualifying tasks within 5 minutes of their 24-hour threshold crossing.
- **SC-005**: The local Kafka environment starts and is fully ready for event publishing within 60 seconds of `docker compose up`.
- **SC-006**: Duplicate events (same `task_id` + `event_type` within 1 second) are safely handled by the consumer without producing duplicate side effects.
- **SC-007**: The consumer service handles a malformed event without crashing — logs the error and continues processing the next message.

---

## Constraints & Non-Goals

### Constraints

- The FastAPI backend must remain the single source of truth for task data; Kafka is append-only and does not replace the database.
- The consumer service is read-only — it MUST NOT write directly to the task database.
- Local development uses a single-broker Kafka setup (no replication).

### Non-Goals

- WebSocket gateway or UI push notifications are **not** in scope for this feature (that is a downstream consumer concern).
- Exactly-once delivery semantics are **not** required — at-least-once is sufficient.
- Kafka Streams, KSQL, or Schema Registry are **not** in scope.
- Authentication/authorization for Kafka topics is **not** in scope (covered in Feature 4: Cloud Deployment).

---

## Assumptions

- **aiokafka** is preferred over `confluent-kafka-python` because the backend is fully async (FastAPI + asyncpg); aiokafka provides a native asyncio API.
- The reminder scan is triggered by a background task (APScheduler or FastAPI `lifespan`) — no external cron service is needed for Phase 5.
- Kafka runs in **KRaft mode** (no ZooKeeper) for local development using the Bitnami Kafka Docker image.
- **Fire-and-forget publishing**: the producer sends messages without awaiting broker acknowledgement in the critical path to keep API latency unaffected.
- The consumer service for this phase logs events to stdout — actual notification dispatch (email, SMS) is a downstream concern.
- De-duplication for reminders is implemented via a simple in-memory set of task IDs in the producer process (reset on restart). Redis or DB-backed de-duplication is not required at this phase.
- Topic partitions: 3 partitions per topic for local development; configurable for production.
- The `cloud/kafka/` directory is used for Kafka configuration files, Docker Compose additions, and Helm values overrides.

---

## Clarifications

### Session 2026-03-03

- Q: Should reminder events be published via a scheduled background scan or event-driven at task save time? → A: Event-driven — publish `reminder.triggered` synchronously at task save time when `due_date ≤ 24 hours from now`; no scheduled scan needed.
- Q: Where do malformed consumer events (invalid JSON / missing fields) go? → A: Stdout/stderr log only — raw message body and error reason logged; no separate dead-letter topic or file required.
- Q: How is reminder de-duplication state stored? → A: In-memory set in the producer process (reset on restart); a single re-trigger on restart is acceptable.
- Q: What format is the `changed_fields` list in `task.updated` events? → A: Flat list of field name strings (e.g., `["title", "due_date"]`); no before/after values required.
