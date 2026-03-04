---
id: "016"
title: cloud-deployment-implementation-plan
stage: plan
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: cloud-deployment
branch: 003-cloud-deployment
user: Shehroz Hanif
command: /sp.plan
labels: ["cloud-deployment","oke","github-actions","helm","prometheus","loki","grafana-alloy","cert-manager","nginx-ingress"]
links:
  spec: specs/phase5-cloud/cloud-deployment/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/cloud-deployment/plan.md
  - specs/phase5-cloud/cloud-deployment/research.md
  - specs/phase5-cloud/cloud-deployment/data-model.md
  - specs/phase5-cloud/cloud-deployment/quickstart.md
  - specs/phase5-cloud/cloud-deployment/contracts/cicd-pipeline.md
  - specs/phase5-cloud/cloud-deployment/contracts/helm-values-cloud.md
  - specs/phase5-cloud/cloud-deployment/contracts/monitoring-contract.md
tests:
  - none (planning phase — no code)
---

## Prompt

/sp.plan

## Response snapshot

Generated all /sp.plan artifacts for the cloud-deployment feature (Phase 5, Feature 4):

**research.md** (10 decisions):
1. Cloud Provider: OKE (Oracle Kubernetes Engine) — always-free, 4 ARM vCPU / 24 GB RAM, no expiry
2. Container Registry: ghcr.io (free, GITHUB_TOKEN auth)
3. CI/CD: Two workflows (ci.yml + cd.yml) with dorny/paths-filter for service-specific path filtering
4. Ingress: NGINX Ingress Controller + cert-manager + Let's Encrypt + nip.io wildcard DNS
5. Monitoring: kube-prometheus-stack (Prometheus + Grafana + AlertManager)
6. Logs: Grafana Loki + Grafana Alloy (Promtail reached EOL March 2, 2026)
7. Redis: Bitnami standalone, no auth, 2Gi PVC
8. Kafka: Bitnami KRaft single broker, 8Gi PVC
9. Secrets: Dapr Kubernetes secrets store (existing kubernetes.yaml component — zero new setup)
10. Rollback: `helm upgrade --atomic` (auto-rollback on failure within timeout)

**plan.md** (7-phase architecture):
- Phase 1: GitHub Actions ci.yml (parallel build + test)
- Phase 2: GitHub Actions cd.yml (Helm deploy to OKE)
- Phase 3: Cloud Helm values (values-cloud.yaml, values-dapr.yaml)
- Phase 4: In-cluster Kafka + Redis sub-charts
- Phase 5: NGINX Ingress + cert-manager + ClusterIssuer YAML
- Phase 6: Monitoring (Prometheus ServiceMonitor, alert rules, Grafana dashboard, Loki + Alloy)
- Phase 7: Kubernetes secrets (one-time `kubectl create secret` commands)

**contracts/**:
- cicd-pipeline.md: 5-stage pipeline (build, test, push, deploy, verify+rollback); DATABASE_URL must never appear in CI env vars
- helm-values-cloud.md: dapr.enabled, replicaCount 2, resource limits, NGINX ingress with TLS
- monitoring-contract.md: ServiceMonitor for /metrics, 6 Grafana panels, 3 alert rules, LogQL queries

**data-model.md**: 6 infrastructure entities with relationships diagram

**quickstart.md**: 4 end-to-end verification scenarios with exact kubectl/helm commands

Key research finding: Promtail is EOL as of March 2, 2026 — updated research.md and plan.md to use Grafana Alloy instead.

## Outcome

- ✅ Impact: All /sp.plan artifacts created for cloud-deployment; plan.md provides 7-phase implementation roadmap ready for /sp.tasks
- 🧪 Tests: No tests in planning phase; CI contract specifies 138+ tests must pass before any deploy
- 📁 Files: 7 files created/updated in specs/phase5-cloud/cloud-deployment/; committed to 003-cloud-deployment
- 🔁 Next prompts: /sp.tasks → generate atomic task list; /sp.implement → execute tasks
- 🧠 Reflection: Research agent correctly identified OKE as superior to GKE for always-free usage; Grafana Alloy adoption was critical since Promtail reached EOL during this project's development window

## Evaluation notes (flywheel)

- Failure modes observed: Session context compaction interrupted plan.md creation mid-session; plan.md was missing at session start; required resumption from summary
- Graders run and results (PASS/FAIL): N/A (planning phase)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.tasks immediately after plan.md creation; do not wait for separate session
