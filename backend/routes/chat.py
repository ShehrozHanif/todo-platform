# [Task]: T004 [From]: specs/phase3-chatbot/ai-agent/spec.md §Chat Endpoint
# [Task]: T002-T003 [From]: specs/phase3-chatbot/conversation-memory/spec.md §History Endpoint
# [Task]: T002-T004 [From]: specs/phase3-chatbot/smart-suggestions/spec.md §Suggestion Parsing
# POST /api/{user_id}/chat — AI chat endpoint for task management.
# GET /api/{user_id}/chat/history — Retrieve conversation history.
# Stores conversation history in Conversation + Message tables.

import json
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from agent import run_agent
from db import get_session
from middleware.auth import verify_user_access
from models import Conversation, Message

router = APIRouter(tags=["chat"])

# Regex to extract <!--suggestions:["...","..."]--> from AI response
_SUGGESTIONS_RE = re.compile(r"<!--suggestions:(\[.*?\])-->", re.DOTALL)


def parse_suggestions(text: str) -> tuple[str, list[str]]:
    """Extract suggestion chips from AI response and return clean text + suggestions."""
    match = _SUGGESTIONS_RE.search(text)
    if not match:
        return text, []
    try:
        suggestions = json.loads(match.group(1))
        if not isinstance(suggestions, list):
            return text, []
    except (json.JSONDecodeError, ValueError):
        return text, []
    clean_text = _SUGGESTIONS_RE.sub("", text).rstrip()
    return clean_text, [s for s in suggestions[:3] if isinstance(s, str) and s.strip()]


class ChatRequest(BaseModel):
    message: str
    new_conversation: bool = False


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    suggestions: list[str] = []


class ChatMessageItem(BaseModel):
    role: str
    content: str
    timestamp: str


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageItem]
    conversation_id: Optional[str] = None


@router.get(
    "/{user_id}/chat/history",
    response_model=ChatHistoryResponse,
    dependencies=[Depends(verify_user_access)],
)
async def get_chat_history(
    user_id: str,
    session: AsyncSession = Depends(get_session),
) -> ChatHistoryResponse:
    """Retrieve the latest conversation history for a user."""
    # Find latest conversation
    result = await session.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )
    conversation = result.scalars().first()

    if not conversation:
        return ChatHistoryResponse(messages=[], conversation_id=None)

    # Load last 20 messages
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    items = [
        ChatMessageItem(
            role=m.role,
            content=m.content,
            timestamp=m.created_at.isoformat() if m.created_at else "",
        )
        for m in messages[-20:]
    ]

    return ChatHistoryResponse(messages=items, conversation_id=conversation.id)


@router.post(
    "/{user_id}/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_user_access)],
)
async def chat(
    user_id: str,
    body: ChatRequest,
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    """Send a message to the AI agent and get a response."""
    if not body.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty",
        )

    # Find or create conversation for this user
    conversation = None
    if not body.new_conversation:
        result = await session.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
        )
        conversation = result.scalars().first()

    if not conversation:
        conversation = Conversation(user_id=user_id)
        session.add(conversation)
        await session.flush()

    # Load conversation history (last 20 messages for context window)
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()
    history = [{"role": m.role, "content": m.content} for m in messages[-20:]]

    # Store user message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=body.message.strip(),
    )
    session.add(user_msg)
    await session.flush()

    # Run AI agent
    try:
        response_text = await run_agent(user_id, body.message.strip(), history)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent error: {str(e)}",
        )

    # Parse suggestions from AI response and strip marker
    clean_response, suggestions = parse_suggestions(response_text)

    # Store assistant response (clean text, no suggestion marker)
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=clean_response,
    )
    session.add(assistant_msg)

    return ChatResponse(
        response=clean_response,
        conversation_id=conversation.id,
        suggestions=suggestions,
    )
