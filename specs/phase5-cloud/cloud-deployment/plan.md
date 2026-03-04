# Implementation Plan: Cloud Deployment

**Feature**: cloud-deployment
**Branch**: `003-cloud-deployment`
**Date**: 2026-03-04
**Status**: Ready for implementation

---

## 1. Technical Context

### Stack

| Layer | Technology | Version / Source |
|-------|-----------|-----------------|
| Cloud Provider | OKE (Oracle Kubernetes Engine) | Always-Free tier (4 ARM vCPU / 24 GB RAM) |
| Kubernetes | OKE managed cluster | Kubernetes 1.29+ |
| Container Registry | GitHub Container Registry (ghcr.io) | Free for public repos |
| CI/CD | GitHub Actions | Two workflows: `ci.yml` + `cd.yml` |
| Ingress | NGINX Ingress Controller + cert-manager | Helm charts |
| TLS | Let's Encrypt (ACME HTTP-01) | Free; via cert-manager |
| DNS | nip.io wildcard DNS | `todo.<ip>.nip.io` |
| Metrics | kube-prometheus-stack (Prometheus + Grafana + AlertManager) | Helm chart |
| Logs | Grafana Loki + Grafana Alloy | Helm chart (Alloy replaces EOL Promtail) |
| In-cluster cache | Bitnami Redis (standalone, 1 replica) | Helm sub-chart |
| In-cluster events | Bitnami Kafka (KRaft, 1 broker) | Helm sub-chart |
| Secrets | Dapr Kubernetes Secrets Store | Existing `cloud/dapr/components/kubernetes.yaml` |
| Deployment tool | Helm 3 | `helm upgrade --atomic` |
| Rollback | Native Helm (`helm rollback` on failure) | Built into deploy workflow |

### Key Architectural Principles

- **Cloud-agnostic first**: NGINX Ingress, cert-manager, ghcr.io, and Prometheus work on any K8s cluster
- **Zero new code**: All infrastructure-as-code; no changes to application business logic
- **Secrets never in git**: `kubectl create secret` only; Dapr reads at runtime
- **Helm as single source of truth**: One `helm upgrade --atomic` command deploys everything
- **Atomic rollback**: `--atomic` flag auto-rolls back if pods don't become Ready within timeout

---

## 2. Architecture Overview

```
Developer → git push master
                │
                ▼
    ┌──────────────────────────┐
    │   ci.yml (GitHub Actions) │
    │  build ──── test (138+)  │
    │       ↓ on success        │
    │  push to ghcr.io         │
    └──────────────────────────┘
                │
    ┌──────────────────────────┐
    │   cd.yml (GitHub Actions) │
    │  helm upgrade --atomic   │
    │  (on master only)        │
    └──────────────────────────┘
                │
                ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    OKE Cluster (todo-platform ns)           │
    │                                                             │
    │  NGINX Ingress ──► /api/* → Backend (2 pods + Dapr)        │
    │  (Let's Encrypt)   /*    → Frontend (2 pods + Dapr)        │
    │                                                             │
    │  Backend Dapr Sidecar:                                      │
    │    - Pub/Sub  → Kafka (todo-kafka:9092)                    │
    │    - State    → Redis (todo-redis-master:6379)             │
    │    - Secrets  → K8s Secrets API                            │
    │                                                             │
    │  Monitoring ns:                                             │
    │    Prometheus ← ServiceMonitor ← /metrics (FastAPI)        │
    │    Grafana dashboards + AlertManager                        │
    │    Loki ← Grafana Alloy (DaemonSet)                        │
    └─────────────────────────────────────────────────────────────┘
```

---

