# Contract: CI/CD Pipeline

**Feature**: cloud-deployment
**FR Coverage**: FR-006, FR-007, FR-008, FR-009, FR-010
**File**: `.github/workflows/ci-cd.yml`

---

## Pipeline Triggers

```yaml
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
```

- **Push to master**: Runs full pipeline (build → test → push → deploy)
- **Pull request**: Runs build + test only (no push/deploy)

---

## Stage 1: Build Docker Images

**Job**: `build`
**Runs on**: `ubuntu-latest`

**Steps**:
1. `actions/checkout@v4`
2. `docker/setup-buildx-action@v3`
3. `docker/login-action@v3` (ghcr.io, GITHUB_TOKEN)
4. Build backend: `docker build -f backend/Dockerfile -t ghcr.io/${{ github.repository_owner }}/todo-backend:${{ github.sha }}`
5. Build frontend: `docker build -f k8s/Dockerfile.frontend -t ghcr.io/${{ github.repository_owner }}/todo-frontend:${{ github.sha }}`

**Outputs**:
- `backend-image`: `ghcr.io/<owner>/todo-backend:<sha>`
- `frontend-image`: `ghcr.io/<owner>/todo-frontend:<sha>`

**Failure behavior**: Pipeline stops. No images pushed. Developer receives GitHub notification.

---

## Stage 2: Run Tests

**Job**: `test`
**Runs on**: `ubuntu-latest`
**Needs**: (runs in parallel with build — does not need build output)

**Steps**:
1. `actions/checkout@v4`
2. `actions/setup-python@v5` (python-version: '3.13')
3. `astral-sh/setup-uv@v4`
4. `cd backend && uv sync`
5. `cd backend && uv run pytest -v --tb=short` (must pass all 138+ tests)

**Test environment**:
- Uses `sqlite+aiosqlite:///:memory:` (set via `DATABASE_URL` env var in test conftest)
- No external services required (Dapr, Kafka stubs via autouse fixtures)

**Failure behavior**: Pipeline stops after test job. Deploy job skipped. No images pushed.

**Contract**: Tests MUST pass with exit code 0. Any non-zero exit code = pipeline failure.

---

## Stage 3: Push Images

**Job**: `push`
**Runs on**: `ubuntu-latest`
**Needs**: `[build, test]` (both must succeed)
**Condition**: `github.event_name == 'push' && github.ref == 'refs/heads/master'`

**Steps**:
1. Re-run build (or restore from cache) and push with both tags:
   - `ghcr.io/<owner>/todo-backend:<sha>` (immutable)
   - `ghcr.io/<owner>/todo-backend:latest` (floating)
2. Same for frontend

**Contract**: Images must be tagged with the exact `GITHUB_SHA` value used by the deploy step.

---

## Stage 4: Deploy to Cloud Cluster

**Job**: `deploy`
**Runs on**: `ubuntu-latest`
**Needs**: `push`
**Condition**: `github.ref == 'refs/heads/master'`

**Required GitHub Secrets**:
| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `KUBECONFIG_B64` | base64-encoded kubeconfig | Authenticate to cluster |
| `HELM_NAMESPACE` | `todo-platform` | Kubernetes namespace |

**Steps**:
1. Decode kubeconfig: `echo "$KUBECONFIG_B64" | base64 -d > kubeconfig.yaml`
2. Install Helm
3. `helm upgrade --install todo-platform k8s/helm/todo-platform \`
   `  --namespace todo-platform --create-namespace \`
   `  -f cloud/helm/values-cloud.yaml \`
   `  --set backend.image.tag=${{ github.sha }} \`
   `  --set frontend.image.tag=${{ github.sha }} \`
   `  --wait --timeout 5m`

**Rollout timeout**: 5 minutes. If pods don't become Ready within 5 minutes, `helm upgrade` returns non-zero and triggers rollback step.

---

## Stage 5: Verify & Rollback

**Job**: `verify` (runs as part of deploy job, post-deploy)

**Steps**:
1. `kubectl rollout status deployment/todo-backend -n todo-platform --timeout=120s`
2. `kubectl rollout status deployment/todo-frontend -n todo-platform --timeout=120s`
3. HTTP health check: `curl -f https://<ingress-host>/health` (backend)

**On failure**:
```bash
helm rollback todo-platform -n todo-platform
```

**Contract**: If the health check returns non-200 or rollout times out, rollback MUST be triggered automatically. Failure notification is sent via GitHub Actions job failure (email to repo watchers).

---

## Environment Variables in Pipeline

| Variable | Source | Used In |
|----------|--------|---------|
| `GITHUB_TOKEN` | Automatic (GitHub) | ghcr.io login |
| `GITHUB_SHA` | Automatic (GitHub) | Image tag |
| `KUBECONFIG_B64` | GitHub Secret | kubectl/helm auth |
| `HELM_NAMESPACE` | GitHub Secret (default: `todo-platform`) | helm commands |
| `DATABASE_URL` | NOT in pipeline | Loaded from K8s secrets at runtime |
| `BETTER_AUTH_SECRET` | NOT in pipeline | Loaded from K8s secrets at runtime |

**Contract**: `DATABASE_URL` and `BETTER_AUTH_SECRET` MUST NEVER appear as pipeline environment variables. They are loaded at pod startup via Dapr secrets.
