---
id: 015
title: Cloud Deployment Technical Research — 10 Decisions
stage: general
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: cloud-deployment
branch: master
user: Shehroz Hanif
command: research cloud provider, registry, CI/CD, ingress, monitoring, logging, Redis, Kafka, Dapr secrets, rollback
labels: ["cloud-deployment","research","OKE","GKE","AKS","ghcr","nginx-ingress","cert-manager","kube-prometheus-stack","loki","alloy","bitnami-kafka","bitnami-redis","dapr-secrets","helm-rollback"]
links:
  spec: specs/phase5-cloud/cloud-deployment/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/cloud-deployment/spec.md
  - cloud/dapr/components/kubernetes.yaml
  - cloud/dapr/components/pubsub.yaml
  - cloud/dapr/components/statestore.yaml
  - k8s/helm/todo-platform/values.yaml
  - cloud/kafka/docker-compose.kafka.yml
tests:
  - none (research session — no tests written)
---

## Prompt

Research the following technical decisions for a cloud-native Kubernetes deployment of a todo platform. The platform has: FastAPI backend (Python 3.13), Next.js frontend, Kafka (aiokafka), Dapr sidecar, Neon PostgreSQL DB, existing Helm charts in k8s/helm/todo-platform/. CI/CD must use GitHub Actions.

Research and provide concrete recommendations with rationale for:

1. **Cloud Provider**: AKS vs GKE vs OKE — which is cheapest for a hackathon (always-free or generous trial)? Consider Dapr support, GitHub Actions integration, and simplicity of kubeconfig auth.

2. **Container Registry**: Docker Hub vs GitHub Container Registry (ghcr.io) vs cloud-provider registry. Which integrates best with GitHub Actions with zero extra cost?

3. **GitHub Actions workflow structure**: Best practice for a monorepo with separate frontend and backend Dockerfiles. Should it be one workflow or two (ci.yml + cd.yml)? How to handle path-based triggers?

4. **Kubernetes Ingress for HTTPS**: NGINX Ingress Controller + cert-manager (Let's Encrypt) vs cloud-provider native load balancer with managed TLS. Which is more portable?

5. **Monitoring stack**: kube-prometheus-stack Helm chart (Prometheus + Grafana + AlertManager) vs cloud-provider native monitoring (Azure Monitor, Google Cloud Monitoring). Which is more portable and free?

6. **Log aggregation**: Loki + Promtail vs cloud-provider logging (Azure Log Analytics, GCP Cloud Logging). Which is simpler to set up in a Helm-managed cluster?

7. **In-cluster Redis for Dapr state store**: Bitnami Redis Helm chart vs Redis Operator. Which is simpler for a 1-replica dev/demo setup?

8. **In-cluster Kafka for Dapr pubsub**: Bitnami Kafka vs Strimzi Operator vs Redpanda. Which is simplest for a 1-broker cloud deployment with Dapr?

9. **Kubernetes Secrets for Dapr**: The project already has cloud/dapr/components/kubernetes.yaml (Dapr Kubernetes secrets store). Is this the right approach for cloud, or should we use Azure Key Vault / GCP Secret Manager? What are the tradeoffs?

10. **Rolling update + rollback**: Standard kubectl rollout undo vs Argo Rollouts. Which is simpler for this scale?

Provide: Decision, Rationale, Alternatives Considered for each. Be concrete and opinionated — pick one winner per decision.

## Response snapshot

Produced a concrete, opinionated 10-decision research report covering:

1. **OKE** — Only provider with truly free always-on Kubernetes (4 vCPU/24 GB ARM Ampere). AKS/GKE both require paid VMs. Dapr installs via standard `dapr init --kubernetes` on all three.

2. **ghcr.io** — Zero cost, `GITHUB_TOKEN` auth (no extra secrets), free for public images (unlimited), 500 MB free for private. Best GitHub Actions integration by design.

3. **Two workflows (ci.yml + cd.yml) with `dorny/paths-filter`** — Path-based skipping of unchanged services, clean test-gate vs deploy separation. `--atomic` flag on `helm upgrade` for automatic rollback on health check failure.

4. **NGINX Ingress + cert-manager (Let's Encrypt)** — Cloud-agnostic, works identically on OKE/GKE/AKS. Cloud-native TLS alternatives (Azure App Gateway, GKE managed certs) create provider lock-in.

5. **kube-prometheus-stack** — Single Helm chart deploys Prometheus + Grafana + AlertManager + node-exporter + kube-state-metrics. Cloud-agnostic. Satisfies FR-011, FR-012, FR-013.

6. **Loki + Grafana Alloy** — Promtail reached EOL March 2, 2026. Alloy is the official Grafana replacement. Loki + Alloy integrates natively with the same Grafana instance from kube-prometheus-stack.

7. **Bitnami Redis (architecture=standalone)** — `statestore.yaml` already references `redis-master.todo-platform.svc.cluster.local:6379`. Zero config delta. Redis Operator is over-engineering for 1-replica.

8. **Bitnami Kafka (KRaft, single broker)** — Consistent with existing `cloud/kafka/docker-compose.kafka.yml` (bitnami/kafka:3.9 KRaft). `pubsub.yaml` only needs broker hostname updated for in-cluster DNS. Strimzi is over-engineering; Redpanda diverges from established baseline.

9. **Keep `secretstores.kubernetes` (current approach)** — Satisfies FR-015 and FR-016. Secrets created via `kubectl` (not committed to Git). Dapr's portable component model means migration to Azure Key Vault or GCP Secret Manager is a 1-file swap in `cloud/dapr/components/`.

10. **`helm upgrade --atomic` + `helm rollback`** — Spec mandates rolling-update-only; Argo Rollouts adds operator complexity and CRD changes to all Helm templates for no benefit at 1-replica hackathon scale.

## Outcome

- Impact: 10 concrete, researched architectural decisions with rationale and alternatives documented for the cloud-deployment planning phase. Directly informs /sp.plan for specs/phase5-cloud/cloud-deployment/.
- Tests: none (research session)
- Files: none modified (research only)
- Next prompts: /sp.plan for cloud-deployment feature using these decisions as inputs
- Reflection: All 10 decisions are grounded in the project's existing artifacts (statestore.yaml, pubsub.yaml, kubernetes.yaml, docker-compose.kafka.yml, Helm values). No decisions invented from scratch — each builds on what already exists in the repo.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): N/A (research session)
- Prompt variant (if applicable): none
- Next experiment: Run /sp.plan with these decisions as the architectural foundation; validate that resource estimates fit OKE always-free 24 GB RAM budget
