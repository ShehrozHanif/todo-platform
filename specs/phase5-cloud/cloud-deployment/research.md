# Research: Cloud Deployment Technical Decisions

**Feature**: cloud-deployment
**Branch**: `003-cloud-deployment`
**Date**: 2026-03-04

---

## Decision 1: Cloud Provider

**Decision**: OKE (Oracle Kubernetes Engine) — Always Free tier

**Rationale**:
- Truly **always-free** (no time limit, no credit card expiry): 4 ARM vCPU (Ampere A1) + 24 GB RAM
- 2 free block volumes (200 GB total) — sufficient for Kafka + Redis PVCs
- 1 free load balancer — used for NGINX Ingress external IP
- GitHub Actions integration via `oracle-actions/configure-kubectl-oci` (well-documented)
- OKE supports standard Helm/kubectl workflows — no OCI-specific lock-in in app code

**Alternatives considered**:
- **GKE (Google)**: $300 free trial credit only (expires in 90 days); no always-free GKE nodes. Better Dapr docs but time-limited.
- **AKS (Azure)**: Free tier exhausted quickly; no always-free AKS nodes; GitHub integration is best (Microsoft owns GitHub) but costs money after trial.
- **Minikube (local)**: Already done in Phase 4. Not suitable for public access.

**Implementation**: Use `oracle-actions/configure-kubectl-oci` in cd.yml with `KUBECONFIG_B64` GitHub Secret. ARM64 node pool — ensure Docker images are multi-arch (`linux/arm64,linux/amd64`) using `docker buildx`.

---

## Decision 2: Container Registry

**Decision**: GitHub Container Registry (ghcr.io)

**Rationale**:
- Free for public repositories (our repo is public)
- Zero configuration: uses `GITHUB_TOKEN` (auto-injected by GitHub Actions — no separate registry secret needed)
- Images: `ghcr.io/<owner>/todo-backend:<sha>` and `ghcr.io/<owner>/todo-frontend:<sha>`
- Works with any cloud provider (cloud-agnostic)
- Packages tab in GitHub repo shows image history

**Alternatives considered**:
- **Docker Hub**: Free tier rate-limited (100 pulls/6h for unauthenticated, 200 for free accounts). CI pipelines frequently hit limits.
- **Google Artifact Registry**: Best if using GKE (co-located, faster pulls), but requires Service Account JSON secret in GitHub. Extra complexity for a hackathon.
- **AWS ECR / Azure ACR**: Overkill for a single-cloud deployment.

---

## Decision 3: GitHub Actions Workflow Structure

**Decision**: Two workflow files — `.github/workflows/ci.yml` (build + test + push) and `.github/workflows/cd.yml` (deploy)

**Rationale**:
- `ci.yml`: builds and tests on every push and PR; pushes images on master only
- `cd.yml`: triggered by `workflow_call` from ci.yml on master success; deploys via Helm
- `dorny/paths-filter`: skips backend build if only frontend changed, and vice versa — faster pipelines for service-specific changes
- Separation makes it easy to run CI without CD (PRs) and to manually trigger CD via `workflow_dispatch`
- Two-file structure is the recommended GitHub Actions pattern for projects with CI/CD separation

**Alternatives considered**:
- **Single ci-cd.yml**: Simpler but harder to trigger CI and CD independently; can't re-run deploy step without re-running tests
- **Matrix strategy**: Unnecessary — only 2 services (frontend, backend)

---

## Decision 4: Kubernetes Ingress for HTTPS

**Decision**: NGINX Ingress Controller + cert-manager + Let's Encrypt + nip.io DNS

