

# Tasks: Helm Deployment

**Phase:** IV — Local K8s Deployment
**Feature:** Helm Deployment
**Created:** 2026-02-28

---

## T001: Create umbrella chart scaffolding
**Spec:** FR-001
**Files:** `k8s/helm/todo-platform/Chart.yaml`, `k8s/helm/todo-platform/values.yaml`
**Change:** Umbrella chart with dependencies on backend, frontend, mcp-server subcharts
**Blocked by:** None

## T002: Create backend subchart templates
**Spec:** FR-002
**Files:** `k8s/helm/todo-platform/charts/backend/` (Chart.yaml, values.yaml, templates/*)
**Change:** _helpers.tpl, deployment.yaml, service.yaml, configmap.yaml, secret.yaml, NOTES.txt
**Blocked by:** T001

## T003: Create frontend subchart templates
**Spec:** FR-003
**Files:** `k8s/helm/todo-platform/charts/frontend/` (Chart.yaml, values.yaml, templates/*)
**Change:** Same template set as backend, NodePort service, TCP probes
**Blocked by:** T001

## T004: Create MCP server subchart templates
**Spec:** FR-004
**Files:** `k8s/helm/todo-platform/charts/mcp-server/` (Chart.yaml, values.yaml, templates/*)
**Change:** Same template set, ClusterIP service, TCP probes
**Blocked by:** T001

## T005: Create DEPLOY.md with instructions
**Spec:** FR-006, FR-007
**File:** `k8s/helm/todo-platform/DEPLOY.md`
**Change:** Step-by-step Minikube deployment + AIOps commands (kubectl-ai, kagent, Gordon)
**Blocked by:** T002, T003, T004

## T006: Validate with helm template
**Test:** `helm template todo k8s/helm/todo-platform` renders valid YAML for all resources
**Blocked by:** T002, T003, T004