## 3. Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| SDD artifacts before implementation | ✅ | spec.md, research.md, data-model.md, contracts/ done |
| TDD (tests before code) | ✅ | 138 tests pass in CI before any deploy proceeds |
| No hardcoded secrets | ✅ | K8s secrets + Dapr; never in git or CI env vars |
| Cloud-native stateless design | ✅ | All state in Neon DB; pods are stateless |
| Container images multi-stage minimal | ✅ | Existing Dockerfiles already multi-stage |
| 80%+ test coverage | ✅ | 138 tests; sidecar at 100% |
| GitHub Actions for CI/CD | ✅ | Required by constitution |
| Atomic rollback on failure | ✅ | `helm upgrade --atomic` |

---

## 4. Phased Implementation Plan

### Phase 1: GitHub Actions CI Workflow

**Goal**: Automated build and test on every push and pull request.

**File**: `.github/workflows/ci.yml`

**Jobs** (parallel):
- `build-backend`: checkout → setup-buildx → login ghcr.io → `docker build -f backend/Dockerfile`
- `build-frontend`: checkout → setup-buildx → login ghcr.io → `docker build -f k8s/Dockerfile.frontend`
- `test`: checkout → setup-python 3.13 → setup-uv → `uv sync` → `uv run pytest -v --tb=short`

**Path filter** (dorny/paths-filter): skip if only docs/markdown changed.

**On push to master + all jobs succeed**: trigger cd.yml via `workflow_call`.

**Key constraints**:
- `GITHUB_TOKEN` only (no extra secrets) — ghcr.io login uses it automatically
- Tests use `sqlite+aiosqlite:///:memory:` — no external services needed in CI
- Non-zero pytest exit = pipeline fail = no push, no deploy

---

### Phase 2: GitHub Actions CD Workflow

**Goal**: Automated deploy to OKE cluster on master push.

**File**: `.github/workflows/cd.yml`

**Required GitHub Secrets** (set in repo settings):
| Secret | Value |
|--------|-------|
| `KUBECONFIG_B64` | base64-encoded OKE kubeconfig |
| `HELM_NAMESPACE` | `todo-platform` |

**Steps**:
1. Decode kubeconfig: `echo "$KUBECONFIG_B64" | base64 -d > ~/.kube/config`
2. Install Helm
3. `helm upgrade --install todo-platform k8s/helm/todo-platform` with:
   - `-f cloud/helm/values-cloud.yaml`
   - `-f cloud/helm/values-dapr.yaml`
   - `--set backend.image.tag=$GITHUB_SHA`
   - `--set frontend.image.tag=$GITHUB_SHA`
   - `--atomic --timeout 5m` (auto-rollback on failure)
4. Verify: `kubectl rollout status` + `curl -f https://<host>/health`
5. On failure: `helm rollback` (atomic handles this, but explicit rollback as safety net)

---

### Phase 3: Cloud Helm Values Files

**Goal**: Environment-specific Helm overrides for cloud deployment (no modification to base charts).

**Files to create**:

#### `cloud/helm/values-cloud.yaml`
```yaml
backend:
  replicaCount: 2
  image:
    repository: ghcr.io/<owner>/todo-backend
    tag: "latest"           # Overridden by --set at deploy time
    pullPolicy: Always
  dapr:
    enabled: true
  env:
    ALLOWED_ORIGINS: "https://todo.<ip>.nip.io"
    KAFKA_BOOTSTRAP_SERVERS: "todo-kafka:9092"
  resources:
    requests: { cpu: 200m, memory: 256Mi }
    limits:   { cpu: 1000m, memory: 512Mi }
  probes:
    liveness:  { path: /health, initialDelaySeconds: 15, periodSeconds: 30 }
    readiness: { path: /health, initialDelaySeconds: 10, periodSeconds: 10 }

frontend:
  replicaCount: 2
  image:
    repository: ghcr.io/<owner>/todo-frontend
    tag: "latest"
    pullPolicy: Always
  dapr:
    enabled: true
  env:
    NEXT_PUBLIC_API_URL: "https://todo.<ip>.nip.io"
    NEXT_PUBLIC_APP_URL: "https://todo.<ip>.nip.io"
    BETTER_AUTH_URL: "https://todo.<ip>.nip.io"
  resources:
    requests: { cpu: 100m, memory: 128Mi }
    limits:   { cpu: 500m, memory: 256Mi }

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  host: todo.<ip>.nip.io
  tls:
    enabled: true
    secretName: todo-tls
  rules:
    - path: /api
      service: todo-backend
      port: 8000
    - path: /
      service: todo-frontend
      port: 3000
```

