# Tasks: Cloud Deployment

**Input**: Design documents from `specs/phase5-cloud/cloud-deployment/`
**Prerequisites**: plan.md ✅ spec.md ✅ data-model.md ✅ contracts/ ✅ research.md ✅ quickstart.md ✅
**Tests**: Not explicitly requested — no separate test tasks; verification steps embedded per user story.
**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to ([US1], [US2], [US3], [US4])

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory scaffold and update the umbrella Helm chart to support cloud dependencies.

- [X] T001 Create directory scaffold: `.github/workflows/`, `cloud/helm/`, `cloud/k8s/`, `cloud/monitoring/alerts/`, `cloud/monitoring/grafana/dashboards/` (directories only, no files)
- [X] T002 Update `k8s/helm/todo-platform/Chart.yaml` — add Bitnami `kafka` (~28.0) and `redis` (~19.0) external sub-chart dependencies with `condition:` fields

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One-time cluster configuration that MUST be complete before any user story can be deployed.

**⚠️ CRITICAL**: Cluster must have Dapr, NGINX Ingress, and cert-manager installed via Helm before Phase 3 begins (commands documented in `quickstart.md` — human-run, not CI).

- [X] T003 Update `cloud/dapr/components/pubsub.yaml` — change `brokers` value from `kafka:9092` to `todo-kafka:9092` (Bitnami Helm sub-chart in-cluster service name)
- [X] T004 [P] Update `cloud/dapr/components/statestore.yaml` — change `redisHost` to `todo-redis-master:6379`; remove `redisPassword` secretKeyRef (Bitnami standalone, auth disabled in cloud values)
- [X] T005 Create `cloud/k8s/create-secrets.sh` — bash script containing all `kubectl create secret generic` commands for `todo-backend-secrets` (DATABASE_URL, BETTER_AUTH_SECRET, OPENAI_API_KEY) and `todo-frontend-secrets` in `todo-platform` namespace; script MUST source values from local environment variables, never hardcode
- [X] T006 [P] Create `cloud/k8s/letsencrypt-prod.yaml` — `ClusterIssuer` manifest using ACME HTTP-01 solver via `cert-manager.io/v1`; email field left as `<developer-email>` placeholder

**Checkpoint**: Dapr components point to in-cluster services ✅; secrets creation script ready ✅; ClusterIssuer manifest ready ✅

---

## Phase 3: User Story 1 — Public Live Deployment (Priority: P1) 🎯 MVP

**Goal**: The todo platform is deployed on OKE and reachable at a public HTTPS URL using the existing Helm charts.

**Independent Test**: Run `quickstart.md` Scenario 1 — `helm upgrade` with cloud values → `curl -f https://todo.<ip>.nip.io/health` returns 200 → browser sign-up and task creation work.

### Implementation for User Story 1

- [X] T007 [US1] Create `cloud/helm/values-cloud.yaml` — complete cloud overrides per `plan.md` Phase 3: backend (replicaCount 2, ghcr.io image repo, `pullPolicy: Always`, ALLOWED_ORIGINS, KAFKA_BOOTSTRAP_SERVERS, resource limits, liveness/readiness probes); frontend (replicaCount 2, ghcr.io image repo, NEXT_PUBLIC_API_URL, BETTER_AUTH_URL, `dapr.enabled: false`); mcp-server (replicaCount 1, ghcr.io image repo, `pullPolicy: Always`). Replace `<owner>` placeholder with actual GitHub username throughout.
- [X] T008 [P] [US1] Create `cloud/helm/values-dapr.yaml` — Dapr building-block overrides for cloud: pubsub brokers `todo-kafka:9092`, statestore `todo-redis-master:6379`, secrets type `kubernetes`
- [X] T009 [US1] Add `kafka` and `redis` sections to `cloud/helm/values-cloud.yaml` — kafka: `enabled: true`, `replicaCount: 1`, `kraft.enabled: true`, `persistence.size: 8Gi`; redis: `enabled: true`, `architecture: standalone`, `auth.enabled: false`, `master.persistence.size: 2Gi`
- [X] T010 [P] [US1] Create `cloud/k8s/ingress.yaml` — standalone Kubernetes `Ingress` manifest (not Helm template; base charts untouched); `spec.ingressClassName: nginx`; annotation `cert-manager.io/cluster-issuer: letsencrypt-prod`; host `todo.<ip>.nip.io` (replace `<ip>` with actual OKE load-balancer IP); TLS secret `todo-tls`; rules: `/api` → `todo-backend:8000`, `/` → `todo-frontend:3000`. Applied with `kubectl apply -f cloud/k8s/ingress.yaml -n todo-platform`.

