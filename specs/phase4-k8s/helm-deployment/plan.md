# Architecture Plan: Helm Deployment

**Phase:** IV — Local K8s Deployment
**Feature:** Helm Deployment
**Created:** 2026-02-28

---

## 1. Approach

Use the `helm-blueprint` Agent Skill to generate Helm chart scaffolding from asset templates, then customize for each subchart. Umbrella chart pattern for single-command deployment.

## 2. Key Decisions

### D1: Umbrella Chart (not separate releases)

Single `todo-platform` chart with 3 subcharts. Reason: deploy/uninstall everything together, shared values, simpler for local dev.

### D2: Service Types

| Service | Type | Why |
|---------|------|-----|
| Backend | ClusterIP | Internal only, reached by frontend via K8s DNS |
| Frontend | NodePort | Direct access via `minikube service` |
| MCP Server | ClusterIP | Internal only, reached by backend |

### D3: Secrets Strategy

Secrets passed via `--set` flags or a separate `secrets.yaml` (not checked in). Chart templates reference Secrets objects but values are empty by default.

### D4: Image Loading for Minikube

Minikube uses its own Docker daemon. Images must be loaded via:
```bash
eval $(minikube docker-env)
docker compose -f k8s/docker-compose.yml build
```
Or: `minikube image load todo-backend:latest`

### D5: Inter-Service DNS

K8s Services create DNS entries: `<release>-<chart>.<namespace>.svc.cluster.local`
- Backend → MCP: `http://todo-mcp-server:8001/sse`
- ConfigMap sets `MCP_SERVER_URL` to this value

## 3. Chart Structure

```
todo-platform/           (umbrella)
├── Chart.yaml           (type: application, dependencies: backend, frontend, mcp-server)
├── values.yaml          (global values + subchart overrides)
└── charts/
    ├── backend/         (subchart)
    ├── frontend/        (subchart)
    └── mcp-server/      (subchart)
```

Each subchart has identical template structure:
- `_helpers.tpl` — name, fullname, labels, selectorLabels
- `deployment.yaml` — pod spec with probes, resources, envFrom
- `service.yaml` — ClusterIP or NodePort
- `configmap.yaml` — non-secret env vars
- `secret.yaml` — sensitive env vars (base64)
- `NOTES.txt` — post-install instructions

## 4. Implementation Order

1. Create umbrella Chart.yaml + values.yaml
2. Backend subchart (all templates)
3. Frontend subchart (all templates)
4. MCP Server subchart (all templates)
5. DEPLOY.md with Minikube + AIOps instructions
6. Test with `helm template` (dry run)
7. Test with `helm install` on Minikube
