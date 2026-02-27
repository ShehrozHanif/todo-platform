---
name: helm-blueprint
description: |
  Generates production-ready Helm charts for Kubernetes deployments from service specifications.
  This skill should be used when users need to create Helm charts, deploy applications to
  Kubernetes clusters, or set up Helm-based deployment pipelines for microservices.
---

# Helm Blueprint

Generate production-ready Helm charts for Kubernetes deployments from service specs.

## What This Skill Does

- Generates complete Helm chart directories (Chart.yaml, values.yaml, templates/)
- Creates Deployment, Service, ConfigMap, Secret, Ingress, HPA templates
- Applies Helm best practices: named templates, _helpers.tpl, parameterized values
- Supports both single-service and umbrella chart patterns

## What This Skill Does NOT Do

- Install or upgrade Helm releases (use `helm install` / `helm upgrade`)
- Manage Kubernetes clusters (use `kubectl` / `kubectl-ai`)
- Create Dockerfiles (use `docker-blueprint` skill)

---

## Before Implementation

Gather context to ensure successful implementation:

| Source | Gather |
|--------|--------|
| **Codebase** | Existing K8s configs, Docker images, service ports |
| **Conversation** | User's services, replicas, resource limits, ingress needs |
| **Skill References** | Helm patterns from `references/helm-patterns.md` |
| **User Guidelines** | Project CLAUDE.md for stack and deployment details |

Only ask user for THEIR specific requirements (domain expertise is in this skill).

---

## Clarifications

Ask before generating:

| Question | Why |
|----------|-----|
| Service name + image? | Chart naming and container image |
| Port(s)? | Service and container ports |
| Replicas? | Deployment replica count |
| Environment variables? | ConfigMap vs Secret placement |
| Ingress needed? | External access configuration |
| Resource limits? | CPU/memory requests and limits |
| Chart structure? | Separate charts per service or umbrella chart |

---

## Generation Workflow

```
1. Determine chart structure (separate vs umbrella)
2. Generate Chart.yaml + values.yaml
3. Generate _helpers.tpl (named templates)
4. Generate templates/ (Deployment, Service, ConfigMap, etc.)
5. Optionally generate Ingress, HPA, Secret
6. Validate against checklist
```

### Step 1: Chart Structure Decision

| Pattern | When to Use |
|---------|-------------|
| **Separate charts** | Independent services, different release cycles |
| **Umbrella chart** | Tightly coupled services, deploy together |

### Step 2: Chart.yaml + values.yaml

- Chart.yaml: apiVersion v2, name, description, version, appVersion
- values.yaml: All configurable parameters with sensible defaults

### Step 3: _helpers.tpl

Standard named templates:
- `<chart>.name` — chart name
- `<chart>.fullname` — release-qualified name
- `<chart>.labels` — standard labels (app, version, managed-by)
- `<chart>.selectorLabels` — selector subset

### Step 4: Core Templates

| Template | Contains |
|----------|----------|
| `deployment.yaml` | Replicas, containers, probes, resources, env |
| `service.yaml` | ClusterIP/NodePort, port mapping |
| `configmap.yaml` | Non-secret environment variables |

### Step 5: Optional Templates

| Template | When |
|----------|------|
| `ingress.yaml` | External HTTP(S) access needed |
| `secret.yaml` | Sensitive env vars (API keys, DB URLs) |
| `hpa.yaml` | Auto-scaling needed |
| `serviceaccount.yaml` | Custom RBAC needed |

### Step 6: Validation Checklist

- [ ] Chart.yaml has apiVersion v2, valid name and version
- [ ] values.yaml has all configurable params with defaults
- [ ] _helpers.tpl defines name, fullname, labels, selectorLabels
- [ ] Deployment has liveness + readiness probes
- [ ] Deployment has resource requests and limits
- [ ] Service type matches use case (ClusterIP/NodePort)
- [ ] ConfigMap checksum annotation for rolling updates
- [ ] No hardcoded secrets in templates
- [ ] `helm template` renders without errors
- [ ] Labels follow Kubernetes recommended labels

---

## Output Spec

### Chart Directory Structure

```
<chart-name>/
├── Chart.yaml
├── values.yaml
├── .helmignore
└── templates/
    ├── _helpers.tpl
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    ├── ingress.yaml      (optional)
    ├── secret.yaml       (optional)
    ├── hpa.yaml          (optional)
    └── NOTES.txt
```

### values.yaml Pattern

```yaml
replicaCount: 1
image:
  repository: <image>
  tag: "latest"
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
  targetPort: <app-port>
ingress:
  enabled: false
  className: nginx
  hosts:
    - host: <domain>
      paths:
        - path: /
          pathType: Prefix
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
env: {}
```

---

## Reference Files

| File | Content |
|------|---------|
| `references/helm-patterns.md` | Helm best practices, named templates, values patterns |
| `assets/Chart.template.yaml` | Chart.yaml template |
| `assets/values.template.yaml` | values.yaml template with common defaults |
| `assets/helpers.template.tpl` | _helpers.tpl standard named templates |
