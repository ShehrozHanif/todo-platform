# Research: Dapr Integration

**Branch**: `002-dapr-integration` | **Date**: 2026-03-04
**Phase**: 0 — Resolved unknowns before design

---

## R1 — Dapr Python SDK Version for Runtime 1.14

**Decision**: Use `dapr==1.15.0` and `dapr-ext-fastapi==1.15.0`.

**Rationale**: The Dapr Python SDK follows an N-2 compatibility policy — SDK 1.15 supports runtimes 1.13 through 1.15. There is no `1.14.x` SDK release; 1.15.0 is the correct target. `dapr-ext-fastapi` provides the `DaprApp` wrapper for subscription handlers.

**Critical caveats**:
- `DaprClient` is **synchronous** across all versions through 1.15. There is no released async client (`dapr.aio`). GitHub issue #90 has tracked this since 2020 without resolution.
- Using `DaprClient` directly in an `async def` route handler **blocks the event loop**. All publishing must be offloaded to a thread.

**Alternatives considered**: `dapr==1.14.0` — identical functionality, no reason to pin older SDK version.

---

## R2 — Pub/Sub: Kafka Component YAML

**Decision**: Use `pubsub.kafka` v1 component with `authType: "none"` for local/internal cluster use.

**Rationale**: The todo platform runs Kafka via Bitnami KRaft (no SASL). Internal cluster communication is unauthenticated. For production with SASL, switch `authType` to `"password"` with `saslMechanism: "SHA-512"`.

**Component YAML (local dev)**:
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: todo-platform
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: authType
      value: "none"
    - name: consumerGroup
      value: "todo-platform-consumers"
    - name: initialOffset
      value: "newest"
```

**Topic naming**: `topic_name` in `publish_event()` is the Kafka topic name verbatim — Dapr adds no prefix. Topics are: `task-events`, `task-updates`, `reminders` (unchanged from Phase V).

**Partition key**: Pass via `metadata={"partitionKey": user_id}` on `publish_event()`.

**CloudEvents**: Dapr wraps messages in CloudEvents 1.0 envelope by default. Consumer handlers receive the `data` field containing the original payload. Non-Dapr consumers (existing `kafka-consumer` service) can receive raw payloads by setting `rawPayload: "true"` on subscriptions.

---

## R3 — Fire-and-Forget Publish (Non-Blocking)

**Decision**: Use FastAPI `BackgroundTasks.add_task()` to run `DaprClient.publish_event()` in a thread pool.

**Rationale**: Since `DaprClient` is synchronous, calling it inside `async def` blocks the asyncio event loop. `BackgroundTasks` delegates to FastAPI's internal thread pool executor. The response is returned before the publish completes — true fire-and-forget.

**Pattern**:
```python
from fastapi import BackgroundTasks
from dapr.clients import DaprClient
import json

def _publish_sync(pubsub: str, topic: str, data: dict, partition_key: str) -> None:
    try:
        with DaprClient() as client:
            client.publish_event(
                pubsub_name=pubsub,
                topic_name=topic,
                data=json.dumps(data),
                data_content_type="application/json",
                metadata={"partitionKey": partition_key},
            )
    except Exception as exc:
        logger.error("Dapr publish failed [topic=%s]: %s", topic, exc)

# In route handler:
background_tasks.add_task(_publish_sync, "kafka-pubsub", "task-events", event, user_id)
```

**Alternative**: `asyncio.create_task(asyncio.to_thread(...))` — also valid but errors are silently dropped unless wrapped with exception logging.

---

## R4 — Jobs API: Python SDK Unavailable for Dapr 1.14

**Decision**: Use `httpx` HTTP API calls to the Dapr sidecar at `localhost:3500/v1.0-alpha1/jobs/{name}`.

**Rationale**: The Dapr Python SDK gained Jobs API support only in version 1.16.0 (released Sept 2025). For Dapr 1.14 with `dapr==1.15.0`, no SDK methods (`schedule_job`, `get_job`, `delete_job`) are available. The HTTP API is stable and available since Dapr 1.13.

**Registration at startup** (FastAPI lifespan):
```python
async def _register_jobs() -> None:
    dapr_port = os.getenv("DAPR_HTTP_PORT", "3500")
    async with httpx.AsyncClient() as client:
        await client.post(
            f"http://localhost:{dapr_port}/v1.0-alpha1/jobs/reminder-scan",
            json={"schedule": "@every 5m", "data": {"type": "reminder_scan"}},
            timeout=10.0,
        )
