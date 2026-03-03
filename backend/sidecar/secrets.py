# [Task]: T007 [From]: specs/phase5-cloud/dapr-integration/spec.md §US4
# Dapr Secrets API — load DATABASE_URL + BETTER_AUTH_SECRET from K8s Secret Store.
# Fail-open: on any error returns {} so python-dotenv .env values remain in effect.

import logging
import os

from dapr.clients import DaprClient

_log = logging.getLogger(__name__)

_STORE_NAME = "kubernetes"
_SECRET_KEY = "todo-app-secrets"


def load_secrets_from_dapr() -> dict[str, str]:
    """
    Retrieve secrets from the Dapr Kubernetes Secret Store.

    Returns a dict of {key: value} on success.
    Returns {} on any error (sidecar unavailable, key not found, etc.).
    Safe to call in local dev — will silently return {} without a sidecar.
    """
    try:
        with DaprClient() as client:
            resp = client.get_secret(
                store_name=_STORE_NAME,
                key=_SECRET_KEY,
            )
            return dict(resp.secret)
    except Exception as exc:
        _log.warning("Dapr secrets unavailable (%s: %s) — falling back to env vars",
                     type(exc).__name__, exc)
        return {}


def inject_secrets(secrets: dict[str, str]) -> None:
    """
    Inject resolved secret values into os.environ.

    Only sets keys that are NOT already present — preserves explicit env var
    overrides (e.g., from .env in local dev).
    """
    for key, value in secrets.items():
        if key not in os.environ:
            os.environ[key] = value
