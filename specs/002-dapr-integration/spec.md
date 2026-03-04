# Feature Specification: Dapr Integration

**Feature Branch**: `002-dapr-integration`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "specs/phase5-cloud/dapr-integration/ — Dapr integration for the todo platform. Replace direct Kafka producer calls with Dapr Pub/Sub (using the existing 3 topics: task-events, reminders, task-updates). Add Dapr State Store for caching task reads. Use Dapr Service Invocation between frontend and backend. Add Dapr Jobs API for scheduled reminder scanning (replace event-driven reminders). Add Dapr Secrets for DATABASE_URL and BETTER_AUTH_SECRET. Stack: Dapr 1.14+, Python Dapr SDK (dapr-python), running via Dapr sidecar on Kubernetes (Minikube local + AKS/GKE in production). Backend is FastAPI (Python). Kafka remains as the underlying message broker for Pub/Sub."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Managed Event Publishing via Pub/Sub (Priority: P1)

When a task is created, updated, deleted, or completed, the system publishes a lifecycle event to one or more named message channels. The business logic layer has no knowledge of the underlying message broker — it simply publishes to a named topic and the infrastructure handles delivery. If the message broker configuration changes (e.g., switching from Kafka to Redis Streams), no application code needs to change.

**Why this priority**: Core integration. All other Dapr capabilities depend on the platform being event-capable. Replacing direct broker connections with an abstraction layer unlocks broker portability and simplifies testing.

**Independent Test**: Perform any task CRUD operation and verify the event appears on the correct topic without the application code containing any direct broker connection strings.

**Acceptance Scenarios**:

1. **Given** a task is created via the API, **When** the operation completes, **Then** a `task.created` event appears on the `task-events` topic and `task-updates` topic within 2 seconds
2. **Given** a task is updated, **When** the operation completes, **Then** a `task.updated` event with a `changed_fields` list appears on both topics
3. **Given** a task is deleted, **When** the operation completes, **Then** a `task.deleted` event appears on both topics
4. **Given** the message broker is temporarily unavailable, **When** a task operation is performed, **Then** the API still returns a success response (fail-open) and logs the publish failure
5. **Given** a consumer service is running, **When** it subscribes to a topic via the pub/sub abstraction, **Then** it receives events with the same envelope schema as before

---

### User Story 2 — Scheduled Reminder Scanning via Jobs API (Priority: P2)

A scheduled job runs on a configurable interval (default: every 5 minutes) and scans for tasks whose due date falls within the next 24 hours. For each qualifying incomplete task that has not yet been reminded, it publishes a `reminder.triggered` event to the `reminders` topic. This replaces the previous event-driven reminder that fired only at save time.

**Why this priority**: Reminders triggered only at save time miss tasks that become "due soon" later (e.g., a task saved 3 days ago that is now due tomorrow). A scheduled scan ensures no reminders are missed regardless of when the task was last updated.

**Independent Test**: Create a task with a due date of tomorrow, wait for one scan interval, and verify a reminder event appears on the `reminders` topic without any API call triggering it.

**Acceptance Scenarios**:

1. **Given** a task with `due_date = today` and `completed = false` exists, **When** the scheduled scan runs, **Then** a `reminder.triggered` event is published to the `reminders` topic
2. **Given** the same task already received a reminder in the current process session, **When** the scan runs again, **Then** no duplicate reminder is published (de-duplication)
3. **Given** a completed task has `due_date = today`, **When** the scan runs, **Then** no reminder is published
4. **Given** a task has `due_date` more than 24 hours away, **When** the scan runs, **Then** no reminder is published
5. **Given** the Jobs scheduler is configured with a 5-minute interval, **When** the system starts, **Then** the first scan occurs within 5 minutes automatically

---

### User Story 3 — Distributed Task Cache via State Store (Priority: P3)

When a user requests their task list, the system first checks a distributed cache keyed by user ID. A cache hit returns the stored snapshot immediately. A cache miss fetches from the database, stores the result in cache with a 5-minute TTL, and returns it. Any task write operation (create, update, delete, toggle) invalidates that user's cache entry so the next read is always fresh.

**Why this priority**: Reduces repeated database queries for active users who refresh their task list frequently. Also demonstrates stateful sidecar capabilities on Kubernetes without changing the frontend experience.

