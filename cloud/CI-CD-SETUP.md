# CI/CD Setup Guide

<!-- [Task]: T015/T025 [From]: specs/phase5-cloud/cloud-deployment/spec.md §FR-006,FR-015 -->

This guide explains how to configure GitHub Actions secrets for the todo-platform CI/CD pipeline.

## Required GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Description | How to Get |
|-------------|-------------|-----------|
| `KUBECONFIG_B64` | Base64-encoded OKE kubeconfig | See below |
| `HELM_NAMESPACE` | Kubernetes namespace (default: `todo-platform`) | Set to `todo-platform` |

### Generating `KUBECONFIG_B64`

1. Install the OCI CLI: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
2. Set up your cluster access:
   ```bash
   oci ce cluster create-kubeconfig \
     --cluster-id <your-cluster-ocid> \
     --file ~/.kube/oke-config \
     --region <your-region> \
     --token-version 2.0.0
   ```
3. Base64-encode it:
   ```bash
   # macOS/Linux
   base64 -i ~/.kube/oke-config | tr -d '\n'

   # Windows (PowerShell)
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("$HOME\.kube\oke-config"))
   ```
4. Paste the output as the `KUBECONFIG_B64` secret value.

## Secrets NOT in Pipeline (Security Contract)

Per spec FR-015 and constitution §V: these secrets **MUST NEVER** appear as GitHub Actions environment variables:

- `DATABASE_URL` — loaded from K8s secret `todo-backend-secrets` at pod startup via Dapr
- `BETTER_AUTH_SECRET` — same; loaded via Dapr Kubernetes secrets store
- `OPENAI_API_KEY` — same

Create them once using: `./cloud/k8s/create-secrets.sh`

## Image Registry (ghcr.io)

Images are pushed to `ghcr.io` as **public** packages using the automatic `GITHUB_TOKEN` — no separate registry secret needed.

To make packages public after first push:
1. Go to **GitHub profile → Packages**
2. Click each package → **Package settings → Change visibility → Public**

## OIDC-Based Authentication (No PAT Required)

The `ci.yml` workflow uses `permissions: id-token: write` and `packages: write` with the automatic `GITHUB_TOKEN` for ghcr.io login. No personal access token is stored as a secret. This ensures registry credentials are short-lived and never stored.

## Workflow Structure

```
git push master
     │
     ▼
ci.yml
  ├─ changes (path filter)
  ├─ test (always runs — 138+ pytest)
  ├─ build-backend (if backend/** changed or push)
  ├─ build-frontend (if frontend/** changed or push)
  └─ deploy (calls cd.yml — only if all above succeed)
         │
         ▼
cd.yml
  ├─ helm dependency update
  ├─ helm upgrade --atomic --timeout 10m
  ├─ kubectl rollout status (backend + frontend)
  └─ curl /health → helm rollback on failure
```
