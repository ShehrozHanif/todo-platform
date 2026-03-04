# Cloud Deployment Runbook

<!-- [Task]: T026 [From]: specs/phase5-cloud/cloud-deployment/spec.md §SC-001 -->

Step-by-step guide to deploy the todo-platform to OKE (Oracle Kubernetes Engine).

---

## Prerequisites

Install these tools locally:

```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# OCI CLI (for kubeconfig)
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
```

---

## Step 1: OKE Cluster Setup (One-Time)

### 1a. Create cluster access

```bash
oci ce cluster create-kubeconfig \
  --cluster-id <your-cluster-ocid> \
  --file ~/.kube/config \
  --region <your-region> \
  --token-version 2.0.0

kubectl get nodes  # Verify cluster access
```

### 1b. Create namespace

```bash
kubectl create namespace todo-platform
```

### 1c. Install Dapr

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system --create-namespace --wait
```

### 1d. Apply Dapr components

```bash
kubectl apply -f cloud/dapr/components/ -n todo-platform
```

### 1e. Install NGINX Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace --wait

# Get external IP (wait 1-2 min for OCI load balancer provisioning)
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Note the EXTERNAL-IP — this is your CLUSTER_IP
```

### 1f. Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true --wait

# Update email in letsencrypt-prod.yaml, then apply:
kubectl apply -f cloud/k8s/letsencrypt-prod.yaml
```

---

## Step 2: Create Kubernetes Secrets

```bash
export DATABASE_URL="postgresql+asyncpg://user:pass@host/db"
export BETTER_AUTH_SECRET="your-32-char-secret"
export OPENAI_API_KEY="sk-..."

./cloud/k8s/create-secrets.sh
```

---

## Step 3: Update Placeholder Values

Before deploying, replace placeholders in these files:

| File | Placeholder | Replace With |
|------|------------|--------------|
| `cloud/helm/values-cloud.yaml` | `GITHUB_OWNER` | Your GitHub username/org |
| `cloud/helm/values-cloud.yaml` | `CLUSTER_IP` | OKE NGINX external IP |
| `cloud/k8s/ingress.yaml` | `CLUSTER_IP` | Same OKE NGINX external IP |
| `cloud/k8s/letsencrypt-prod.yaml` | `<developer-email>` | Your email for Let's Encrypt |

---

## Step 4: First Deploy

```bash
# Update Helm dependencies (Bitnami Kafka + Redis)
helm dependency update k8s/helm/todo-platform

# Deploy (replace GITHUB_SHA with a real tag or 'latest')
helm upgrade --install todo-platform k8s/helm/todo-platform \
  --namespace todo-platform \
  -f cloud/helm/values-cloud.yaml \
  -f cloud/helm/values-dapr.yaml \
  --set backend.image.tag=latest \
  --set frontend.image.tag=latest \
  --atomic --timeout 10m

# Apply standalone ingress (after pods are running)
kubectl apply -f cloud/k8s/ingress.yaml -n todo-platform
```

---

## Step 5: Install Monitoring

See `cloud/monitoring/README.md` for full steps.

Quick install:

```bash
helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f cloud/monitoring/values-prometheus.yaml --wait

kubectl apply -f cloud/monitoring/servicemonitor-backend.yaml -n monitoring
kubectl apply -f cloud/monitoring/alerts/backend-errors.yaml -n monitoring
```

---

## Step 6: Verify (SC-001 through SC-007)

```bash
HOST="todo.CLUSTER_IP.nip.io"

# SC-001: Public HTTPS URL
curl -f "https://${HOST}/health"

# SC-003: All tests pass in CI
gh run view --log | grep -E "(PASSED|FAILED)"

# SC-005: No plaintext secrets in git
git log --all -S "postgresql+asyncpg" --oneline
git log --all -S "BETTER_AUTH_SECRET" --oneline
# Both should return empty

# SC-006: Pod restart recovery
kubectl delete pod -l app.kubernetes.io/name=backend -n todo-platform
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=backend \
  -n todo-platform --timeout=60s

# SC-007: 50 concurrent users (install hey first: go install github.com/rakyll/hey@latest)
hey -n 1000 -c 50 "https://${HOST}/health"
# Verify 0 non-2xx responses
```

---

## Runbook: High Error Rate

**Alert**: `HighErrorRate` — backend 5xx > 5% for 5 min

1. Check recent logs: `kubectl logs -l app.kubernetes.io/name=backend -n todo-platform --tail=100`
2. Check Dapr sidecar: `kubectl logs -c daprd -l app.kubernetes.io/name=backend -n todo-platform --tail=50`
3. Check DB connectivity from pod: `kubectl exec -it deploy/todo-platform-backend -n todo-platform -- python -c "import asyncio; from db import engine; asyncio.run(engine.dispose())"`
4. If deployment caused it: `helm rollback todo-platform -n todo-platform`

## Runbook: Pod Crash Loop

**Alert**: `PodCrashLoop` — pod restarted > 2 times in 10 min

1. Describe pod: `kubectl describe pod <pod-name> -n todo-platform`
2. Check events: `kubectl get events -n todo-platform --sort-by='.lastTimestamp'`
3. Check if secrets exist: `kubectl get secrets -n todo-platform`
4. If OOMKilled: increase `backend.resources.limits.memory` in values-cloud.yaml and redeploy

## Runbook: Service Down

**Alert**: `ServiceDown` — 0 available backend replicas for 2 min

1. Check all pods: `kubectl get pods -n todo-platform`
2. Check Helm release: `helm status todo-platform -n todo-platform`
3. Emergency rollback: `helm rollback todo-platform -n todo-platform`