#### `cloud/helm/values-dapr.yaml`
```yaml
daprComponents:
  pubsub:
    brokers: "todo-kafka:9092"
  statestore:
    redisHost: "todo-redis-master:6379"
  secrets:
    type: kubernetes
```

---

### Phase 4: In-Cluster Dependencies (Kafka + Redis)

**Goal**: Deploy Kafka and Redis as sub-charts of the main Helm release.

**Kafka** (added to `k8s/helm/todo-platform/Chart.yaml` as dependency):
```yaml
- name: kafka
  repository: "https://charts.bitnami.com/bitnami"
  version: "~28.0"
  condition: kafka.enabled
```

**Redis** (added as dependency):
```yaml
- name: redis
  repository: "https://charts.bitnami.com/bitnami"
  version: "~19.0"
  condition: redis.enabled
```

**Values in `cloud/helm/values-cloud.yaml`**:
```yaml
kafka:
  enabled: true
  replicaCount: 1
  kraft:
    enabled: true    # No ZooKeeper
  persistence:
    enabled: true
    size: 8Gi

redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false   # Internal cluster only
  master:
    persistence:
      enabled: true
      size: 2Gi
```

**Ordering**: Kafka and Redis start before backend via Kubernetes readiness checks (initContainers or `helm --wait`).

---

### Phase 5: NGINX Ingress + cert-manager + TLS

**Goal**: Public HTTPS access with automatic TLS certificate via Let's Encrypt.

**One-time cluster setup** (run once per cluster, not in CI/CD):
```bash
# NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace --wait

# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true --wait
```

**ClusterIssuer** (`cloud/k8s/letsencrypt-prod.yaml`):
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: <developer-email>
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

**nip.io hostname**: After `ingress-nginx` gets an external IP (e.g., `130.61.x.x`), the hostname is `todo.130.61.x.x.nip.io`.

---

### Phase 6: Monitoring Stack

**Goal**: Prometheus metrics, Grafana dashboards, AlertManager alerts, Loki logs.

**Install** (one-time):
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f cloud/monitoring/values-prometheus.yaml --wait

helm upgrade --install loki grafana/loki-stack \
  --set grafana.enabled=false \
  --set alloy.enabled=true \   # Grafana Alloy (Promtail EOL March 2026)
  -n monitoring --wait
```

**Backend metrics** — add to `backend/main.py`:
```python
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app, endpoint="/metrics")
```

**Add to `backend/pyproject.toml`**:
```
prometheus-fastapi-instrumentator>=7.0
```

**Files to create**:
- `cloud/monitoring/servicemonitor-backend.yaml` — ServiceMonitor CRD
- `cloud/monitoring/alerts/backend-errors.yaml` — PrometheusRule CRD (HighErrorRate, PodCrashLoop, ServiceDown)
- `cloud/monitoring/grafana/dashboards/todo-platform.json` — Grafana dashboard JSON

---

### Phase 7: Kubernetes Secrets (One-Time Setup)

**Goal**: Create K8s secrets that Dapr reads at pod startup. Never committed to git.

**Commands** (run by human operator once per new cluster):
```bash
kubectl create namespace todo-platform

kubectl create secret generic todo-backend-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
  -n todo-platform

kubectl create secret generic todo-frontend-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -n todo-platform
```

**Verification**: `kubectl get secrets -n todo-platform` (lists secrets by name only, values hidden).

---

## 5. File Structure

Files created by this feature:

```
.github/
└── workflows/
    ├── ci.yml                         # Build + test on every push
    └── cd.yml                         # Deploy to OKE on master push