**Checkpoint**: `helm upgrade --install todo-platform k8s/helm/todo-platform -f cloud/helm/values-cloud.yaml -f cloud/helm/values-dapr.yaml --dry-run` succeeds ✅

---

## Phase 4: User Story 2 — Automated CI/CD Pipeline (Priority: P2)

**Goal**: Every push to `master` automatically builds, tests, and deploys to the OKE cluster with zero manual steps.

**Independent Test**: Run `quickstart.md` Scenario 2 — push a trivial change to `master` → GitHub Actions run completes → `gh run view` shows all jobs green → new image SHA visible in cluster within 10 minutes.

### Implementation for User Story 2

- [X] T011 [US2] Create `.github/workflows/ci.yml` — three jobs running on `ubuntu-latest`: (1) `build-backend` — `docker/setup-buildx-action`, `docker/login-action` with `GITHUB_TOKEN`, `docker buildx build --platform linux/arm64,linux/amd64 -f backend/Dockerfile --push ghcr.io/${{ github.repository_owner }}/todo-backend:${{ github.sha }}`; (2) `build-frontend` — same pattern for `k8s/Dockerfile.frontend`; (3) `test` — `setup-python 3.13`, `astral-sh/setup-uv`, `cd backend && uv sync && uv run pytest -v --tb=short`; push only on master; PR runs build+test only
- [X] T012 [US2] Add `dorny/paths-filter@v3` step to `ci.yml` — filter `backend: backend/**` and `frontend: frontend/**`; gate `build-backend` job on `filter.outputs.backend == 'true'`; gate `build-frontend` on `filter.outputs.frontend == 'true'`; always run `test` job
- [X] T013 [US2] Create `.github/workflows/cd.yml` — triggered by `workflow_call` from `ci.yml` on master success; steps: decode `KUBECONFIG_B64` secret to `~/.kube/config`; install Helm; `helm dependency update k8s/helm/todo-platform`; `helm upgrade --install todo-platform k8s/helm/todo-platform --namespace todo-platform --create-namespace -f cloud/helm/values-cloud.yaml -f cloud/helm/values-dapr.yaml --set backend.image.tag=${{ github.sha }} --set frontend.image.tag=${{ github.sha }} --atomic --timeout 10m` (10 min covers Kafka cold-start; consistent for all deploys per FR-010)
- [X] T014 [US2] Add verify + rollback step to `cd.yml` post-deploy — `kubectl rollout status deployment/todo-backend -n todo-platform --timeout=120s`; `kubectl rollout status deployment/todo-frontend -n todo-platform --timeout=120s`; `curl -f https://todo.<ip>.nip.io/health`; on failure: `helm rollback todo-platform -n todo-platform`
- [X] T015 [P] [US2] Create `cloud/CI-CD-SETUP.md` — document required GitHub repository secrets (`KUBECONFIG_B64` — how to generate, `HELM_NAMESPACE` — default `todo-platform`); document OCI KUBECONFIG generation steps; note that `DATABASE_URL` and `BETTER_AUTH_SECRET` are NOT pipeline secrets (they live in K8s secrets)

**Checkpoint**: Trigger pipeline via `gh workflow run ci.yml` → all 3 jobs green → deployment rolls out → health check passes ✅

---

## Phase 5: User Story 3 — Monitoring & Observability (Priority: P3)

**Goal**: Real-time metrics, dashboards, and automated alerts are visible to operators for all services.

**Independent Test**: Run `quickstart.md` Scenario 3 — open Grafana → Todo Platform dashboard shows request rate, error rate, P95 latency, pod CPU/memory; trigger a 500-error burst → HighErrorRate alert fires within 2 minutes; run LogQL `{namespace="todo-platform"}` → all pod logs searchable.

### Implementation for User Story 3

