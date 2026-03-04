# [Task]: T014 [From]: specs/phase5-cloud/dapr-integration/spec.md §US2
# RED tests for sidecar/jobs.py — register_reminder_job, scan_and_publish_reminders
# and the POST /job/reminder-scan route.

import logging
from datetime import date, timedelta
from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient
from sqlmodel import SQLModel


# ---------------------------------------------------------------------------
# Lightweight task stub (avoids SQLAlchemy session machinery)
# ---------------------------------------------------------------------------

class _Task(SQLModel):
    id: int = 1
    user_id: str = "user-abc"
    title: str = "Test Task"
    description: Optional[str] = None
    completed: bool = False
    priority: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[str] = None
    recurring: Optional[str] = None
    reminder: bool = False


def _make_task(**kwargs) -> _Task:
    return _Task(**kwargs)


# ---------------------------------------------------------------------------
# Autouse fixture: reset dedup set between tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_dedup_set() -> None:  # type: ignore[return]
    """Clear module-level _reminded_task_ids before and after each test."""
    from sidecar import jobs as jobs_mod
    jobs_mod._reminded_task_ids.clear()
    yield
    jobs_mod._reminded_task_ids.clear()


# ---------------------------------------------------------------------------
# register_reminder_job()
# ---------------------------------------------------------------------------

class TestRegisterReminderJob:
    async def test_calls_httpx_post_with_correct_url_and_schedule(self):
        """register_reminder_job() POSTs to correct Dapr Jobs API URL."""
        from sidecar.jobs import register_reminder_job

        mock_client = AsyncMock()
        with patch("sidecar.jobs.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            await register_reminder_job()

        mock_client.post.assert_called_once()
        call = mock_client.post.call_args
        url = call.args[0] if call.args else call.kwargs.get("url", "")
        assert "v1.0-alpha1/jobs/reminder-scan" in url

    async def test_job_registration_body_has_correct_schedule_and_data(self):
        """register_reminder_job() sends @every 5m schedule + data payload."""
        from sidecar.jobs import register_reminder_job

        mock_client = AsyncMock()
        with patch("sidecar.jobs.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
            await register_reminder_job()

        body = mock_client.post.call_args.kwargs.get("json", {})
        assert body["schedule"] == "@every 5m"
        assert body["data"] == {"type": "reminder_scan"}

    async def test_sidecar_unavailable_logs_warning(self, caplog):
        """Sidecar down → WARNING logged, no exception raised."""
        from sidecar.jobs import register_reminder_job

        with patch("sidecar.jobs.httpx.AsyncClient") as mock_cls:
            mock_cls.side_effect = Exception("connection refused")
            with caplog.at_level(logging.WARNING, logger="sidecar.jobs"):
                await register_reminder_job()

        assert any(
            "connection refused" in r.message or "reminder" in r.message.lower()
            for r in caplog.records
        )

    async def test_sidecar_unavailable_does_not_raise(self):
        """Sidecar down → no exception propagated to caller."""
        from sidecar.jobs import register_reminder_job

        with patch("sidecar.jobs.httpx.AsyncClient") as mock_cls:
            mock_cls.side_effect = RuntimeError("unreachable")
            # Must not raise
            await register_reminder_job()


# ---------------------------------------------------------------------------
# scan_and_publish_reminders()
# ---------------------------------------------------------------------------

class TestScanAndPublishReminders:
    def _make_session(self, tasks: list) -> AsyncMock:
        """Build an AsyncMock session whose exec().all() returns tasks synchronously."""
        mock_session = AsyncMock()
        # exec() is awaited → return_value must be a plain MagicMock so .all() is sync
        mock_result = MagicMock()
        mock_result.all.return_value = tasks
        mock_session.exec.return_value = mock_result
        return mock_session

    async def test_task_due_today_publishes_reminder(self):
        """Task with due_date == today → _publish_sync called, id added to dedup set."""
        from sidecar.jobs import scan_and_publish_reminders, _reminded_task_ids

        task = _make_task(id=10, user_id="u1", due_date=date.today(), completed=False)

        with patch("sidecar.jobs._publish_sync") as mock_pub:
            await scan_and_publish_reminders(self._make_session([task]))

        mock_pub.assert_called_once()
        assert 10 in _reminded_task_ids

    async def test_already_reminded_task_not_published_again(self):
        """Task already in _reminded_task_ids → _publish_sync NOT called."""
        from sidecar.jobs import scan_and_publish_reminders, _reminded_task_ids

        task = _make_task(id=20, user_id="u1", due_date=date.today(), completed=False)
        _reminded_task_ids.add(20)  # pre-populate dedup set

        with patch("sidecar.jobs._publish_sync") as mock_pub:
            await scan_and_publish_reminders(self._make_session([task]))

        mock_pub.assert_not_called()

    async def test_completed_task_not_published(self):
        """DB query filters completed=False; simulate empty result → not published."""
        from sidecar.jobs import scan_and_publish_reminders

        with patch("sidecar.jobs._publish_sync") as mock_pub:
            await scan_and_publish_reminders(self._make_session([]))

        mock_pub.assert_not_called()

    async def test_task_due_more_than_24h_away_not_published(self):
        """DB query filters due_date <= cutoff; simulate empty result → not published."""
        from sidecar.jobs import scan_and_publish_reminders

        with patch("sidecar.jobs._publish_sync") as mock_pub:
            await scan_and_publish_reminders(self._make_session([]))

        mock_pub.assert_not_called()

    async def test_publish_uses_reminders_topic(self):
        """_publish_sync is called with topic='reminders'."""
        from sidecar.jobs import scan_and_publish_reminders

        task = _make_task(id=30, user_id="u2", due_date=date.today(), completed=False)

        with patch("sidecar.jobs._publish_sync") as mock_pub:
            await scan_and_publish_reminders(self._make_session([task]))

        assert mock_pub.call_args.args[1] == "reminders"

    async def test_multiple_tasks_all_published(self):
        """Multiple qualifying tasks → _publish_sync called once per task."""
        from sidecar.jobs import scan_and_publish_reminders

        tasks = [
            _make_task(id=40, user_id="u1", due_date=date.today()),
            _make_task(id=41, user_id="u2", due_date=date.today()),
        ]

        with patch("sidecar.jobs._publish_sync") as mock_pub:
            await scan_and_publish_reminders(self._make_session(tasks))

        assert mock_pub.call_count == 2


# ---------------------------------------------------------------------------
# POST /job/reminder-scan route
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_job_endpoint_returns_204(client: AsyncClient) -> None:
    """POST /job/reminder-scan returns 204 No Content."""
    with patch("routes.jobs.scan_and_publish_reminders", new_callable=AsyncMock):
        resp = await client.post("/job/reminder-scan")
    assert resp.status_code == 204
