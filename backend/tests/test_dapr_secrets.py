# [Task]: T006 [From]: specs/phase5-cloud/dapr-integration/spec.md §US4
# RED tests for dapr/secrets.py — load_secrets_from_dapr() and inject_secrets()
# All DaprClient calls are mocked — no sidecar required.

import os
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# load_secrets_from_dapr()
# ---------------------------------------------------------------------------

class TestLoadSecretsFromDapr:
    def test_returns_dict_on_success(self):
        """Dapr returns secrets → dict with both keys returned."""
        from sidecar.secrets import load_secrets_from_dapr

        mock_resp = MagicMock()
        mock_resp.secret = {"DATABASE_URL": "postgresql://...", "BETTER_AUTH_SECRET": "abc"}

        with patch("sidecar.secrets.DaprClient") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get_secret.return_value = mock_resp
            mock_cls.return_value = mock_client

            result = load_secrets_from_dapr()

        assert result == {"DATABASE_URL": "postgresql://...", "BETTER_AUTH_SECRET": "abc"}
        mock_client.get_secret.assert_called_once_with(
            store_name="kubernetes",
            key="todo-app-secrets",
        )

    def test_returns_empty_dict_on_exception(self):
        """DaprClient raises exception → returns empty dict (fail-open)."""
        from sidecar.secrets import load_secrets_from_dapr

        with patch("sidecar.secrets.DaprClient") as mock_cls:
            mock_cls.side_effect = Exception("sidecar unavailable")
            result = load_secrets_from_dapr()

        assert result == {}

    def test_logs_warning_on_exception(self, caplog):
        """DaprClient raises exception → WARNING is logged."""
        import logging
        from sidecar.secrets import load_secrets_from_dapr

        with patch("sidecar.secrets.DaprClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("connection refused")
            with caplog.at_level(logging.WARNING, logger="dapr.secrets"):
                result = load_secrets_from_dapr()

        assert result == {}
        assert any("connection refused" in r.message or "unavailable" in r.message.lower()
                   for r in caplog.records)

    def test_returns_empty_dict_on_get_secret_error(self):
        """get_secret() raises → returns empty dict."""
        from sidecar.secrets import load_secrets_from_dapr

        with patch("sidecar.secrets.DaprClient") as mock_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get_secret.side_effect = Exception("key not found")
            mock_cls.return_value = mock_client

            result = load_secrets_from_dapr()

        assert result == {}


# ---------------------------------------------------------------------------
# inject_secrets()
# ---------------------------------------------------------------------------

class TestInjectSecrets:
    def test_injects_values_into_environ(self):
        """inject_secrets with values → keys added to os.environ."""
        from sidecar.secrets import inject_secrets

        secrets = {"TEST_INJECT_KEY_A": "value_a", "TEST_INJECT_KEY_B": "value_b"}
        # Ensure keys are not already set
        for k in secrets:
            os.environ.pop(k, None)

        try:
            inject_secrets(secrets)
            assert os.environ.get("TEST_INJECT_KEY_A") == "value_a"
            assert os.environ.get("TEST_INJECT_KEY_B") == "value_b"
        finally:
            for k in secrets:
                os.environ.pop(k, None)

    def test_empty_dict_leaves_environ_unchanged(self):
        """inject_secrets with empty dict → os.environ unchanged."""
        from sidecar.secrets import inject_secrets

        before = dict(os.environ)
        inject_secrets({})
        after = dict(os.environ)
        assert before == after

    def test_skips_existing_keys(self):
        """inject_secrets does NOT overwrite keys already in os.environ."""
        from sidecar.secrets import inject_secrets

        key = "TEST_EXISTING_KEY_XYZ"
        os.environ[key] = "original_value"
        try:
            inject_secrets({key: "new_value"})
            assert os.environ[key] == "original_value"
        finally:
            os.environ.pop(key, None)

    def test_injects_only_missing_keys(self):
        """inject_secrets adds missing keys but preserves existing ones."""
        from sidecar.secrets import inject_secrets

        existing_key = "TEST_EXISTING_KEY_ABC"
        new_key = "TEST_NEW_KEY_ABC"
        os.environ[existing_key] = "keep_me"
        os.environ.pop(new_key, None)

        try:
            inject_secrets({existing_key: "overwrite_attempt", new_key: "added"})
            assert os.environ[existing_key] == "keep_me"
            assert os.environ[new_key] == "added"
        finally:
            os.environ.pop(existing_key, None)
            os.environ.pop(new_key, None)
