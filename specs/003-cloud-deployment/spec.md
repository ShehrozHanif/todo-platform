# Feature Specification: Cloud Deployment

**Feature Branch**: `003-cloud-deployment`
**Created**: 2026-03-04
**Status**: Draft
**Input**: User description: "start the cloud-deployment — Deploy the todo platform to a managed cloud Kubernetes service with CI/CD, monitoring, and a live public URL."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public Live Deployment (Priority: P1)

A developer (or DevOps admin) deploys the entire todo platform — frontend, backend, Kafka, and Dapr — to a managed cloud Kubernetes cluster so that the application is publicly reachable at a stable HTTPS URL with zero manual server provisioning.

**Why this priority**: Without a live public deployment, the platform has no cloud-native presence. All other cloud features (CI/CD, monitoring) depend on the app being live first.

**Independent Test**: Navigate to the public HTTPS URL → sign up → create, edit, and delete a task → verify data persists. All features (auth, task CRUD, AI chat) work without any local dependencies.

**Acceptance Scenarios**:

1. **Given** the Helm chart is applied to the cloud cluster, **When** a user visits the public HTTPS URL, **Then** the Next.js frontend loads within 5 seconds and all API calls succeed.
2. **Given** the backend is running in the cloud, **When** a user creates a task, **Then** it is persisted in the Neon PostgreSQL database and visible after a browser refresh.
3. **Given** the backend pod restarts (due to OOM or crash), **When** a new pod starts, **Then** the app recovers automatically and existing tasks remain intact.
4. **Given** the platform is deployed, **When** a user accesses any route, **Then** the connection is encrypted via HTTPS (TLS termination at ingress).

---

### User Story 2 - Automated CI/CD Pipeline (Priority: P2)

A developer pushes a commit to the `master` branch on GitHub and the system automatically builds Docker images, runs the test suite, pushes images to a container registry, and deploys the updated version to the cloud cluster — all without manual intervention.

**Why this priority**: Manual deployments are error-prone and slow. Automated CI/CD is the standard for production cloud platforms and ensures every merged change is immediately live and tested.

**Independent Test**: Merge a code change to master → observe pipeline run → verify new version is live at the public URL within 10 minutes without any manual steps.

**Acceptance Scenarios**:

1. **Given** a developer pushes to the `master` branch, **When** the pipeline runs, **Then** it builds both frontend and backend Docker images and pushes them to the container registry.
2. **Given** the build stage passes, **When** the test suite runs in CI, **Then** all 138+ tests pass before any deployment proceeds.
3. **Given** tests pass, **When** the deploy stage runs, **Then** the new image version is rolled out to the cluster with zero downtime (rolling update).
4. **Given** a test failure occurs during CI, **When** the pipeline completes, **Then** no deployment happens and the developer receives a failure notification.
5. **Given** a bad deployment is detected (health check fails), **When** the rollout is in progress, **Then** the deployment rolls back to the previous working version automatically.

---

### User Story 3 - Monitoring & Observability (Priority: P3)

An operations team member opens a monitoring dashboard to view real-time health metrics (CPU, memory, request rates, error rates) for all services and receives automated alerts when error thresholds are exceeded.

**Why this priority**: Without observability, production issues are detected only when users report them. Monitoring enables proactive incident response and SLO tracking.

**Independent Test**: Simulate a 500-error spike on the backend → observe alert firing within 2 minutes → view request latency and error-rate graphs on the dashboard.

**Acceptance Scenarios**:

1. **Given** the monitoring stack is deployed, **When** an operator opens the dashboard, **Then** they can see per-service CPU, memory, and HTTP request metrics updated within 60 seconds.
2. **Given** the backend error rate exceeds 5% over a 5-minute window, **When** the alert rule triggers, **Then** an alert notification is sent (email or Slack) within 2 minutes.
3. **Given** the platform is running normally, **When** an operator queries logs, **Then** structured logs from all services (frontend, backend, Dapr sidecar) are searchable by time range and service name.
4. **Given** a pod crashes and restarts, **When** the operator checks the dashboard, **Then** the restart event is visible with timestamps and the pod's last log lines before crash.

---

### User Story 4 - Secure Cloud Secrets Management (Priority: P4)

A security-conscious admin deploys the platform to the cloud without storing sensitive credentials (database URL, auth secret) as plaintext in source code, Helm values files, or CI/CD environment variables in the clear.

**Why this priority**: Cloud credentials exposed in version control or CI logs is the #1 cause of data breaches. This is a security baseline requirement for any production deployment.

**Independent Test**: Inspect the GitHub repository, CI/CD logs, and Helm values files — no plaintext DATABASE_URL or BETTER_AUTH_SECRET should appear. The app still connects to the database successfully.

**Acceptance Scenarios**:

1. **Given** secrets are stored in a cloud-native secret store, **When** a pod starts, **Then** it retrieves the database URL and auth secret from the secret store (not from environment variables set at deploy time).
2. **Given** a developer clones the repo and inspects all config files, **When** they search for DATABASE_URL values, **Then** no plaintext connection strings are found.
3. **Given** CI/CD pipeline logs are publicly viewable, **When** a deployment runs, **Then** no secret values appear in any log line.

---

### Edge Cases