```

**Trigger reception**: Dapr calls `POST /job/{job-name}` on the app's HTTP port when the job fires. FastAPI must expose this endpoint. No YAML subscription needed — the path is hardcoded by Dapr.

**Schedule format**: Standard 5-field cron (`"*/5 * * * *"`), 6-field with seconds, or `@every` Go duration (`"@every 5m"`).

**Upgrade path**: When moving to Dapr 1.16+, replace `httpx` calls with `DaprClient().schedule_job(name=..., schedule=..., data=...)`.

---

## R5 — State Store: Redis with TTL

**Decision**: Use `state.redis` v1 component with per-key TTL via `state_metadata={"ttlInSeconds": "300"}`.

**Rationale**: Redis is the standard Dapr state store for low-latency caching. The 5-minute TTL matches the spec's cache freshness requirement. Dapr 1.14 enforces TTL strictness — stores without TTL support return an error, so Redis is the safe choice.

**Key naming**: Dapr auto-prefixes with `{app-id}||{key}`. Using `keyPrefix: appid` (default), key `"tasks:user-123"` is stored as `todo-backend||tasks:user-123` in Redis. Code never sees the prefix.

**Cache invalidation**: On create/update/delete/toggle, call `client.delete_state(store_name="statestore", key=f"tasks:{user_id}")`. No ETag needed for cache invalidation — last-write-wins.

**Fail-open**: Wrap all state store calls in `try/except`. On `RpcError`, log and proceed with database query.

**Component YAML (Kubernetes)**:
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: todo-platform
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis-master.todo-platform.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: redis-password
    - name: enableTLS
      value: "false"
    - name: keyPrefix
      value: "appid"
  auth:
    secretStore: kubernetes
```

---

## R6 — Secrets: Kubernetes Secret Store

**Decision**: Use `secretstores.kubernetes` component. Read `DATABASE_URL` and `BETTER_AUTH_SECRET` from a K8s Secret named `todo-app-secrets` at application startup.

**Rationale**: The Kubernetes secret store requires no spec configuration — the Dapr sidecar uses the pod's service account and K8s RBAC to access secrets. No external vault (Vault, Azure Key Vault) is needed for the hackathon scope.

**Component YAML**:
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes
  namespace: todo-platform
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

**RBAC**: The pod's service account needs `get` and `list` on `secrets` in the `todo-platform` namespace.

**Loading at startup**:
```python
def load_secrets_from_dapr() -> dict:
    try:
        with DaprClient() as client:
            resp = client.get_secret(
                store_name="kubernetes",
                key="todo-app-secrets",  # K8s Secret object name
            )
            return resp.secret  # dict: {"DATABASE_URL": "...", "BETTER_AUTH_SECRET": "..."}
    except Exception:
        return {}  # fallback to env vars (local dev without sidecar)
```

**Fail-fast**: If `DATABASE_URL` is not available from either Dapr secrets or env vars after startup, the app raises `ValueError` and exits — matching spec FR-011.

**Env var precedence**: Local dev uses `.env` via `python-dotenv`; Kubernetes uses Dapr secrets. The `Settings` class tries Dapr first, falls back to `os.getenv`.

---

## R7 — Service Invocation: Sidecar HTTP Proxy

**Decision**: Frontend calls backend via Dapr sidecar HTTP proxy: `http://localhost:3500/v1.0/invoke/todo-backend/method/{path}`. No code changes to FastAPI routes.

**Rationale**: Service invocation requires only pod annotations (`dapr.io/app-id`, `dapr.io/app-port`) and the calling service to route through its local sidecar port. FastAPI receives forwarded requests on its normal port — the sidecar is transparent.

**Annotations** (backend Deployment):
```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "todo-backend"
  dapr.io/app-port: "8000"
  dapr.io/log-level: "info"
```

**Frontend calling pattern** (Next.js API route):
```typescript
const DAPR_PORT = process.env.DAPR_HTTP_PORT ?? "3500";
const res = await fetch(
  `http://localhost:${DAPR_PORT}/v1.0/invoke/todo-backend/method/api/${userId}/tasks`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Local dev**: Without K8s, `dapr run --app-id todo-frontend --dapr-http-port 3500 -- npm run dev` enables service invocation via mDNS. For pure local dev (no Dapr), the frontend can still call `NEXT_PUBLIC_API_URL` directly.

---

## R8 — Sidecar Injection and Dapr Control Plane

**Decision**: Install Dapr control plane via Helm (Dapr 1.14.0) into `dapr-system` namespace. Enable sidecar injection with `dapr.io/enabled: "true"` annotations on backend, frontend, and kafka-consumer pods.

**Prerequisite**:
```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr \
  --namespace dapr-system --create-namespace \
  --version 1.14.0 --wait
```

**Sidecar readiness**: Add an init container or use `dapr.io/wait-for-sidecar: "true"` annotation to delay app startup until the Dapr sidecar is ready (health endpoint: `http://localhost:3500/v1.0/healthz/ready`).

**Alternatives considered**: Dapr CLI self-hosted mode for local dev — suitable for testing individual components but not required if developers use Docker Compose with Dapr sidecar containers.
