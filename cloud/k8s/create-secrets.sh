#!/usr/bin/env bash
# [Task]: T005 [From]: specs/phase5-cloud/cloud-deployment/spec.md §FR-015
# One-time script: create Kubernetes secrets for the todo-platform namespace.
# Secrets are sourced from local environment variables — NEVER hardcoded here.
# Run once per new cluster before first helm deploy.
#
# Usage:
#   export DATABASE_URL="postgresql+asyncpg://..."
#   export BETTER_AUTH_SECRET="..."
#   export OPENAI_API_KEY="sk-..."
#   ./cloud/k8s/create-secrets.sh

set -euo pipefail

NAMESPACE="todo-platform"

echo "Creating namespace ${NAMESPACE}..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

echo "Creating todo-backend-secrets..."
kubectl create secret generic todo-backend-secrets \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}" \
  --from-literal=OPENAI_API_KEY="${OPENAI_API_KEY}" \
  --namespace "${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Creating todo-frontend-secrets..."
kubectl create secret generic todo-frontend-secrets \
  --from-literal=DATABASE_URL="${DATABASE_URL:+${DATABASE_URL/asyncpg/}}" \
  --from-literal=BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET}" \
  --namespace "${NAMESPACE}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secrets created. Verify with:"
echo "  kubectl get secrets -n ${NAMESPACE}"
