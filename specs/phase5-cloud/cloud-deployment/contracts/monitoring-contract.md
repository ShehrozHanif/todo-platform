# Contract: Monitoring & Observability

**Feature**: cloud-deployment
**FR Coverage**: FR-011, FR-012, FR-013, FR-014
**Stack**: kube-prometheus-stack (Prometheus + Grafana + AlertManager) + Loki

---

## Metrics Collection (FR-011)

**Tool**: Prometheus (via kube-prometheus-stack Helm chart)

**ServiceMonitor** for backend (auto-discovered by Prometheus):
```yaml
# cloud/monitoring/servicemonitor-backend.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: todo-backend
  namespace: todo-platform
spec:
  selector:
    matchLabels:
      app: todo-backend
  endpoints:
    - port: http
      path: /metrics          # FastAPI Prometheus metrics endpoint
      interval: 30s
```

**Metrics scraped**:
| Metric | Source | Purpose |
|--------|--------|---------|
| `http_requests_total` | FastAPI (prometheus-fastapi-instrumentator) | Request rate, error rate |
| `http_request_duration_seconds` | FastAPI | Latency histogram |
| `container_cpu_usage_seconds_total` | cAdvisor (built into kube-prometheus) | CPU per pod |
| `container_memory_working_set_bytes` | cAdvisor | Memory per pod |
| `kube_pod_container_status_restarts_total` | kube-state-metrics | Crash detection |

**Contract**: Backend must expose `GET /metrics` (added via `prometheus-fastapi-instrumentator` in main.py). This endpoint must be unauthenticated for Prometheus scraping.

---

## Dashboard (FR-012)

**Tool**: Grafana (included in kube-prometheus-stack)

**Default dashboards** (auto-imported):
- Kubernetes cluster overview (included in kube-prometheus-stack)
- Node exporter (CPU/memory per node)

**Custom dashboard**: `cloud/monitoring/grafana/dashboards/todo-platform.json`

**Panels**:
1. **Request Rate** — `rate(http_requests_total{job="todo-backend"}[5m])` by status code
2. **Error Rate %** — `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100`
3. **P95 Latency** — `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
4. **Backend CPU** — `container_cpu_usage_seconds_total{pod=~"todo-backend.*"}`
5. **Backend Memory** — `container_memory_working_set_bytes{pod=~"todo-backend.*"}`
6. **Pod Restarts** — `increase(kube_pod_container_status_restarts_total{namespace="todo-platform"}[1h])`

**Time range**: Default 24h, minimum 5m resolution.

**Contract**: Dashboard must load within 5 seconds. All panels must show data within 60 seconds of deployment (SC-004).

---

## Alerting (FR-013)

**Tool**: Prometheus AlertManager

**Alert rules** (`cloud/monitoring/alerts/backend-errors.yaml`):

```yaml
groups:
  - name: todo-backend
    rules:
      - alert: HighErrorRate
        expr: |
          (rate(http_requests_total{status=~"5..",job="todo-backend"}[5m])
          / rate(http_requests_total{job="todo-backend"}[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Backend error rate above 5% for 5 minutes"
          description: "Error rate is {{ $value | humanizePercentage }}"
          runbook: "Check backend logs: kubectl logs -l app=todo-backend -n todo-platform"

      - alert: PodCrashLooping
        expr: |
          increase(kube_pod_container_status_restarts_total{
            namespace="todo-platform",container="todo-backend"
          }[10m]) > 2
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Backend pod is crash-looping"

      - alert: ServiceDown
        expr: |
          up{job="todo-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Todo backend is unreachable"
```

**AlertManager routing**: Email notification to developer (configured via AlertManager Helm values).

**Contract**:
- `HighErrorRate` must fire within 5 minutes of sustained 5%+ error rate (SC-004)
- All alert rules must be deployed as `PrometheusRule` CRDs (automatically picked up by kube-prometheus-stack)

---

## Log Aggregation (FR-014)

**Tool**: Loki + Promtail (Grafana Loki Helm chart)

**Log sources**:
- All pods in `todo-platform` namespace (Promtail DaemonSet collects from `/var/log/containers/`)
- Dapr sidecar logs (collected alongside application logs)

**Log queries** (Grafana LogQL):
```logql
# Backend error logs
{namespace="todo-platform", pod=~"todo-backend.*"} |= "ERROR"

# All backend logs last 1h
{namespace="todo-platform", pod=~"todo-backend.*"}

# Dapr sidecar logs
{namespace="todo-platform"} |~ "daprd"
```

**Retention**: 7 days (default Loki retention)

**Contract**:
- Logs must be searchable by: namespace, pod name, time range, log level
- Log ingestion latency: < 30 seconds from log emission to Grafana visibility
- Dapr sidecar logs must appear alongside application logs in the same namespace query
