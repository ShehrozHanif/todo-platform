# [Task]: T005 [From]: specs/phase3-chatbot/chat-ui/spec.md §ChatKit Backend
# ChatKit Python SDK server — bridges OpenAI ChatKit frontend to our
# Agents SDK + MCP tool pipeline.
# Bonus features: voice transcription (Whisper), thread history, smart suggestions, multi-language.

import json
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import AsyncIterator

import openai
from agents import Agent, Runner
from agents.mcp import MCPServerSse
from chatkit.agents import stream_agent_response, simple_to_agent_input, AgentContext
from chatkit.server import (
    AudioInput,
    ChatKitServer,
    ThreadItemDoneEvent,
    ThreadStreamEvent,
    TranscriptionResult,
)
from chatkit.store import NotFoundError, Store
from chatkit.types import (
    AssistantMessageContent,
    AssistantMessageItem,
    Attachment,
    ClientEffectEvent,
    Page,
    ThreadItem,
    ThreadMetadata,
    UserMessageItem,
)

MCP_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

_openai_client = openai.AsyncOpenAI()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# In-memory store — good enough for hackathon; threads live while process runs
# ---------------------------------------------------------------------------
class InMemoryStore(Store[dict]):
    def __init__(self) -> None:
        self.threads: dict[str, ThreadMetadata] = {}
        self.items: dict[str, list[ThreadItem]] = defaultdict(list)

    async def load_thread(self, thread_id: str, context: dict) -> ThreadMetadata:
        if thread_id not in self.threads:
            raise NotFoundError(f"Thread {thread_id} not found")
        return self.threads[thread_id]

    async def save_thread(self, thread: ThreadMetadata, context: dict) -> None:
        self.threads[thread.id] = thread

    async def load_threads(
        self, limit: int, after: str | None, order: str, context: dict
    ) -> Page[ThreadMetadata]:
        return self._paginate(
            list(self.threads.values()),
            after, limit, order,
            sort_key=lambda t: t.created_at,
            cursor_key=lambda t: t.id,
        )

    async def load_thread_items(
        self, thread_id: str, after: str | None, limit: int, order: str, context: dict
    ) -> Page[ThreadItem]:
        return self._paginate(
            self.items.get(thread_id, []),
            after, limit, order,
            sort_key=lambda i: i.created_at,
            cursor_key=lambda i: i.id,
        )

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: dict
    ) -> None:
        self.items[thread_id].append(item)

    async def save_item(
        self, thread_id: str, item: ThreadItem, context: dict
    ) -> None:
        items = self.items[thread_id]
        for idx, existing in enumerate(items):
            if existing.id == item.id:
                items[idx] = item
                return
        items.append(item)

    async def load_item(
        self, thread_id: str, item_id: str, context: dict
    ) -> ThreadItem:
        for item in self.items.get(thread_id, []):
            if item.id == item_id:
                return item
        raise NotFoundError(f"Item {item_id} not found")

    async def delete_thread(self, thread_id: str, context: dict) -> None:
        self.threads.pop(thread_id, None)
        self.items.pop(thread_id, None)

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: dict
    ) -> None:
        self.items[thread_id] = [
            i for i in self.items.get(thread_id, []) if i.id != item_id
        ]

    async def save_attachment(self, attachment: Attachment, context: dict) -> None:
        raise NotImplementedError()

    async def load_attachment(self, attachment_id: str, context: dict) -> Attachment:
        raise NotImplementedError()

    async def delete_attachment(self, attachment_id: str, context: dict) -> None:
        raise NotImplementedError()

    # -- helper ---------------------------------------------------------------
    def _paginate(
        self,
        rows: list,
        after: str | None,
        limit: int,
        order: str,
        sort_key,
        cursor_key,
    ) -> Page:
        sorted_rows = sorted(rows, key=sort_key, reverse=(order == "desc"))
        start = 0
        if after:
            for idx, row in enumerate(sorted_rows):
                if cursor_key(row) == after:
                    start = idx + 1
                    break
        data = sorted_rows[start : start + limit]
        has_more = (start + limit) < len(sorted_rows)
        next_after = cursor_key(data[-1]) if has_more and data else None
        return Page(data=data, has_more=has_more, after=next_after)