- [X] T016 [US3] Add `prometheus-fastapi-instrumentator>=7.0` to `backend/pyproject.toml` under `[project.dependencies]`
- [X] T017 [US3] Instrument `backend/main.py` — import `from prometheus_fastapi_instrumentator import Instrumentator`; after `app = FastAPI(...)`: `Instrumentator().instrument(app).expose(app, endpoint="/metrics")`; add `uv sync` note for dev environment
- [X] T018 [P] [US3] Create `cloud/monitoring/values-prometheus.yaml` — kube-prometheus-stack Helm values: `grafana.enabled: true`, `grafana.adminPassword` placeholder, `prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues: false` (to allow cross-namespace ServiceMonitors), `alertmanager.enabled: true`
- [X] T019 [P] [US3] Create `cloud/monitoring/servicemonitor-backend.yaml` — `ServiceMonitor` CRD in `monitoring` namespace; `selector.matchLabels` matching the backend service labels; `endpoints.port: http`, `path: /metrics`, `interval: 30s`; `namespaceSelector.matchNames: [todo-platform]`
- [X] T020 [US3] Create `cloud/monitoring/alerts/backend-errors.yaml` — `PrometheusRule` CRD with 3 alert rules per `monitoring-contract.md`: `HighErrorRate` (>5% over 5m, severity: warning), `PodCrashLoop` (>2 restarts in 10m, severity: critical), `ServiceDown` (backend pods = 0 for 2m, severity: critical); include `annotations.runbook_url` for each
- [X] T021 [US3] Create `cloud/monitoring/grafana/dashboards/todo-platform.json` — Grafana dashboard JSON with 6 panels: HTTP request rate (req/s), error rate % (4xx+5xx), P95 latency (seconds), pod CPU usage, pod memory usage, pod restart count; time range: last 24 hours; refresh: 30 seconds
- [X] T022 [US3] Create `cloud/monitoring/README.md` — install commands for `kube-prometheus-stack` and `loki-stack` (with `alloy.enabled=true`, Promtail disabled); commands to apply ServiceMonitor, PrometheusRule, and dashboard ConfigMap

**Checkpoint**: Grafana loads dashboard ✅; simulate `curl -X DELETE https://<host>/api/nonexistent` × 30 → HighErrorRate alert fires ✅; `logcli query '{namespace="todo-platform"}'` returns results ✅

---

## Phase 6: User Story 4 — Secure Cloud Secrets Management (Priority: P4)

**Goal**: No plaintext secrets appear in git history, CI logs, or Helm values files.

**Independent Test**: Run `quickstart.md` Scenario 4 — `git log --all -S "postgresql"` → zero matches; `kubectl describe secret todo-backend-secrets -n todo-platform` → shows keys but no values; app connects to DB successfully (task CRUD works).

### Implementation for User Story 4

- [X] T023 [US4] Verify `cloud/dapr/components/kubernetes.yaml` — confirm `spec.type: secretstores.kubernetes`, namespace is `todo-platform`, no plaintext values; update if needed to match data-model.md Entity 4 contract
- [X] T024 [P] [US4] Run git audit: `git log --all -S "postgresql+asyncpg" --oneline` and `git log --all -S "BETTER_AUTH_SECRET" --oneline` — if any matches found, investigate and use BFG Repo Cleaner to purge; document results in `cloud/k8s/create-secrets.sh` header comment
- [X] T025 [US4] Add OIDC-based ghcr.io auth to `ci.yml` — use `permissions: packages: write` and `id-token: write` to replace static PAT tokens with short-lived GITHUB_TOKEN; ensures registry credentials never stored in GitHub Secrets

**Checkpoint**: `git log --all -S "postgresql"` → zero results ✅; pods start and connect to DB via Dapr secrets ✅; `kubectl get secret todo-backend-secrets -n todo-platform -o json` shows keys without values ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Runbook, validation, and release tagging.

