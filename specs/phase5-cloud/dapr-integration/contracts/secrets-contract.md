# Contract: Secrets API — Startup Loading (US4)

**Module**: `backend/dapr/secrets.py`
**Feature**: Dapr Integration | **Date**: 2026-03-04

---

## Public API

### `load_secrets_from_dapr() -> dict[str, str]`

**Purpose**: Retrieve `DATABASE_URL` and `BETTER_AUTH_SECRET` from Dapr Kubernetes Secret Store at application startup.

**Returns**: `dict[str, str]` — map of secret key → value (e.g., `{"DATABASE_URL": "...", "BETTER_AUTH_SECRET": "..."}`)

**Returns empty dict** when:
- Dapr sidecar is unavailable (local dev without sidecar)
- `secretstores.kubernetes` component not configured
- Any `RpcError` or other exception

**Never raises** — all exceptions caught and logged as `WARNING`.

**Implementation**:
```python
def load_secrets_from_dapr() -> dict[str, str]:
    try:
        with DaprClient() as client:
            resp = client.get_secret(
                store_name="kubernetes",
                key="todo-app-secrets",   # K8s Secret object name
            )
            return dict(resp.secret)      # {"DATABASE_URL": "...", "BETTER_AUTH_SECRET": "..."}
    except Exception as exc:
        logging.getLogger(__name__).warning("Dapr secrets unavailable: %s", exc)
        return {}
```

---

### `inject_secrets(secrets: dict[str, str]) -> None`

**Purpose**: Write resolved secret values into `os.environ` so existing code (e.g., `get_engine()`) picks them up transparently.

**Parameters**: `secrets` — dict returned by `load_secrets_from_dapr()`

**Behavior**: Only injects keys that are NOT already set in `os.environ` (preserves explicit env var overrides for local dev).

```python
def inject_secrets(secrets: dict[str, str]) -> None:
    for key, value in secrets.items():
        if key not in os.environ:
            os.environ[key] = value
```

---

## Startup Sequence in `db.py` lifespan

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Load secrets (synchronous — called before engine init)
    from dapr.secrets import load_secrets_from_dapr, inject_secrets
    secrets = await asyncio.to_thread(load_secrets_from_dapr)
    inject_secrets(secrets)

    # 2. Engine init (reads DATABASE_URL from os.environ)
    engine = get_engine()          # raises ValueError if DATABASE_URL missing → fail-fast

    # 3. Create tables, run migrations
    ...

    # 4. Kafka setup (fail-open)
    ...

    # 5. Register Jobs (fail-open)
    from dapr.jobs import register_reminder_job
    await register_reminder_job()

    yield

    # Shutdown
    await engine.dispose()
```

---

## Fail-Fast Behavior

| Condition | Behavior |
|-----------|----------|
| Dapr sidecar available, `todo-app-secrets` exists | `DATABASE_URL` + `BETTER_AUTH_SECRET` injected → app starts |
| Dapr sidecar available, secret key missing | `get_secret()` returns partial dict; missing keys not injected; if `DATABASE_URL` was already in env, app starts |
| Dapr sidecar unavailable, `.env` has `DATABASE_URL` | `load_secrets_from_dapr()` returns `{}` → `inject_secrets()` injects nothing → `python-dotenv` value used → app starts |
| Dapr sidecar unavailable, no `.env` | `load_secrets_from_dapr()` returns `{}` → `get_engine()` raises `ValueError("DATABASE_URL not set")` → **app exits with non-zero code** (FR-011) |

---

## Kubernetes Secret Store Component

**Component name**: `kubernetes` (must match `metadata.name` in `kubernetes.yaml`)
**Component type**: `secretstores.kubernetes` v1
**YAML** (`cloud/dapr/components/kubernetes.yaml`):
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes
  namespace: todo-platform
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

**RBAC requirement**: Pod service account needs `get` and `list` on `secrets` in `todo-platform` namespace.

---

## Kubernetes Secret Object

**Name**: `todo-app-secrets`
**Namespace**: `todo-platform`

Pre-populated before deployment (not created by the application):
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: todo-app-secrets
  namespace: todo-platform
type: Opaque
stringData:
  DATABASE_URL: "postgresql+asyncpg://user:pass@host/dbname?sslmode=require"
  BETTER_AUTH_SECRET: "your-32-char-secret"
```

---

## Test Requirements

| Scenario | Expected |
|----------|----------|
| Dapr client returns secrets | `load_secrets_from_dapr()` returns dict with both keys |
| `DaprClient` raises `RpcError` | Returns `{}` ; WARNING logged |
| `inject_secrets` with empty dict | `os.environ` unchanged |
| `inject_secrets` with values | Missing keys added to `os.environ` |
| `inject_secrets` — key already in env | Existing value preserved (not overwritten) |
| Lifespan with missing DATABASE_URL after inject | `get_engine()` raises `ValueError` (existing test) |