- What happens when the cloud provider has an outage in the primary region? (Service unavailable — no active-active multi-region requirement in scope.)
- What happens when the container registry push fails mid-deployment? (Pipeline marks build as failed; no partial deployment occurs.)
- What happens when the Dapr sidecar fails to start alongside the backend pod? (Backend starts in degraded mode — events disabled, cache disabled, but task CRUD continues via direct DB access.)
- What happens when the Neon PostgreSQL connection limit is exceeded? (Backend returns 503 with a retry-after header; no data loss.)
- What happens when a new image version causes a CrashLoopBackOff? (Kubernetes rollout pauses; rollback is triggered if rollout deadline exceeded.)

## Requirements *(mandatory)*

### Functional Requirements

**Deployment:**
- **FR-001**: System MUST deploy all services (frontend, backend, Dapr sidecar) to a managed Kubernetes cluster (AKS, GKE, or OKE) using the existing Helm charts.
- **FR-002**: System MUST expose the frontend on a public HTTPS endpoint with a stable hostname.
- **FR-003**: System MUST use the existing Neon PostgreSQL database (no cloud DB provisioning required — Neon handles hosting).
- **FR-004**: System MUST deploy Kafka (or use a managed Kafka service) to support event streaming in the cloud environment.
- **FR-005**: System MUST run Dapr sidecar alongside backend pods with all 5 building blocks active (pub/sub, state, jobs, secrets, service invocation).

**CI/CD Pipeline:**
- **FR-006**: System MUST automatically trigger a pipeline on every push to the `master` branch.
- **FR-007**: Pipeline MUST build and push Docker images for frontend and backend to a container registry.
- **FR-008**: Pipeline MUST run the full backend test suite (138+ tests) and halt deployment on any failure.
- **FR-009**: Pipeline MUST deploy to the cloud cluster using a rolling update strategy.
- **FR-010**: Pipeline MUST roll back automatically if the new deployment fails its health checks within a configurable timeout.

**Monitoring:**
- **FR-011**: System MUST collect CPU, memory, and HTTP request metrics from all pods.
- **FR-012**: System MUST provide a visualization dashboard showing service health over the last 24 hours.
- **FR-013**: System MUST send an alert when backend error rate exceeds 5% over any 5-minute rolling window.
- **FR-014**: System MUST aggregate logs from all containers in a searchable log store.

**Secrets:**
- **FR-015**: System MUST store DATABASE_URL and BETTER_AUTH_SECRET in a cloud-native secret store (not in Git or CI plaintext).
- **FR-016**: Kubernetes pods MUST retrieve secrets at runtime using the Dapr Secrets building block (already wired in sidecar/secrets.py).

### Key Entities

- **Deployment Manifest**: Helm chart values configured for the cloud target environment (namespaces, resource limits, ingress, image tags, dapr.enabled=true).
- **Container Image**: Versioned Docker image for frontend and backend, tagged with Git SHA, stored in a container registry.
- **Pipeline Run**: CI/CD execution triggered by a git event; tracks stage outcomes (build, test, push, deploy, verify).
- **Alert Rule**: Monitoring condition definition (metric, threshold, window, notification channel).
- **Secret**: Encrypted credential stored in the cloud secret store, referenced by pods at runtime.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The todo platform is reachable at a public HTTPS URL within 30 minutes of a first-time deployment.
- **SC-002**: A code change pushed to `master` is live in production within 10 minutes (end-to-end pipeline time).
- **SC-003**: 100% of 138 backend tests must pass in CI before any deployment proceeds — zero broken deployments.
- **SC-004**: The monitoring dashboard shows request latency, error rate, and pod health with no more than 60-second data lag.
- **SC-005**: No plaintext secrets appear in the repository, CI logs, or Helm values files committed to version control.
- **SC-006**: A pod restart or node failure results in automatic recovery with less than 60 seconds of downtime.
- **SC-007**: The platform sustains normal task operations under at least 50 concurrent users without HTTP 5xx errors.

## Assumptions

- The cloud Kubernetes cluster (AKS/GKE/OKE) is already provisioned by the team. This spec covers deployment configuration, not cluster provisioning.
- Neon PostgreSQL is already configured and accessible from the cloud cluster (existing DATABASE_URL from Phase 2).
- The GitHub repository has an Actions runner with access to push images to the chosen container registry.
- Kafka will be deployed as an in-cluster service (via Bitnami Helm chart) for the cloud environment; managed Kafka (Confluent Cloud, Azure Event Hubs) is out of scope for this iteration.
- Dapr is installed in the cluster via the Dapr Helm chart before deploying application services.
- TLS certificates are provisioned via cert-manager + Let's Encrypt (or cloud-provider-managed TLS) — no manual certificate management.
- The existing Helm charts (k8s/helm/todo-platform/) are the primary deployment vehicle and will be extended, not replaced.
- Monitoring uses open-source tooling (Prometheus + Grafana or cloud-provider equivalents); paid SaaS monitoring is out of scope.

## Out of Scope

- Multi-region active-active deployment
- Auto-scaling based on custom metrics (beyond basic HPA on CPU)
- Blue/green deployment (rolling update strategy only for this iteration)
- Managed Kafka service (Confluent Cloud, Azure Event Hubs, etc.)
- Disaster recovery / backup strategy for Neon DB (managed by Neon)
- Custom domain name registration (a cloud-provider default domain is acceptable)
