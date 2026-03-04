# Quickstart: Dapr Integration — Local Development

**Feature**: Dapr Integration | **Branch**: `002-dapr-integration` | **Date**: 2026-03-04

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Dapr CLI | 1.14.x | `winget install Dapr.CLI` or https://docs.dapr.io/getting-started/install-dapr-cli/ |
| Docker Desktop | Latest | Required for Dapr self-hosted Redis + Zipkin |
| Python | 3.13+ | |
| UV | Latest | `pip install uv` |

---

## Option A: Run WITHOUT Dapr (Existing behavior, all tests pass)

No Dapr installation required. The app runs in pure FastAPI mode:
- Kafka events: disabled (no `KAFKA_BOOTSTRAP_SERVERS` in env)
- Dapr pub/sub: silently fails-open (no sidecar → `_publish_sync` logs warning)
- State store: skipped (get_cached_tasks returns None → DB fallback)
- Jobs: registration fails-open (httpx call to localhost:3500 fails → WARNING logged)
- Secrets: `load_secrets_from_dapr()` returns `{}` → `.env` values used

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

All 94+ existing tests continue to pass (they mock DaprClient).

---

## Option B: Run WITH Dapr CLI (Self-Hosted Mode)

### Step 1: Initialize Dapr self-hosted

```bash
dapr init
```

This installs:
- Dapr control plane containers (`dapr_redis`, `dapr_zipkin`, `dapr_placement`)
- `~/.dapr/components/` with default Redis and Zipkin component files

### Step 2: Verify Dapr is running

```bash
dapr status
```

Expected: `dapr_redis`, `dapr_placement`, `dapr_zipkin` all `Running`.

### Step 3: Copy Dapr component files

```bash
# From repo root:
cp cloud/dapr/components/pubsub.yaml ~/.dapr/components/
cp cloud/dapr/components/statestore.yaml ~/.dapr/components/statestore-override.yaml
```

> **Note**: The default `~/.dapr/components/statestore.yaml` (from `dapr init`) already configures Redis. Rename our file to avoid conflict.
>
> For local dev, the default `statestore.yaml` from `dapr init` works as-is (Redis on localhost:6379).

### Step 4: Set up environment

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and BETTER_AUTH_SECRET
# Dapr secrets are NOT used in self-hosted mode (no K8s); .env values are used instead
```

### Step 5: Run backend with Dapr sidecar

```bash
cd backend
dapr run \
  --app-id todo-backend \
  --app-port 8000 \
  --dapr-http-port 3500 \
  --components-path ~/.dapr/components \
  -- uv run uvicorn main:app --port 8000
```

### Step 6: Verify sidecar health

```bash
curl http://localhost:3500/v1.0/healthz
# Expected: 200 OK, body: ""
```

### Step 7: Test Pub/Sub

```bash
# Create a task (triggers background publish)
curl -X POST http://localhost:8000/api/test-user/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-test-token>" \
  -d '{"title": "Test Dapr task"}'

# Check Zipkin traces (optional)
open http://localhost:9411
```

### Step 8: Test State Store Cache

```bash
# First request (cache miss — queries DB)
curl http://localhost:8000/api/test-user/tasks -H "Authorization: Bearer <token>"

# Second request within 5 min (cache hit — no DB query)
curl http://localhost:8000/api/test-user/tasks -H "Authorization: Bearer <token>"

# Check Redis directly
redis-cli keys "todo-backend||tasks:*"
```

### Step 9: Test Jobs API

```bash
# Check job is registered
curl http://localhost:3500/v1.0-alpha1/jobs/reminder-scan

# Trigger manually (simulates Dapr calling callback)
curl -X POST http://localhost:8000/job/reminder-scan
# Expected: 204 No Content
```

---

## Option C: Run on Kubernetes (Minikube)

### Prerequisites

```bash
minikube start --driver=docker --memory=4096
kubectl config use-context minikube

# Install Dapr control plane
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr \
  --namespace dapr-system --create-namespace \
  --version 1.14.0 --wait

# Install Redis (for State Store)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install redis bitnami/redis \
  --namespace todo-platform --create-namespace \
  --set auth.enabled=true
```

### Deploy Dapr components

```bash
# Apply component YAML files to namespace
kubectl apply -f cloud/dapr/components/ -n todo-platform
```

### Create secrets

```bash
# Create the K8s secret that Dapr will load
kubectl create secret generic todo-app-secrets \
  --from-literal=DATABASE_URL="postgresql+asyncpg://..." \
  --from-literal=BETTER_AUTH_SECRET="your-secret" \
  -n todo-platform

# Create Redis auth secret
REDIS_PASS=$(kubectl get secret redis -n todo-platform -o jsonpath="{.data.redis-password}" | base64 -d)
kubectl create secret generic redis-secret \
  --from-literal=redis-password="$REDIS_PASS" \
  -n todo-platform
```

### Deploy the platform

```bash
# From repo root — Helm chart includes Dapr annotations
helm upgrade --install todo-platform k8s/helm/todo-platform \
  --namespace todo-platform \
  --set dapr.enabled=true

# Verify sidecar injection
kubectl get pods -n todo-platform
# Each pod should show 3/3 READY (app + dapr-sidecar + dapr-token-server)
```

---

## Running Tests (No Dapr Required)

Tests mock `DaprClient` — no sidecar needed:

```bash
cd backend
uv run pytest -v
uv run pytest --cov=. --cov-report=term-missing
```

Expected: All tests pass, coverage ≥80% for `dapr/` module.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `connection refused localhost:3500` | Dapr sidecar not running — use Option A (no Dapr) or start with `dapr run` |
| `WARNING: Dapr secrets unavailable` | Expected in local dev — `.env` values are used as fallback |
| `WARNING: Job registration failed` | Sidecar not available — scheduler won't run; use manual endpoint for testing |
| `tasks:user-*` not in Redis | State store component name mismatch — check `metadata.name: statestore` in YAML |
| 400 on `/job/reminder-scan` | Route not mounted — check `main.py` includes `jobs_router` |
