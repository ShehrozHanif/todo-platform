# Contract: Helm Cloud Values

**Feature**: cloud-deployment
**FR Coverage**: FR-001, FR-002, FR-004, FR-005
**File**: `cloud/helm/values-cloud.yaml`

---

## Purpose

This file overrides the base Helm chart values for the cloud deployment target. It is passed to `helm upgrade` via `-f cloud/helm/values-cloud.yaml` and `-f cloud/helm/values-dapr.yaml`. It does NOT contain secrets.

---

## Backend Overrides

```yaml
# cloud/helm/values-cloud.yaml (backend section)
backend:
  replicaCount: 2
  dapr:
    enabled: true              # Activate Dapr sidecar (FR-005)
  image:
    repository: ghcr.io/<owner>/todo-backend
    tag: "latest"              # Overridden at deploy time with --set
    pullPolicy: Always
  env:
    ALLOWED_ORIGINS: "https://<ingress-host>"
    MCP_SERVER_URL: "http://todo-mcp-server:8001/sse"
    KAFKA_BOOTSTRAP_SERVERS: "todo-kafka:9092"
  resources:
    requests: { cpu: 200m, memory: 256Mi }
    limits:   { cpu: 1000m, memory: 512Mi }
  probes:
    liveness:  { path: /health, initialDelaySeconds: 15, periodSeconds: 30 }
    readiness: { path: /health, initialDelaySeconds: 10, periodSeconds: 10 }
```

**Contract**:
- `dapr.enabled: true` is REQUIRED in cloud — pods without sidecar cannot load secrets
- `replicaCount: 2` ensures HA — single-replica is insufficient for rolling updates
- `resources.limits` are required; unrestricted pods risk OOMKilled events

---

## Frontend Overrides

```yaml
frontend:
  replicaCount: 2
  dapr:
    enabled: true
  image:
    repository: ghcr.io/<owner>/todo-frontend
    tag: "latest"
    pullPolicy: Always
  env:
    NEXT_PUBLIC_APP_URL: "https://<ingress-host>"
    BETTER_AUTH_URL: "https://<ingress-host>"
    NEXT_PUBLIC_API_URL: "https://<ingress-host>"   # Same host, ingress routes /api/* to backend
  resources:
    requests: { cpu: 100m, memory: 128Mi }
    limits:   { cpu: 500m, memory: 256Mi }
```

**Contract**: `NEXT_PUBLIC_API_URL` must point to the public HTTPS URL (not internal cluster IP) so browser-side API calls work.

---

## Ingress Configuration

```yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
  host: todo.<cluster-public-ip>.nip.io   # Or custom hostname
  tls:
    - hosts: [todo.<cluster-public-ip>.nip.io]
      secretName: todo-tls
  rules:
    - path: /api
      service: todo-backend
      port: 8000
    - path: /
      service: todo-frontend
      port: 3000
```

**Contract**:
- TLS must be enabled — plain HTTP is not acceptable for production (FR-002, SC-005)
- nip.io wildcard DNS provides a stable hostname without domain registration
- `/api` and `/` path routing keeps frontend and backend on the same hostname (avoids CORS issues)

---

## In-Cluster Dependencies

```yaml
# Kafka (Bitnami chart — deployed as sub-chart or separate release)
kafka:
  enabled: true
  replicaCount: 1
  persistence:
    enabled: true
    size: 8Gi
  serviceAccount:
    create: true

# Redis (Bitnami chart — required for Dapr state store)
redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false            # Internal cluster only — no external exposure
  master:
    persistence:
      enabled: true
      size: 2Gi
```

**Contract**:
- Both Kafka and Redis must be running before backend pods start (handled by Kubernetes initContainers or `helm --wait`)
- Redis auth disabled for simplicity (internal cluster only, no external network exposure)
- Kafka persistence enabled to prevent message loss on pod restart

---

## Dapr Component Overrides

```yaml
# cloud/helm/values-dapr.yaml
daprComponents:
  pubsub:
    brokers: "todo-kafka:9092"      # Internal cluster service name
  statestore:
    redisHost: "todo-redis-master:6379"
  secrets:
    type: kubernetes                 # Use K8s secrets as Dapr secrets store
```

**Contract**: Component names must match the names used in `sidecar/pubsub.py` (`kafka-pubsub`), `sidecar/state.py` (`statestore`), and `sidecar/secrets.py`.
