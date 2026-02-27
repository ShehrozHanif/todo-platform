# Kubernetes Resource Patterns

## Recommended Labels

Every resource should have these labels:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: <app-name>
    app.kubernetes.io/instance: <release-name>
    app.kubernetes.io/version: <app-version>
    app.kubernetes.io/component: <component>  # frontend, backend, database
    app.kubernetes.io/managed-by: kubectl
```

## Probe Strategies

| Probe | Purpose | Path | Timing |
|-------|---------|------|--------|
| Liveness | Is the container alive? Restart if not. | /health | initialDelay: 10s, period: 30s |
| Readiness | Can it serve traffic? Remove from LB if not. | /health | initialDelay: 5s, period: 10s |
| Startup | Is it still starting? Wait. | /health | failureThreshold: 30, period: 10s |

## Resource Limits Guide

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|-------------|-----------|----------------|--------------|
| Lightweight API | 100m | 500m | 128Mi | 256Mi |
| Heavy API | 250m | 1000m | 256Mi | 512Mi |
| Frontend | 50m | 200m | 64Mi | 128Mi |
| Worker | 500m | 2000m | 512Mi | 1Gi |

## Service Types for Minikube

- **NodePort**: Direct access via `minikube service <name>`
- **ClusterIP + Ingress**: Use `minikube addons enable ingress`
- **LoadBalancer**: Use `minikube tunnel` to simulate

## ConfigMap vs Secret

| Data Type | Use |
|-----------|-----|
| App config (ports, URLs, feature flags) | ConfigMap |
| Credentials (DB passwords, API keys) | Secret (base64) |
| TLS certificates | Secret (type: kubernetes.io/tls) |

## Namespace Strategy

- `default`: Quick testing only
- `todo-app` or `<project-name>`: Production/staging
- Create namespace in manifest or via `kubectl create namespace`

## Anti-Patterns

- Running containers as root
- No resource limits (causes node pressure)
- No probes (causes traffic to dead pods)
- Hardcoded image tags as `latest`
- Secrets in ConfigMaps
- No namespace isolation