cloud/
├── helm/
│   ├── values-cloud.yaml              # Cloud-specific Helm overrides
│   └── values-dapr.yaml               # Dapr component overrides for cloud
├── k8s/
│   └── letsencrypt-prod.yaml          # ClusterIssuer for cert-manager
├── dapr/
│   └── components/
│       ├── kubernetes.yaml            # EXISTS (Dapr K8s secrets) - no change
│       ├── pubsub.yaml                # EXISTS - verify brokers: todo-kafka:9092
│       └── statestore.yaml            # EXISTS - verify redisHost: todo-redis-master:6379
└── monitoring/
    ├── servicemonitor-backend.yaml     # Prometheus scrape config
    ├── alerts/
    │   └── backend-errors.yaml        # PrometheusRule CRD
    └── grafana/
        └── dashboards/
            └── todo-platform.json     # Grafana dashboard

backend/
├── main.py                            # ADD: prometheus_fastapi_instrumentator
└── pyproject.toml                     # ADD: prometheus-fastapi-instrumentator>=7.0
```

**No changes to**:
- `k8s/helm/todo-platform/` (base charts untouched)
- `backend/routes/`, `backend/models.py` (no app logic changes)
- `frontend/` (no app logic changes)

---

## 6. Dependency Graph

```
Phase 1 (ci.yml)
  └─► Phase 2 (cd.yml)     [needs CI to succeed first]
        └─► Phase 3 (Helm values)  [cd.yml reads these files]
              └─► Phase 4 (Kafka + Redis sub-charts)  [values-cloud.yaml enables them]

Phase 5 (Ingress + TLS)    [independent, one-time cluster setup]
Phase 6 (Monitoring)       [independent, one-time cluster setup]
        └─► Phase 6b: backend/main.py prometheus patch [needed for metrics scraping]
Phase 7 (Secrets)          [independent, one-time cluster setup; must exist before Phase 2 runs]
```

**Critical path**: Phase 7 → Phase 3 → Phase 4 → Phase 2 → Phase 1

---

## 7. Verification Checklist

After implementation, verify each success criterion:

| Criterion | Verification Command |
|-----------|---------------------|
| SC-001: Public HTTPS URL in <30 min | `curl -f https://todo.<ip>.nip.io/health` |
| SC-002: Pipeline <10 min | `gh run view --json createdAt,updatedAt` |
| SC-003: 138 tests pass in CI | GitHub Actions test job output |
| SC-004: Dashboard data lag <60 sec | Grafana → Todo Platform dashboard |
| SC-005: No plaintext secrets | `git log --all -S "postgresql+asyncpg"` → no output |
| SC-006: Pod restart <60 sec downtime | `kubectl delete pod <name> -n todo-platform` → watch recovery |
| SC-007: 50 concurrent users | `hey -n 1000 -c 50 https://<host>/health` |

---

## 8. Risk Analysis

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| OKE always-free ARM compute is incompatible with amd64 images | Medium | Add `--platform linux/arm64` to Docker build or use multi-arch builds |
| Let's Encrypt rate limit (5 certs/domain/week on nip.io) | Low | Use staging issuer for testing; only switch to prod for demo |
| Grafana Alloy DaemonSet RAM > OKE free tier memory | Low | Set Alloy resource limits to 128Mi; use lightweight scrape config |
| `helm upgrade --atomic` 5-min timeout too short for Kafka startup | Medium | Set `--timeout 10m` for initial deploy; 5m for subsequent deploys |

---

## 9. ADR Notes

📋 **Architectural decision detected**: OKE (Oracle) vs GKE vs AKS for cloud provider — Document? Run `/sp.adr cloud-provider-selection`

📋 **Architectural decision detected**: Two GitHub Actions workflows (ci.yml + cd.yml) vs single workflow — Document? Run `/sp.adr cicd-workflow-structure`