**Rationale**:
- Provider-agnostic: works on GKE, AKS, OKE, Minikube
- cert-manager automates TLS certificate renewal (Let's Encrypt ACME)
- nip.io wildcard DNS (`<ip>.nip.io`) gives a stable HTTPS hostname without domain registration
- NGINX handles path-based routing: `/api/*` → backend, `/*` → frontend (eliminates CORS complexity)

**Alternatives considered**:
- **GKE Managed Certificates**: GKE-specific; requires Google-managed domain/IP. Not portable.
- **Cloud LB with ACM (AWS)**: AWS-specific. Not applicable.
- **Traefik**: Similar complexity to NGINX but less familiar to the team.

**nip.io pattern**: If GKE external IP is `34.1.2.3`, hostname is `todo.34.1.2.3.nip.io`. Works with Let's Encrypt HTTP-01 challenge.

---

## Decision 5: Monitoring Stack

**Decision**: kube-prometheus-stack Helm chart (Prometheus + Grafana + AlertManager)

**Rationale**:
- Single Helm install deploys complete monitoring stack
- kube-state-metrics and node-exporter included — no extra setup for Kubernetes metrics
- Grafana dashboards importable as JSON — version-controllable in `cloud/monitoring/`
- PrometheusRule CRDs for declarative alert rules (committed to `cloud/monitoring/alerts/`)
- Free and open-source; runs entirely in-cluster

**Alternatives considered**:
- **GCP Cloud Monitoring**: Integrated with GKE but requires GCP-specific metric APIs. Not portable. GCP Workload Metrics costs extra.
- **Datadog / New Relic**: SaaS; requires paid subscription for Kubernetes monitoring.
- **Victoria Metrics**: More efficient for high cardinality, but overkill for this scale.

**Prometheus metrics in FastAPI**: Add `prometheus-fastapi-instrumentator` to `backend/pyproject.toml`. Expose `GET /metrics` in `main.py`.

---

## Decision 6: Log Aggregation

**Decision**: Grafana Loki + **Grafana Alloy** (Promtail replacement)

**Rationale**:
- Designed to work alongside Prometheus/Grafana (same stack, same UI)
- Grafana Alloy DaemonSet auto-discovers all pods — same behavior as Promtail
- LogQL queries use same label selectors as PromQL — consistent interface
- Lightweight: does not index log content (only labels) — much cheaper than Elasticsearch
- **IMPORTANT**: Promtail reached end-of-life on March 2, 2026. Grafana Alloy is the official successor. Using Promtail would install deprecated, unsupported software.

**Alternatives considered**:
- **Loki + Promtail**: EOL as of March 2, 2026 — must not use for new installations.
- **EFK (Elasticsearch + Fluentd + Kibana)**: Heavyweight. Elasticsearch requires 2-4GB RAM minimum — too much for a small always-free cluster.
- **OCI Cloud Logging**: OKE-specific integration; not portable; adds OCI dependency to observability stack.
- **No log aggregation**: Violates FR-014.

**Loki install**:
```bash
helm upgrade --install loki grafana/loki-stack \
  --set grafana.enabled=false \
  --set alloy.enabled=true \
  -n monitoring --wait
```

---

## Decision 7: In-Cluster Redis (Dapr State Store)

**Decision**: Bitnami Redis Helm chart (standalone mode, no auth, 1 replica)

**Rationale**:
- 1 command: `helm install redis bitnami/redis --set auth.enabled=false --set architecture=standalone`
- Standalone mode (no replication) sufficient for cache use case (Dapr state store is fail-open)
- No auth needed — Redis is only accessible within the cluster (ClusterIP service)
- 2Gi PVC for persistence across pod restarts

**Alternatives considered**:
- **Redis Operator**: Adds CRD complexity; overkill for 1-instance cache
- **Redis Cloud (managed)**: Requires external connectivity, auth secrets, paid tier
- **In-memory only (no Redis)**: Cache is fail-open in the code — but losing state store on every pod restart defeats the purpose

---

## Decision 8: In-Cluster Kafka (Dapr Pub/Sub)

**Decision**: Bitnami Kafka Helm chart (1 broker, 1 replica)

**Rationale**:
- Already used in `cloud/kafka/docker-compose.kafka.yml` — team is familiar
- Bitnami Kafka 3.x includes KRaft mode (no ZooKeeper dependency) — simpler
- `helm install kafka bitnami/kafka --set replicaCount=1 --set kraft.enabled=true`
- 8Gi PVC prevents message loss on pod restart

**Alternatives considered**:
- **Strimzi Operator**: Best for production multi-broker setups, but overkill for 1-broker demo
- **Redpanda**: Kafka-compatible, lower resource usage — viable alternative, but less Dapr documentation
- **Confluent Cloud**: Managed, but $$ and requires external connectivity + credentials

---

## Decision 9: Kubernetes Secrets as Dapr Secrets Store

**Decision**: Dapr Kubernetes secrets component (already in `cloud/dapr/components/kubernetes.yaml`)

**Rationale**:
- Already implemented — `sidecar/secrets.py` calls Dapr secrets API which reads from K8s secrets
- Zero additional setup: Dapr has built-in Kubernetes secrets support
- Secrets are encrypted at rest by Kubernetes (ETCD encryption)
- Simpler than cloud-provider vaults for a hackathon

**Alternatives considered**:
- **GCP Secret Manager**: Better for production (audit trail, versioning, IAM), but requires Workload Identity setup and GCP-specific Dapr component
- **HashiCorp Vault**: Gold standard for secrets management, but significant operational overhead
- **AWS Secrets Manager / Azure Key Vault**: Cloud-provider lock-in; not portable

**Security note**: Kubernetes ETCD encryption must be enabled in the cluster for at-rest encryption. GKE encrypts ETCD by default.

---

## Decision 10: Rolling Update & Rollback Strategy

**Decision**: Native Kubernetes rolling update + `helm rollback`

**Rationale**:
- Built into every Kubernetes deployment — zero additional tooling
- `helm upgrade --wait` blocks until rollout completes; non-zero exit on timeout triggers CI/CD failure + rollback
- `helm rollback <release> <revision>` restores previous Helm release (images + config atomically)
- Rollout strategy in Deployment spec: `maxUnavailable: 0, maxSurge: 1` ensures zero-downtime

**Alternatives considered**:
- **Argo Rollouts**: Adds canary and blue/green capabilities — explicitly out of scope (spec §Out of Scope)
- **Manual kubectl rollout undo**: Less atomic than `helm rollback` (doesn't revert config changes)
- **FluxCD / ArgoCD**: GitOps tools; valuable for production but add significant operator complexity

---

## Constitution Gate Check

| Gate | Status | Notes |
|------|--------|-------|
| SDD artifacts exist before implementation | ✅ | spec.md complete; plan.md being written |
| TDD (tests before code) | ✅ | CI pipeline runs 138+ tests before deploy |
| No hardcoded secrets | ✅ | K8s secrets + Dapr; never in git |
| Cloud-native stateless design | ✅ | All state in Neon DB; pods are stateless |
| Container images multi-stage minimal | ✅ | Existing Dockerfiles already multi-stage |
| 80% test coverage | ✅ | 138 tests covering all sidecar modules at 100% |
| GitHub Actions for CI/CD | ✅ | Matches constitution requirement |
