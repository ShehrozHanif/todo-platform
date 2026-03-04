# Monitoring Setup

<!-- [Task]: T022 [From]: specs/phase5-cloud/cloud-deployment/spec.md §FR-011,FR-012,FR-013,FR-014 -->

One-time monitoring stack install for the todo-platform OKE cluster.

## 1. Add Helm repos

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

## 2. Install kube-prometheus-stack (Prometheus + Grafana + AlertManager)

```bash
helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f cloud/monitoring/values-prometheus.yaml \
  --wait
```

## 3. Install Loki + Grafana Alloy (log aggregation)

> **Note**: Promtail reached end-of-life on March 2, 2026. Use Grafana Alloy instead.

```bash
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set alloy.enabled=true \
  --set promtail.enabled=false \
  --wait
```

Add Loki as a Grafana datasource:
```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-loki-datasource
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  loki-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Loki
        type: loki
        url: http://loki:3100
        access: proxy
EOF
```

## 4. Apply monitoring resources

```bash
# Prometheus ServiceMonitor (scrapes /metrics from backend)
kubectl apply -f cloud/monitoring/servicemonitor-backend.yaml -n monitoring

# Alert rules (HighErrorRate, PodCrashLoop, ServiceDown)
kubectl apply -f cloud/monitoring/alerts/backend-errors.yaml -n monitoring
```

## 5. Import Grafana dashboard

```bash
# Port-forward to Grafana
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring

# Open http://localhost:3001 (admin / changeme-set-via-kubectl-secret)
# Import dashboard: cloud/monitoring/grafana/dashboards/todo-platform.json
```

Or apply as ConfigMap for auto-discovery:
```bash
kubectl create configmap todo-platform-dashboard \
  --from-file=todo-platform.json=cloud/monitoring/grafana/dashboards/todo-platform.json \
  --namespace monitoring \
  --dry-run=client -o yaml | \
  kubectl label -f - --local grafana_dashboard=1 -o yaml | \
  kubectl apply -f -
```

## 6. Verify

```bash
# Check Prometheus targets
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring
# Open http://localhost:9090/targets — look for todo-platform-backend

# Query logs
kubectl exec -it -n monitoring deploy/loki -- \
  logcli query '{namespace="todo-platform"}'
```
