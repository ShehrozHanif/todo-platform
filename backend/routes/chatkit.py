# [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §ChatKit Endpoint
# POST /chatkit — OpenAI ChatKit protocol endpoint.
# Bridges ChatKit frontend web component to our Agents SDK + MCP pipeline.

import os

import jwt
from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse

from chatkit_server import chatkit_server

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