**Independent Test**: Make two consecutive list requests for the same user — the second response must return in less than half the time of the first (cache hit). Perform a task update, then verify the next list request goes to the database (cache miss).

**Acceptance Scenarios**:

1. **Given** a user has never loaded their task list, **When** they request it, **Then** the database is queried and the result is stored in cache
2. **Given** a cached task list exists for a user, **When** they request their task list again within 5 minutes, **Then** the response is served from cache without a database query
3. **Given** a user creates, updates, or deletes a task, **When** the write operation completes, **Then** their cached task list is invalidated
4. **Given** the cache TTL has expired (5 minutes), **When** the user requests their list, **Then** the database is queried and the fresh result is cached again
5. **Given** the cache store is unavailable, **When** the user requests their task list, **Then** the response is served from the database (fail-open — no error to user)

---

### User Story 4 — Secure Secret Retrieval via Secrets API (Priority: P2)

Sensitive configuration values — specifically the database connection string and the authentication signing secret — are retrieved from a secure secrets vault at application startup rather than being read directly from container environment variables. Pod specs and deployment manifests contain no sensitive values in plaintext.

**Why this priority**: Prevents accidental secret exposure via `kubectl describe pod` or deployment YAML committed to source control. Satisfies basic secrets hygiene for cloud deployment.

**Independent Test**: Deploy the backend with an empty `DATABASE_URL` environment variable. Verify the application starts successfully by reading the secret from the vault, and confirm `kubectl describe pod` shows no sensitive values.

**Acceptance Scenarios**:

1. **Given** `DATABASE_URL` is stored in the secrets vault, **When** the backend starts, **Then** it connects to the database successfully without needing the env var set in the pod spec
2. **Given** `BETTER_AUTH_SECRET` is stored in the secrets vault, **When** the backend starts, **Then** JWT verification works correctly using the vaulted value
3. **Given** the secrets vault is temporarily unavailable at startup, **When** the application attempts to start, **Then** it logs a clear error and exits with a non-zero code (fail-fast — startup, not runtime)
4. **Given** a secret value is rotated in the vault, **When** the application pod is restarted, **Then** it picks up the new value automatically

---

### User Story 5 — Service-to-Service Calls via Service Invocation (Priority: P3)

Internal service-to-service communication (frontend to backend, consumer to backend) uses name-based service discovery provided by the infrastructure, rather than hardcoded URLs or DNS names. Services refer to each other by logical name only, and the routing is handled transparently.

**Why this priority**: Eliminates hardcoded internal URLs from application configuration, enabling seamless operation across environments (Minikube, staging, production) without per-environment URL overrides.

**Independent Test**: Deploy frontend and backend with no hardcoded internal URLs in their configs. Trigger a task operation from the frontend — it must successfully reach the backend via name-only routing.

**Acceptance Scenarios**:

1. **Given** the backend is deployed with name `todo-backend`, **When** the frontend calls the tasks API, **Then** the request is routed correctly without specifying a hostname or IP address
2. **Given** the backend pod is restarted and gets a new IP, **When** the frontend makes a subsequent API call, **Then** the call succeeds with no configuration changes (automatic re-routing)
3. **Given** the backend is scaled to 3 replicas, **When** the frontend makes multiple API calls, **Then** requests are load-balanced across all replicas

---

### Edge Cases

