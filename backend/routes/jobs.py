# [Task]: T016 [From]: specs/phase5-cloud/dapr-integration/spec.md §US2
# FastAPI route handler for Dapr Jobs API callback: POST /job/reminder-scan.
# Dapr sidecar invokes this endpoint every 5 minutes (no auth — internal only).

from fastapi import APIRouter, Depends, Response, status
from sqlmodel.ext.asyncio.session import AsyncSession

from db import get_session
from sidecar.jobs import scan_and_publish_reminders

router = APIRouter(tags=["jobs"])


@router.post("/job/reminder-scan", status_code=status.HTTP_204_NO_CONTENT)
async def handle_reminder_scan(
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Dapr Jobs callback — scan due tasks and publish reminder.triggered events."""
    await scan_and_publish_reminders(session)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
