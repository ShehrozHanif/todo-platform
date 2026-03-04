---
id: "017"
title: cloud-deployment-28-atomic-tasks
stage: tasks
date: 2026-03-04
surface: agent
model: claude-sonnet-4-6
feature: cloud-deployment
branch: 003-cloud-deployment
user: Shehroz Hanif
command: /sp.tasks
labels: ["cloud-deployment","tasks","oke","github-actions","helm","prometheus","grafana","loki","grafana-alloy","cert-manager","dapr","secrets"]
links:
  spec: specs/phase5-cloud/cloud-deployment/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/phase5-cloud/cloud-deployment/tasks.md
tests:
  - none (tasks phase — no code)
---

## Prompt

/sp.tasks

## Response snapshot

Generated `specs/phase5-cloud/cloud-deployment/tasks.md` with 28 atomic tasks across 7 phases, organized by user story:

**Phase 1: Setup (T001–T002)**
- T001: Directory scaffold (.github/workflows/, cloud/helm/, cloud/k8s/, cloud/monitoring/)
- T002: Update k8s/helm/todo-platform/Chart.yaml with Bitnami kafka + redis sub-chart dependencies

**Phase 2: Foundational (T003–T006, 4 parallelizable)**
- T003: Update cloud/dapr/components/pubsub.yaml — brokers: todo-kafka:9092
- T004 [P]: Update cloud/dapr/components/statestore.yaml — redisHost: todo-redis-master:6379, remove password auth
- T005: Create cloud/k8s/create-secrets.sh — kubectl secret creation script
- T006 [P]: Create cloud/k8s/letsencrypt-prod.yaml — ClusterIssuer for cert-manager

**Phase 3: US1 Public Deployment (T007–T010)**
- T007: Create cloud/helm/values-cloud.yaml — complete cloud overrides (images, replicas, probes)
- T008 [P]: Create cloud/helm/values-dapr.yaml — Dapr in-cluster addresses
- T009: Add kafka section to values-cloud.yaml — Bitnami KRaft 1 broker
- T010: Add ingress section to values-cloud.yaml — nginx, cert-manager, nip.io TLS

**Phase 4: US2 CI/CD Pipeline (T011–T015)**
- T011: Create .github/workflows/ci.yml — parallel build-backend + build-frontend + test; multi-arch (arm64+amd64)
- T012: Add dorny/paths-filter to ci.yml — skip builds for unchanged services
- T013: Create .github/workflows/cd.yml — helm upgrade --atomic; triggered by workflow_call
- T014: Add kubectl rollout status + curl health check + helm rollback to cd.yml
- T015 [P]: Create cloud/CI-CD-SETUP.md — document GitHub Secrets setup

**Phase 5: US3 Monitoring (T016–T022, 4 parallelizable)**
- T016: Add prometheus-fastapi-instrumentator to backend/pyproject.toml
- T017: Instrument backend/main.py with /metrics endpoint
- T018 [P]: Create cloud/monitoring/values-prometheus.yaml
- T019 [P]: Create cloud/monitoring/servicemonitor-backend.yaml
- T020: Create cloud/monitoring/alerts/backend-errors.yaml (3 alert rules)
- T021: Create cloud/monitoring/grafana/dashboards/todo-platform.json (6 panels)
- T022: Create cloud/monitoring/README.md with install commands

**Phase 6: US4 Secrets (T023–T025)**
- T023: Verify cloud/dapr/components/kubernetes.yaml contract
- T024 [P]: Run git audit — no plaintext secrets in history
- T025: Add OIDC-based ghcr.io auth to ci.yml

**Phase 7: Polish (T026–T028)**
- T026 [P]: Create cloud/DEPLOY.md runbook
- T027: Run all 7 success criteria from spec.md
- T028 [P]: Create PHR for /sp.implement session

**Key metrics**:
- Total tasks: 28
- Parallelizable: 14 (50%)
- MVP scope: Phases 1-3 (T001-T010) → live HTTPS deployment

## Outcome

- ✅ Impact: tasks.md ready for /sp.implement; 28 atomic tasks covering all 16 FRs and 4 user stories
- 🧪 Tests: No test tasks (not requested); verification checkpoints embedded after each phase
- 📁 Files: specs/phase5-cloud/cloud-deployment/tasks.md created; committed to 003-cloud-deployment
- 🔁 Next prompts: /sp.analyze (cross-artifact validation) → /sp.implement (execute tasks)
- 🧠 Reflection: Foundational phase correctly identified that K8s secrets (T005) must be human-run before CI/CD can deploy; US4 (P4) verification tasks are lighter because secrets infra was already designed in Foundational phase

## Evaluation notes (flywheel)

- Failure modes observed: None — smooth task generation from complete plan.md + spec.md
- Graders run and results (PASS/FAIL): N/A (tasks phase)
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Run /sp.analyze before /sp.implement to catch any spec↔tasks mismatches
