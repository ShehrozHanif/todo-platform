# [Task]: T004 [From]: specs/phase3-chatbot/ai-agent/spec.md §Chat Endpoint
# POST /api/{user_id}/chat — AI chat endpoint for task management.
# Stores conversation history in Conversation + Message tables.

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from agent import run_agent
from db import get_session
from middleware.auth import verify_user_access
from models import Conversation, Message

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    conversation_id: str


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

    # Store assistant response
    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
    )
    session.add(assistant_msg)

    return ChatResponse(
        response=response_text,
        conversation_id=conversation.id,
    )
