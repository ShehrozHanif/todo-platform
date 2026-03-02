# Feature Specification: Helm Deployment

**Phase:** IV — Local K8s Deployment
**Feature:** Helm Deployment
**Status:** Draft
**Created:** 2026-02-28

---

## 1. Overview

Deploy the containerized todo-platform (backend, frontend, MCP server) to a local Minikube Kubernetes cluster using Helm charts. Use kubectl-ai and kagent for AI-assisted K8s operations as required by the hackathon spec.

## 2. Goals

- G1: Create Helm charts for all three services
- G2: Deploy to Minikube with `helm install`
- G3: Configure inter-service networking via K8s Services
- G4: Expose frontend via Ingress or NodePort
- G5: Use kubectl-ai / kagent for AI-assisted operations

## 3. Non-Goals

- NG1: Cloud deployment (Phase V)
- NG2: CI/CD pipeline (Phase V)
- NG3: Horizontal Pod Autoscaler in production (optional template only)
- NG4: TLS/HTTPS for local deployment

## 4. Services Topology

```
[Ingress / NodePort]
       │
       ▼
   ┌────────┐     ┌─────────┐     ┌────────────┐
   │Frontend│────▶│ Backend │────▶│ MCP Server │
   │ :3000  │     │  :8000  │     │   :8001    │
   └────────┘     └─────────┘     └────────────┘
                       │                  │
                       ▼                  ▼
                  [Neon DB — external]
```

## 5. Functional Requirements

### FR-001: Umbrella Helm Chart
- Single umbrella chart `todo-platform` containing 3 subcharts
- Each subchart is independently configurable via `values.yaml`
- `helm install todo k8s/helm/todo-platform` deploys everything

### FR-002: Backend Subchart
- Deployment: 1 replica, image `todo-backend:latest`, port 8000
- Service: ClusterIP, port 8000
- ConfigMap: ALLOWED_ORIGINS, MCP_SERVER_URL
- Secret: DATABASE_URL, BETTER_AUTH_SECRET, OPENAI_API_KEY
- Probes: liveness + readiness on `/health`
- Resources: 100m/128Mi request, 500m/256Mi limit

### FR-003: Frontend Subchart
- Deployment: 1 replica, image `todo-frontend:latest`, port 3000
- Service: NodePort (for Minikube access), port 3000
- ConfigMap: NEXT_PUBLIC_APP_URL, BETTER_AUTH_URL
- Secret: DATABASE_URL, BETTER_AUTH_SECRET
- Probes: readiness on `/` (TCP)
- Resources: 50m/64Mi request, 200m/128Mi limit

### FR-004: MCP Server Subchart
- Deployment: 1 replica, image `todo-mcp:latest`, port 8001
- Service: ClusterIP, port 8001
- Secret: DATABASE_URL
- Probes: liveness on port 8001 (TCP)
- Resources: 100m/128Mi request, 500m/256Mi limit

### FR-005: Inter-Service Networking
- Backend reaches MCP via `http://<release>-mcp-server:8001/sse`
- Frontend reaches backend via `http://<release>-backend:8000` (build-time)
- All services in same namespace

### FR-006: Minikube Deployment
- Works with `minikube start`
- Images loaded via `minikube image load` or local Docker daemon
- Frontend accessible via `minikube service <name>` (NodePort)

### FR-007: AIOps Integration
- kubectl-ai commands documented for common operations
- kagent commands documented for cluster health checks
- Gordon commands documented for Docker image optimization

## 6. Non-Functional Requirements

### NFR-001: Helm Compatibility
- Helm chart API version v2
- Compatible with Helm 3.x

### NFR-002: Namespace
- Default namespace: `todo-app` (configurable via `--namespace`)

### NFR-003: Idempotency
- `helm upgrade --install` works for both first install and updates

## 7. Acceptance Criteria

- [ ] `helm template` renders all 3 subcharts without errors
- [ ] `helm install todo k8s/helm/todo-platform` deploys to Minikube
- [ ] All pods reach Running state
- [ ] Backend pod passes health checks
- [ ] Frontend accessible via `minikube service`
- [ ] Backend can communicate with MCP server pod
- [ ] Secrets not stored in plain text in charts (use `--set` or secrets file)
- [ ] `helm uninstall todo` cleans up all resources

## 8. File Outputs

```
k8s/helm/todo-platform/
├── Chart.yaml                    # Umbrella chart
├── values.yaml                   # Global + subchart values
├── charts/
│   ├── backend/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── _helpers.tpl
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── configmap.yaml
│   │       ├── secret.yaml
│   │       └── NOTES.txt
│   ├── frontend/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   │       ├── _helpers.tpl
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       ├── configmap.yaml
│   │       ├── secret.yaml
│   │       └── NOTES.txt
│   └── mcp-server/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│           ├── _helpers.tpl
│           ├── deployment.yaml
│           ├── service.yaml
│           ├── secret.yaml
│           └── NOTES.txt
└── DEPLOY.md                     # Deployment instructions + AIOps commands
```
