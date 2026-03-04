# Quickstart: Cloud Deployment Integration Scenarios

**Feature**: cloud-deployment
**Date**: 2026-03-04

This document describes the end-to-end verification scenarios for each user story. Run these after deployment to confirm all success criteria are met.

---

## Prerequisites

```bash
# Install tools
brew install kubectl helm gh

# Authenticate to cluster (GKE example)
gcloud container clusters get-credentials <cluster-name> --region <region>

# Verify cluster access
kubectl get nodes
kubectl get namespace todo-platform  # Must exist after deployment
```

---

## Scenario 1: First-Time Deployment (US1 — P1)

**Goal**: Verify the platform is publicly accessible at HTTPS URL.

```bash
# Step 1: Create namespace and Kubernetes secrets (ONE-TIME setup)
kubectl create namespace todo-platform

kubectl create secret generic todo-backend-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
  -n todo-platform

kubectl create secret generic todo-frontend-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -n todo-platform

# Step 2: Install Dapr into the cluster (ONE-TIME)
helm repo add dapr https://dapr.github.io/helm-charts/
helm upgrade --install dapr dapr/dapr --namespace dapr-system --create-namespace --wait

# Step 3: Install NGINX Ingress + cert-manager (ONE-TIME)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --wait

helm repo add jetstack https://charts.jetstack.io
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true --wait

# Step 4: Deploy application
helm upgrade --install todo-platform k8s/helm/todo-platform \
  --namespace todo-platform \
  -f cloud/helm/values-cloud.yaml \
  --set backend.image.tag=latest \
  --set frontend.image.tag=latest \
  --wait --timeout 10m

# Step 5: Verify pods are running
kubectl get pods -n todo-platform
# Expected: all pods Running, 2/2 READY (app + dapr sidecar)

# Step 6: Get the public URL
kubectl get ingress -n todo-platform
# Note the ADDRESS (cloud LB IP)

# Step 7: Smoke test
INGRESS_HOST=$(kubectl get ingress todo-platform -n todo-platform -o jsonpath='{.spec.rules[0].host}')
curl -f "https://$INGRESS_HOST/health"
# Expected: {"status":"ok"}
```

**Expected outcome**: App reachable at `https://<ingress-host>`. Sign up, create a task, refresh browser — task persists. (SC-001: < 30 min from first helm install)

---

## Scenario 2: CI/CD Pipeline End-to-End (US2 — P2)

**Goal**: Verify that a code push triggers automatic deployment.

```bash
# Step 1: Make a visible change
echo "# $(date)" >> README.md
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin master

# Step 2: Watch the pipeline
gh run watch

# Step 3: Verify stages complete in order:
# build ✓ → test ✓ (138 passed) → push ✓ → deploy ✓ → verify ✓

# Step 4: Verify new image is live
kubectl describe deployment todo-backend -n todo-platform | grep Image
# Expected: image tag matches the git SHA of the commit above

# Step 5: Verify total time
gh run view --json createdAt,updatedAt
# Expected: < 10 minutes (SC-002)
```

**Simulating failure and rollback**:
```bash
# Introduce a failing test (in a branch, for simulation only)
# When merged to master: pipeline fails at test stage, deploy is skipped
# GitHub Actions UI shows red X on test job
```

---

## Scenario 3: Monitoring Dashboard (US3 — P3)

**Goal**: Verify metrics are visible and alerts fire.

```bash
# Step 1: Get Grafana URL
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring

# Open: http://localhost:3001 (admin/prom-operator)
# Navigate to: Dashboards → Todo Platform

# Step 2: Generate test traffic
for i in $(seq 1 100); do
  curl -s "https://$INGRESS_HOST/health" > /dev/null
done
# Observe: request rate panel shows spike

# Step 3: Simulate errors (to test alerting)
kubectl exec -n todo-platform deploy/todo-backend -- \
  python -c "import time; time.sleep(600)" &
# This starves the pod; verify alert fires within 7 minutes (SC-004)

# Step 4: Query logs
kubectl port-forward svc/loki 3100:3100 -n monitoring
# In Grafana: Explore → Loki → query {namespace="todo-platform"}
```

---

## Scenario 4: Secrets Are Not Exposed (US4 — P4)

**Goal**: Verify no plaintext secrets in repo or CI logs.

```bash
# Check 1: No secrets in git
git log --all -S "postgresql+asyncpg" -- '**/*'
# Expected: no output (no commits contain the connection string)

# Check 2: No secrets in CI logs
gh run view <run-id> --log | grep -i "DATABASE_URL"
# Expected: no plaintext values (only "***" masked if referenced)

# Check 3: Secrets are loaded correctly
kubectl exec -n todo-platform deploy/todo-backend -- \
  python -c "import os; print(bool(os.getenv('DATABASE_URL')))"
# Expected: True (secret was injected by Dapr at startup)

# Check 4: Backend health check uses the DB
curl -f "https://$INGRESS_HOST/health"
# Expected: {"status":"ok"} — confirms DB connection works
```

---

## Rollback Scenario

```bash
# Manual rollback (if CI/CD rollback failed or wasn't triggered)
helm history todo-platform -n todo-platform
# Lists previous releases

helm rollback todo-platform <revision> -n todo-platform --wait
# Rolls back to previous image version

kubectl rollout status deployment/todo-backend -n todo-platform
# Expected: successfully rolled out
```

---

## Teardown (if needed)

```bash
helm uninstall todo-platform -n todo-platform
kubectl delete namespace todo-platform
# Note: Neon DB and ghcr.io images are not deleted by this command
```