- [X] T026 [P] Create `cloud/DEPLOY.md` — step-by-step deployment runbook: (1) prerequisites install commands; (2) cluster setup (namespace, Dapr, NGINX, cert-manager); (3) secrets creation (`./cloud/k8s/create-secrets.sh`); (4) first deploy command; (5) monitoring install; (6) verification commands from quickstart.md
- [X] T027 Run all 7 success criteria from `spec.md` using `quickstart.md` commands — record pass/fail against SC-001 through SC-007; all must pass before final commit
- [X] T028 [P] Update `history/prompts/phase5-cloud/` — create PHR for `/sp.implement` session after all tasks complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — K8s secrets (T005) must be run manually before first deploy
- **US2 (Phase 4)**: Depends on Foundational — GitHub Secrets (KUBECONFIG_B64) must be configured before cd.yml runs
- **US3 (Phase 5)**: Depends on US1 — requires running pods with `/metrics` endpoint before ServiceMonitor works
- **US4 (Phase 6)**: Can run in parallel with US2 and US3 — verification tasks only
- **Polish (Phase 7)**: Depends on US1, US2, US3, US4 all complete

### User Story Dependencies

```
Foundational (T003-T006)
   ├── US1 (T007-T010): Helm values + Kafka/Redis + standalone Ingress YAML
   │     └── US3 (T016-T022): Monitoring requires live pods
   ├── US2 (T011-T015): CI/CD workflows (independent of US1 Helm files)
   └── US4 (T023-T025): Secret verification (runs anytime after T005)
```

### Within Each User Story

- Models before services (N/A — infra-only feature)
- Config files before apply commands
- T007 before T009 (T009 appends kafka/redis sections to same values-cloud.yaml file)
- T010 is now independent [P] — `cloud/k8s/ingress.yaml` is a separate standalone file
- T011 before T012 (paths-filter extends ci.yml)
- T013 before T014 (verify step extends cd.yml)
- T016 before T017 (dependency before import)
- T018, T019, T020, T021 are independent [P] within US3

---

## Parallel Opportunities

### Phase 2: Run all foundational tasks together
```
T003 (update pubsub.yaml)     ← parallel
T004 (update statestore.yaml) ← parallel
T005 (create secrets script)  ← parallel
T006 (create ClusterIssuer)   ← parallel
```

### Phase 3: US1 — split Helm values creation
```
T007 (values-cloud.yaml base)   → then T009 (extends same file, sequential)
T008 (values-dapr.yaml)         ← parallel with T007
T010 (cloud/k8s/ingress.yaml)   ← parallel with T007/T008/T009 (different file)
```

### Phase 5: US3 monitoring files (all different files)
```
T016 (pyproject.toml)                ← parallel (after T016 for T017)
T018 (values-prometheus.yaml)        ← parallel
T019 (servicemonitor-backend.yaml)   ← parallel
T020 (alerts/backend-errors.yaml)    ← sequential (after T018 applied)
T021 (grafana dashboard JSON)        ← parallel
T022 (monitoring README.md)          ← parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only — Public Deployment)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006) — run `cloud/k8s/create-secrets.sh` manually
3. Complete Phase 3: US1 (T007–T010)
4. **STOP and VALIDATE**: `helm upgrade --install` → `curl -f https://todo.<ip>.nip.io/health` → browse app
5. Demo-ready with live HTTPS URL

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 → Live HTTPS deployment (MVP) → Demo
3. US2 → Every push auto-deploys → No manual deploys needed
4. US3 → Dashboards live → Operators can monitor
5. US4 verification → Security audit passed
6. Polish → Runbook written → Release tagged

### Parallel Team Strategy

With two developers after Foundational is complete:
- **Developer A**: US1 (Helm values, Ingress) → US3 (Monitoring)
- **Developer B**: US2 (ci.yml + cd.yml) → US4 (Secrets verification)

---

## Task Summary

| Phase | Tasks | Parallelizable | Story |
|-------|-------|---------------|-------|
| Phase 1: Setup | T001–T002 | 0 | — |
| Phase 2: Foundational | T003–T006 | 4 | — |
| Phase 3: US1 Public Deployment | T007–T010 | 2 (T008, T010) | US1 |
| Phase 4: US2 CI/CD Pipeline | T011–T015 | 1 (T015) | US2 |
| Phase 5: US3 Monitoring | T016–T022 | 4 (T018-T021) | US3 |
| Phase 6: US4 Secrets | T023–T025 | 2 (T024, T025) | US4 |
| Phase 7: Polish | T026–T028 | 2 (T026, T028) | — |
| **Total** | **28** | **15** | |

**Suggested MVP scope**: Phases 1–3 (Tasks T001–T010) → live HTTPS deployment.