- What happens when the Dapr sidecar is not running (pod without sidecar injection)? — Backend must fail-fast on startup with a clear error, not silently skip event publishing
- What happens when a Pub/Sub publish times out? — Event is dropped and logged; API response is not blocked
- What happens if the State Store returns stale data after a write race condition? — Cache invalidation on every write prevents stale reads; acceptable if a read races with a write (next TTL cycle corrects it)
- What happens if the Jobs scheduler misses an interval (e.g., pod was restarting)? — The next scheduled run catches any qualifying tasks; no at-most-once guarantee required for reminders
- What happens if a secret key does not exist in the vault? — Application logs the missing key name and exits (fail-fast)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST publish task lifecycle events (`task.created`, `task.updated`, `task.deleted`, `task.completed`, `task.reopened`) to named message channels using the pub/sub abstraction — not direct broker connections
- **FR-002**: System MUST publish each lifecycle event to both the `task-events` channel and the `task-updates` channel in a single publish operation
- **FR-003**: Event publishing MUST be fire-and-forget — API response time MUST NOT be affected by publish latency or broker availability
- **FR-004**: System MUST run a recurring scan job every 5 minutes that identifies tasks with `due_date` within the next 24 hours and `completed = false`
- **FR-005**: The scan job MUST publish a `reminder.triggered` event to the `reminders` channel for each qualifying task not already reminded in the current session
- **FR-006**: System MUST cache task list query results per user with a 5-minute TTL
- **FR-007**: Any write operation (create, update, delete, toggle) MUST invalidate the cache entry for the affected user
- **FR-008**: Cache reads MUST fall back to the database if the cache store is unavailable — users MUST never see an error due to cache unavailability
- **FR-009**: Backend application MUST retrieve `DATABASE_URL` and `BETTER_AUTH_SECRET` from a secure secrets vault at startup
- **FR-010**: Pod specifications and Kubernetes manifests MUST NOT contain sensitive configuration values in plaintext
- **FR-011**: If the secrets vault is unreachable at startup, the application MUST exit with a non-zero code and a descriptive error log
- **FR-012**: Internal service calls from frontend to backend MUST use name-based routing — no hardcoded hostnames or IP addresses in application configuration
- **FR-013**: Service routing MUST work without configuration changes when deployed to Minikube (local) or AKS/GKE (cloud)
- **FR-014**: All pub/sub, state store, secrets, and service invocation interactions MUST be configurable via component definition files without code changes
- **FR-015**: The system MUST operate normally (with degraded pub/sub and cache) when the sidecar is unavailable — except secret retrieval which is fail-fast

### Key Entities

- **PubSub Component**: A named, broker-backed channel configuration specifying the underlying transport (Kafka) and topic routing rules; referenced by logical name only from application code
- **State Entry**: A cached snapshot of a user's task list, keyed by user ID, with a configured TTL; invalidated on any write to that user's tasks
- **Scheduled Job Definition**: A recurring job specification with a trigger interval, a target handler endpoint, and a unique job name; registered with the job scheduler at application startup
- **Secret Reference**: A named pointer to a sensitive value stored in an external vault; resolved at application startup and injected into the application configuration
- **Service Route**: A logical name identifying a backend service within the cluster, resolved to a live endpoint by the infrastructure at call time

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All task lifecycle events are delivered to both `task-events` and `task-updates` channels for 100% of successful API operations, with zero code-level references to broker connection strings
- **SC-002**: Task list responses for repeat queries within the TTL window are served in under 100ms (cache hit), compared to under 500ms for cache-miss database queries
- **SC-003**: Reminder events are published within one scan interval (≤5 minutes) of a task becoming "due within 24 hours", regardless of when the task was last saved
- **SC-004**: Zero sensitive configuration values appear in plaintext in any Kubernetes manifest, pod spec, or deployment artifact
- **SC-005**: Frontend-to-backend API calls succeed across all deployment environments (Minikube, AKS/GKE) with no per-environment URL configuration in application code
- **SC-006**: API availability is unaffected by pub/sub broker downtime — measured by zero increase in API error rate during a 30-second broker outage simulation
- **SC-007**: Cache store downtime produces zero user-visible errors — measured by 100% of requests returning valid task data (from database fallback) during cache unavailability

## Assumptions

- Kafka remains the underlying message broker; the pub/sub abstraction wraps it without replacing it
- The Dapr sidecar runs as an injected container in every relevant pod (backend, frontend, consumer) on Kubernetes
- For local development (non-Kubernetes), Dapr can be run in self-hosted mode (`dapr run`) — not all features may be available locally
- The reminder scan interval of 5 minutes is a reasonable default; adjustable via component configuration without code changes
- The in-process de-duplication set from the previous Kafka integration remains as the primary deduplication mechanism for reminders within a single process lifetime
- State Store TTL of 5 minutes balances freshness with cache effectiveness for typical user browsing patterns
- Secrets vault is pre-populated before deployment; the application is not responsible for creating secrets
- Service Invocation applies to frontend→backend calls on Kubernetes; direct HTTP is used for local development
- The consumer service subscribes to topics via the pub/sub abstraction and is notified via HTTP callback (Dapr subscription model)