# ---------------------------------------------------------------------------
# System prompt — context awareness + multi-language + smart suggestions
# The <!--suggestions:--> markers stream as text but get parsed from the
# final ThreadItemDoneEvent and sent as a ClientEffectEvent to the frontend.
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """You are TaskFlow Assistant, an AI that helps users manage their to-do tasks.
You have access to tools that can add, list, complete, delete, and update tasks.

The current user's ID is: {user_id}
Always use this user_id when calling any tool.

Rules:
- When the user asks to add a task, use the add_task tool with the user_id and the task title.
- When the user asks to see/list their tasks, use the list_tasks tool.
- When the user asks to complete/finish/done a task, use the complete_task tool.
- When the user asks to delete/remove a task, use the delete_task tool.
- When the user asks to update/edit/rename a task, use the update_task tool.
- After performing an action, confirm what you did in a friendly, concise way.
- If the user's request is ambiguous, ask for clarification.
- For list_tasks, format the results in a readable way with task IDs.
- Keep responses short and helpful.

Context awareness:
- Use the conversation history above to resolve references and pronouns.
- If the user says "it", "that", "that one", "the first one", "the last task", etc., look at previous messages to determine what they mean.
- Always prefer resolving from context over asking for clarification.

Language:
- Always respond in the SAME language the user writes in.
- If the user writes in Urdu, respond in Urdu. If Spanish, respond in Spanish. If Arabic, respond in Arabic.
- Generate suggestion chips in the user's language too.
- If the user switches languages mid-conversation, match their latest message language.

Smart suggestions:
- After EVERY response, append exactly this format on its own line at the very end:
  <!--suggestions:["suggestion 1","suggestion 2","suggestion 3"]-->
- Generate 2-3 short, contextual follow-up suggestions based on what just happened.
- Suggestions should be natural language commands the user might want to do next.
- Examples after adding a task: <!--suggestions:["List all tasks","Add another task","Complete a task"]-->
- Examples after listing tasks: <!--suggestions:["Complete task 1","Add a new task","Delete a task"]-->
- ALWAYS include the suggestions line. Never skip it.
"""

_SUGGESTIONS_RE = re.compile(r"<!--suggestions:(\[.*?\])-->", re.DOTALL)


def _parse_suggestions(text: str) -> list[str]:
    """Extract suggestion chips from AI response text."""
    match = _SUGGESTIONS_RE.search(text)
    if not match:
        return []
    try:
        suggestions = json.loads(match.group(1))
        if not isinstance(suggestions, list):
            return []
    except (json.JSONDecodeError, ValueError):
        return []
    return [s for s in suggestions[:3] if isinstance(s, str) and s.strip()]


# ---------------------------------------------------------------------------
# ChatKit server with Agents SDK integration + bonus features
# ---------------------------------------------------------------------------
class TaskFlowChatKitServer(ChatKitServer[dict]):

    # -- Bonus 1: Voice Input (transcription via OpenAI Whisper) -------------
    async def transcribe(
        self, audio_input: AudioInput, context: dict
    ) -> TranscriptionResult:
        """Transcribe voice audio using OpenAI Whisper API.

        No language hint — Whisper auto-detects the spoken language so
        English speech → English text, Urdu speech → Urdu text, etc.
        """
        ext_map = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a"}
        ext = ext_map.get(audio_input.media_type, "webm")

        transcript = await _openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_input.data, audio_input.mime_type),
        )
        return TranscriptionResult(text=transcript.text)

    # -- Main response handler -----------------------------------------------
    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: dict,
    ) -> AsyncIterator[ThreadStreamEvent]:
        # Load conversation history from the thread
        items_page = await self.store.load_thread_items(
            thread.id, after=None, limit=50, order="asc", context=context,
        )

        # Determine user_id from context (passed from the request handler)
        user_id = context.get("user_id", "unknown")

        # Connect to MCP and run the agent
        async with MCPServerSse(
            name="todo-mcp",
            params={"url": MCP_URL},
            cache_tools_list=True,
        ) as mcp_server:
            agent = Agent(
                name="TaskFlow Assistant",
                instructions=SYSTEM_PROMPT.format(user_id=user_id),
                model=MODEL,
                mcp_servers=[mcp_server],
            )

            input_items = await simple_to_agent_input(items_page.data)
            agent_context = AgentContext(
                thread=thread, store=self.store, request_context=context,
            )
            result = Runner.run_streamed(agent, input_items, context=agent_context)
            async for event in stream_agent_response(agent_context, result):
                yield event

            # Bonus 3: Smart Suggestions — after streaming finishes, read the
            # last assistant message from the store, parse suggestion markers,
            # and emit a ClientEffectEvent so the frontend can render chips.
            try:
                final_items = await self.store.load_thread_items(
                    thread.id, after=None, limit=5, order="desc", context=context,
                )
                for item in final_items.data:
                    if isinstance(item, AssistantMessageItem) and item.content:
                        for part in item.content:
                            if hasattr(part, "text") and part.text:
                                suggestions = _parse_suggestions(part.text)
                                if suggestions:
                                    yield ClientEffectEvent(
                                        name="suggestions",
                                        data={"suggestions": suggestions},
                                    )
                        break
            except Exception:
                pass  # suggestions are non-critical


# Singleton instances
store = InMemoryStore()
chatkit_server = TaskFlowChatKitServer(store=store)
