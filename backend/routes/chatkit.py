# [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §ChatKit Endpoint
# POST /chatkit — OpenAI ChatKit protocol endpoint.
# Bridges ChatKit frontend web component to our Agents SDK + MCP pipeline.

import os

import jwt
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse

from chatkit_server import chatkit_server, store, _generate_suggestions, _pending_task_extras
from chatkit.types import AssistantMessageItem

BETTER_AUTH_SECRET: str = os.environ.get("BETTER_AUTH_SECRET", "")
ALGORITHM = "HS256"

router = APIRouter(tags=["chatkit"])


def _extract_user_id(request: Request) -> str:
    """Extract user_id from JWT Bearer token in the request.
    ChatKit sends auth via the custom fetch function on the frontend.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    token = auth_header[7:]
    try:
        payload = jwt.decode(
            token,
            key=BETTER_AUTH_SECRET,
            algorithms=[ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return payload["sub"]
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


@router.post("/chatkit")
async def chatkit_endpoint(request: Request) -> Response:
    """Handle ChatKit protocol requests — threads, messages, streaming."""
    user_id = _extract_user_id(request)
    body = await request.body()

    result = await chatkit_server.process(body, context={"user_id": user_id})

    # StreamingResult → SSE, otherwise JSON
    if hasattr(result, "__aiter__"):
        return StreamingResponse(result, media_type="text/event-stream")
    return Response(content=result.json, media_type="application/json")


@router.get("/chatkit/suggestions/{thread_id}")
async def get_suggestions(thread_id: str, request: Request) -> dict:
    """Return smart suggestion chips and task extras for a thread."""
    user_id = _extract_user_id(request)

    # Pop task_extras for this thread (consume once so it doesn't persist)
    task_extras = _pending_task_extras.pop(thread_id, None)

    suggestions: list[str] = []
    try:
        items_page = await store.load_thread_items(
            thread_id, after=None, limit=5, order="desc",
            context={"user_id": user_id},
        )
        for item in items_page.data:
            if isinstance(item, AssistantMessageItem) and item.content:
                for part in item.content:
                    if hasattr(part, "text") and part.text:
                        suggestions = await _generate_suggestions(part.text)
                        break
                break
    except Exception:
        pass

    response: dict = {"suggestions": suggestions}
    if task_extras:
        response["task_extras"] = task_extras
    return response
