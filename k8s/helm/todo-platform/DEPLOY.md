# Deploying Todo Platform to Minikube

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.53+
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm 3](https://helm.sh/docs/intro/install/)
- Optional: [kubectl-ai](https://github.com/GoogleCloudPlatform/kubectl-ai), [kagent](https://github.com/kagent-dev/kagent)

## Step 1: Start Minikube

```bash
minikube start --driver=docker --memory=4096 --cpus=2
```

## Step 2: Build Docker Images in Minikube's Docker Daemon

```bash
# Point your shell to Minikube's Docker daemon
eval $(minikube docker-env)

# Build all 3 images
docker build -f k8s/backend/Dockerfile backend/ -t todo-backend:latest
docker build -f k8s/frontend/Dockerfile frontend/ -t todo-frontend:latest
docker build -f k8s/mcp-server/Dockerfile agents/mcp-server/ -t todo-mcp:latest

# Verify images
docker images | grep todo
```

## Step 3: Create Namespace

```bash
kubectl create namespace todo-app
```

## Step 4: Set Secrets

```bash
helm install todo k8s/helm/todo-platform \
  --namespace todo-app \
  --set backend.secrets.DATABASE_URL="your-neon-db-url" \
  --set backend.secrets.BETTER_AUTH_SECRET="your-secret" \
  --set backend.secrets.OPENAI_API_KEY="sk-your-key" \
  --set frontend.secrets.DATABASE_URL="your-neon-db-url" \
  --set frontend.secrets.BETTER_AUTH_SECRET="your-secret" \
  --set mcp-server.secrets.DATABASE_URL="your-neon-db-url"
```

## Step 5: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n todo-app

# Check services
kubectl get svc -n todo-app

# Check logs
kubectl logs -n todo-app -l app.kubernetes.io/name=backend
kubectl logs -n todo-app -l app.kubernetes.io/name=frontend
kubectl logs -n todo-app -l app.kubernetes.io/name=mcp-server
```

## Step 6: Access the App

```bash
# Open frontend in browser (NodePort)
minikube service todo-frontend -n todo-app

# Or port-forward for direct access
kubectl port-forward -n todo-app svc/todo-frontend 3000:3000
kubectl port-forward -n todo-app svc/todo-backend 8000:8000
```

## Upgrade / Update

```bash
helm upgrade todo k8s/helm/todo-platform --namespace todo-app --reuse-values
```

## Uninstall

```bash
helm uninstall todo --namespace todo-app
kubectl delete namespace todo-app
```

---

## AIOps Commands

### Gordon (Docker AI Agent)

```bash
# Enable: Docker Desktop → Settings → Beta features → toggle Gordon on

# Optimize Dockerfiles
docker ai "analyze and optimize the Dockerfile at k8s/backend/Dockerfile"
docker ai "what's the image size of todo-backend:latest and how can I reduce it?"
docker ai "check for security issues in my Docker images"

# Debug build issues
docker ai "why is my Docker build failing?"
docker ai "explain the multi-stage build in k8s/frontend/Dockerfile"
```

### kubectl-ai

```bash
# Deploy and scale
kubectl-ai "deploy the todo frontend with 2 replicas"
kubectl-ai "scale the backend to handle more load"
kubectl-ai "show me resource usage for all pods in todo-app namespace"

# Debug
kubectl-ai "check why the pods are failing in todo-app namespace"
kubectl-ai "show me the logs for the backend pod"
kubectl-ai "describe the backend deployment in todo-app"

# Monitor
kubectl-ai "show me the health status of all services"
kubectl-ai "are there any pending or failed pods?"
```

### kagent

```bash
# Cluster health
kagent "analyze the cluster health"
kagent "check resource allocation in todo-app namespace"

# Optimization
kagent "optimize resource allocation for todo-app"
kagent "suggest improvements for the todo-platform deployment"

# Troubleshooting
kagent "diagnose networking issues between backend and mcp-server"
kagent "why can't the frontend reach the backend?"
```
