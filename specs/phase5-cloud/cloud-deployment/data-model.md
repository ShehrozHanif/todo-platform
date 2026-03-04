# Data Model: Cloud Deployment

**Feature**: cloud-deployment
**Branch**: `003-cloud-deployment`
**Date**: 2026-03-04

This feature is infrastructure-as-code (IaC), not a database-schema feature. The "data model" here describes the **configuration entities** managed as files/manifests, and the **pipeline state entities** tracked by GitHub Actions.

---

## Entity 1: CloudValues (Helm Values Override)

**What it represents**: Environment-specific Helm values for the cloud target. Extends the existing `k8s/helm/todo-platform/` charts without modifying base charts.

**File path**: `cloud/helm/values-cloud.yaml`

**Fields**:

```yaml
# Image configuration (overrides base values)
backend:
  image:
    repository: ghcr.io/<owner>/todo-backend
    tag: <git-sha>           # Set by CI/CD pipeline
  dapr:
    enabled: true            # Activate sidecar in cloud
  resources:
    requests: { cpu: 200m, memory: 256Mi }
    limits:   { cpu: 1000m, memory: 512Mi }
  replicaCount: 2            # HA: 2 replicas in cloud

frontend:
  image:
    repository: ghcr.io/<owner>/todo-frontend
    tag: <git-sha>
  dapr:
    enabled: true
  replicaCount: 2

ingress:
  enabled: true
  className: nginx
  host: todo.<cluster-ip>.nip.io    # nip.io wildcard DNS for TLS
  tls: true
  clusterIssuer: letsencrypt-prod

kafka:
  enabled: true              # Deploy in-cluster Bitnami Kafka
  replicaCount: 1

redis:
  enabled: true              # Deploy in-cluster Bitnami Redis
  replicaCount: 1
```

**Validation rules**:
- `image.tag` must be a valid Git SHA (40-char hex or short SHA)
- `dapr.enabled` must be `true` in cloud environment
- `replicaCount` must be ≥ 1
- `ingress.enabled` must be `true` for public access

---

## Entity 2: ContainerImage

**What it represents**: A versioned Docker image stored in the container registry. Built by the CI pipeline and referenced in Helm deployments.

**Registry**: `ghcr.io/<owner>/todo-<service>`

**Tagging scheme**:
| Tag | When Set | Purpose |
|-----|----------|---------|
| `<git-sha>` | Every master push | Immutable version reference |
| `latest` | Every master push | Convenience tag for manual pulls |

**Services**:
- `ghcr.io/<owner>/todo-backend` — FastAPI backend (Python 3.13)
- `ghcr.io/<owner>/todo-frontend` — Next.js frontend

**Metadata labels** (OCI standard):
```
org.opencontainers.image.revision = <git-sha>
org.opencontainers.image.created  = <timestamp>
org.opencontainers.image.source   = https://github.com/<owner>/todo-platform
```

---

## Entity 3: PipelineRun (GitHub Actions)

**What it represents**: A CI/CD pipeline execution triggered by a git push event. GitHub Actions manages this natively — no custom storage needed.

**Lifecycle**:
```
triggered → build → test → push → deploy → verify → (success | rollback)
```

**Stages and conditions**:
| Stage | Trigger Condition | On Failure |
|-------|-------------------|------------|
| build | Always on push to master | Fail pipeline, no push |
| test | build succeeds | Fail pipeline, no deploy |
| push | test succeeds | Fail pipeline, no deploy |
| deploy | push succeeds | Fail pipeline, trigger alert |
| verify | deploy completes | Trigger rollback |
| rollback | verify fails | Notify developer |

**Key GitHub Actions environment variables**:
- `GITHUB_SHA` — Git commit hash (used as image tag)
- `GITHUB_REF` — Branch reference (used to gate CD to master only)

---

## Entity 4: KubernetesSecret

**What it represents**: A Kubernetes Secret object containing sensitive credentials, consumed by pods via the Dapr Kubernetes secrets store.

**Secrets created** (via `kubectl create secret` — NOT committed to git):
```yaml
# Backend secrets
kubectl create secret generic todo-backend-secrets \
  --from-literal=DATABASE_URL="postgresql+asyncpg://..." \
  --from-literal=BETTER_AUTH_SECRET="..." \
  --from-literal=OPENAI_API_KEY="..." \
  -n todo-platform

# Frontend secrets
kubectl create secret generic todo-frontend-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=BETTER_AUTH_SECRET="..." \
  -n todo-platform
```

**Dapr binding**: The existing `cloud/dapr/components/kubernetes.yaml` Dapr Secrets component references these secrets, which `sidecar/secrets.py` loads at startup.

**Validation**:
- Must exist in the `todo-platform` namespace before first deployment
- Must NOT appear in Git history or CI logs
- Referenced in CI/CD via GitHub Actions repository secrets (not environment variables)

---

## Entity 5: MonitoringRule (Prometheus AlertRule)

**What it represents**: A declarative alert condition applied to the Prometheus/AlertManager stack via a PrometheusRule CRD.

**File path**: `cloud/monitoring/alerts/backend-errors.yaml`

**Key fields**:
```yaml
groups:
  - name: todo-backend-alerts
    rules:
      - alert: HighErrorRate
        expr: |
          rate(http_requests_total{status=~"5..",job="todo-backend"}[5m])
          / rate(http_requests_total{job="todo-backend"}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Backend error rate > 5%"

      - alert: PodCrashLoop
        expr: |
          increase(kube_pod_container_status_restarts_total{namespace="todo-platform"}[10m]) > 2
        for: 2m
        labels:
          severity: critical
```

**State transitions**: `pending → firing → resolved`

---

## Entity 6: DaprComponent (Cloud Overrides)

**What it represents**: Dapr component YAML files configured for the cloud environment (different from local/Minikube configs).

**Files**:
| File | Purpose | Differences from local |
|------|---------|----------------------|
| `cloud/dapr/components/pubsub.yaml` | Kafka pub/sub | `brokers: todo-kafka:9092` (in-cluster service name) |
| `cloud/dapr/components/statestore.yaml` | Redis state | `redisHost: todo-redis-master:6379` (in-cluster) |
| `cloud/dapr/components/kubernetes.yaml` | K8s secrets | Same — uses cluster's native secrets API |

---

## Entity Relationships

```
PipelineRun
  └─builds──► ContainerImage (tagged with GITHUB_SHA)
  └─deploys─► CloudValues (with image.tag = GITHUB_SHA)
  └─reads────► KubernetesSecret (via GitHub Actions secrets)

CloudValues
  └─references─► ContainerImage
  └─enables────► DaprComponent (dapr.enabled: true)

DaprComponent (kubernetes.yaml)
  └─reads──────► KubernetesSecret (at pod startup)

MonitoringRule
  └─scrapes────► Pod metrics (via kube-prometheus ServiceMonitor)
```
