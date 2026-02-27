---
name: k8s-manifest-generator
description: |
  Generates raw Kubernetes YAML manifests (Deployment, Service, ConfigMap, Ingress) without Helm.
  This skill should be used when users need quick K8s manifests for debugging, testing, or
  lightweight deployments where Helm charts are overkill.
---

# K8s Manifest Generator

Generate raw Kubernetes YAML manifests for quick deployments without Helm overhead.

## What This Skill Does

- Generates individual K8s resource YAML files (Deployment, Service, ConfigMap, etc.)
- Creates kustomize-compatible directory layouts
- Applies K8s best practices: labels, resource limits, probes, security contexts
- Generates combined manifests or individual files per resource

## What This Skill Does NOT Do

- Manage Helm releases (use `helm-blueprint` skill)
- Create Dockerfiles (use `docker-blueprint` skill)
- Apply manifests to clusters (use `kubectl apply`)

---

## Before Implementation

| Source | Gather |
|--------|--------|
| **Codebase** | Existing K8s configs, Docker images, service architecture |
| **Conversation** | User's services, ports, env vars, cluster target |
| **Skill References** | K8s patterns from `references/k8s-patterns.md` |
| **User Guidelines** | Project CLAUDE.md for deployment details |

---

## Clarifications

| Question | Why |
|----------|-----|
| Service name + image? | Resource naming and container image |
| Port(s)? | Container and service ports |
| Namespace? | Target namespace (default: default) |
| Env vars / secrets? | ConfigMap or Secret resources |
| Output format? | Single combined YAML or individual files |

---

## Generation Workflow

```
1. Collect service requirements
2. Generate Deployment manifest
3. Generate Service manifest
4. Optionally: ConfigMap, Secret, Ingress, Namespace
5. Output as combined or individual YAML files
```

### Resource Templates

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <name>
  labels:
    app.kubernetes.io/name: <name>
    app.kubernetes.io/managed-by: kubectl
spec:
  replicas: <replicas>
  selector:
    matchLabels:
      app.kubernetes.io/name: <name>
  template:
    metadata:
      labels:
        app.kubernetes.io/name: <name>
    spec:
      containers:
        - name: <name>
          image: <image>:<tag>
          ports:
            - containerPort: <port>
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: <port>
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: <port>
            initialDelaySeconds: 5
            periodSeconds: 10
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <name>
spec:
  type: ClusterIP  # or NodePort for local dev
  selector:
    app.kubernetes.io/name: <name>
  ports:
    - port: <service-port>
      targetPort: <container-port>
      protocol: TCP
```

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: <name>-config
data:
  KEY: "value"
```

### Validation Checklist

- [ ] All resources have consistent labels
- [ ] Deployment has resource requests and limits
- [ ] Deployment has liveness and readiness probes
- [ ] Service selector matches Deployment labels
- [ ] No secrets in ConfigMap (use Secret kind)
- [ ] Namespace specified if not default
- [ ] YAML validates with `kubectl apply --dry-run=client`

---

## Reference Files

| File | Content |
|------|---------|
| `references/k8s-patterns.md` | Kubernetes resource patterns, label conventions, probe strategies |
