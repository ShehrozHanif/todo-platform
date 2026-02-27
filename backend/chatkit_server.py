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
# System prompt — context awareness + multi-language
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
- If the user switches languages mid-conversation, match their latest message language.
"""

# ---------------------------------------------------------------------------
# Smart suggestions — generated via a separate fast API call (never in chat)
# ---------------------------------------------------------------------------
_SUGGEST_PROMPT = """Based on this assistant response, generate 2-3 short follow-up suggestions the user might want to do next.
Return ONLY a JSON array of strings, nothing else. Example: ["List all tasks","Add a new task","Delete a task"]
Keep suggestions short (under 6 words each). Match the language of the assistant response.

Assistant response:
{response_text}"""


async def _generate_suggestions(response_text: str) -> list[str]:
    """Call a fast model to generate contextual suggestion chips."""
    try:
        result = await _openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": _SUGGEST_PROMPT.format(
                response_text=response_text[:500],
            )}],
            max_tokens=100,
            temperature=0.7,
        )
        raw = result.choices[0].message.content or ""
        suggestions = json.loads(raw.strip())
        if isinstance(suggestions, list):
            return [s for s in suggestions[:3] if isinstance(s, str) and s.strip()]
    except Exception:
        pass
    return []


# ---------------------------------------------------------------------------
# Devanagari → Urdu script transliteration (handles mixed English+Urdu text)
# ---------------------------------------------------------------------------
# Nukta combinations (must be checked before single consonants)
_DEVA_NUKTA: dict[str, str] = {
    "\u0915\u093C": "\u0642",   # क़ → ق
    "\u0916\u093C": "\u062E",   # ख़ → خ
    "\u0917\u093C": "\u063A",   # ग़ → غ
    "\u091C\u093C": "\u0632",   # ज़ → ز
    "\u0921\u093C": "\u0691",   # ड़ → ڑ
    "\u0922\u093C": "\u0691\u06BE",  # ढ़ → ڑھ
    "\u092B\u093C": "\u0641",   # फ़ → ف
}

# Consonants
_DEVA_CONSONANTS: dict[str, str] = {
    "\u0915": "\u06A9",   # क → ک
    "\u0916": "\u06A9\u06BE",  # ख → کھ
    "\u0917": "\u06AF",   # ग → گ
    "\u0918": "\u06AF\u06BE",  # घ → گھ
    "\u0919": "\u0646\u06AF",  # ङ → نگ
    "\u091A": "\u0686",   # च → چ
    "\u091B": "\u0686\u06BE",  # छ → چھ
    "\u091C": "\u062C",   # ज → ج
    "\u091D": "\u062C\u06BE",  # झ → جھ
    "\u091E": "\u0646",   # ञ → ن
    "\u091F": "\u0679",   # ट → ٹ
    "\u0920": "\u0679\u06BE",  # ठ → ٹھ
    "\u0921": "\u0688",   # ड → ڈ
    "\u0922": "\u0688\u06BE",  # ढ → ڈھ
    "\u0923": "\u0646",   # ण → ن
    "\u0924": "\u062A",   # त → ت
    "\u0925": "\u062A\u06BE",  # थ → تھ
    "\u0926": "\u062F",   # द → د
    "\u0927": "\u062F\u06BE",  # ध → دھ
    "\u0928": "\u0646",   # न → ن
    "\u092A": "\u067E",   # प → پ
    "\u092B": "\u0641",   # फ → ف
    "\u092C": "\u0628",   # ब → ب
    "\u092D": "\u0628\u06BE",  # भ → بھ
    "\u092E": "\u0645",   # म → م
    "\u092F": "\u06CC",   # य → ی
    "\u0930": "\u0631",   # र → ر
    "\u0932": "\u0644",   # ल → ل
    "\u0935": "\u0648",   # व → و
    "\u0936": "\u0634",   # श → ش
    "\u0937": "\u0634",   # ष → ش
    "\u0938": "\u0633",   # स → س
    "\u0939": "\u06C1",   # ह → ہ
}

# Independent vowels (word-initial)
_DEVA_VOWELS: dict[str, str] = {
    "\u0905": "\u0627",         # अ → ا
    "\u0906": "\u0622",         # आ → آ
    "\u0907": "\u0627",         # इ → ا
    "\u0908": "\u0627\u06CC",   # ई → ای
    "\u0909": "\u0627",         # उ → ا
    "\u090A": "\u0627\u0648",   # ऊ → او
    "\u090F": "\u06D2",         # ए → ے
    "\u0910": "\u0627\u06CC",   # ऐ → ای
    "\u0913": "\u0627\u0648",   # ओ → او
    "\u0914": "\u0627\u0648",   # औ → او
    "\u0911": "\u0622",         # ऑ → آ
}

# Vowel matras (after consonants)
_DEVA_MATRAS: dict[str, str] = {
    "\u093E": "\u0627",   # ा → ا (aa)
    "\u093F": "",          # ि → (short i, often omitted)
    "\u0940": "\u06CC",   # ी → ی (ee)
    "\u0941": "",          # ु → (short u, often omitted)
    "\u0942": "\u0648",   # ू → و (oo)
    "\u0947": "\u06D2",   # े → ے (e)
    "\u0948": "\u06CC",   # ै → ی (ai)
    "\u094B": "\u0648",   # ो → و (o)
    "\u094C": "\u0648",   # ौ → و (au)
    "\u0949": "\u0627",   # ॉ → ا
}

# Other marks
_DEVA_MARKS: dict[str, str] = {
    "\u094D": "",          # ् virama — suppresses inherent vowel
    "\u0902": "\u06BA",   # ं anusvara → ں
    "\u0901": "\u06BA",   # ँ chandrabindu → ں
    "\u0903": "",          # ः visarga
    "\u093C": "",          # ़ nukta (handled above in pairs)
}


def _devanagari_to_urdu(text: str) -> str:
    """Convert Devanagari script to Urdu in-place, keeping Latin text as-is."""
    result: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]

        # Check two-char nukta combinations first
        if i + 1 < n:
            pair = text[i : i + 2]
            if pair in _DEVA_NUKTA:
                result.append(_DEVA_NUKTA[pair])
                i += 2
                continue

        # Independent vowels
        if ch in _DEVA_VOWELS:
            result.append(_DEVA_VOWELS[ch])
            i += 1
            continue

        # Consonants
        if ch in _DEVA_CONSONANTS:
            result.append(_DEVA_CONSONANTS[ch])
            i += 1
            # Check for following virama or matra
            if i < n and text[i] == "\u094D":
                # Virama: suppress inherent vowel, skip it
                i += 1
            elif i < n and text[i] in _DEVA_MATRAS:
                result.append(_DEVA_MATRAS[text[i]])
                i += 1
            # else: inherent 'a' — no extra character needed in Urdu
            continue

        # Matras (standalone, shouldn't happen but be safe)
        if ch in _DEVA_MATRAS:
            result.append(_DEVA_MATRAS[ch])
            i += 1
            continue

        # Other Devanagari marks
        if ch in _DEVA_MARKS:
            result.append(_DEVA_MARKS[ch])
            i += 1
            continue

        # Everything else (Latin, spaces, punctuation) — pass through
        result.append(ch)
        i += 1

    return "".join(result)


# ---------------------------------------------------------------------------
# ChatKit server with Agents SDK integration + bonus features
# ---------------------------------------------------------------------------
class TaskFlowChatKitServer(ChatKitServer[dict]):

    # -- Bonus 1: Voice Input (transcription via OpenAI Whisper) -------------
    async def transcribe(
        self, audio_input: AudioInput, context: dict
    ) -> TranscriptionResult:
        """Transcribe voice audio using OpenAI Whisper API.

        Whisper auto-detects language.  If the result contains Devanagari
        (Hindi script), we transliterate those characters to Urdu script
        in-place — English words stay as English.
        """
        ext_map = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a"}
        ext = ext_map.get(audio_input.media_type, "webm")

        transcript = await _openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=(f"audio.{ext}", audio_input.data, audio_input.mime_type),
        )
        text = transcript.text

        # Transliterate any Devanagari (Hindi) portions to Urdu script
        if any("\u0900" <= ch <= "\u097F" for ch in text):
            text = _devanagari_to_urdu(text)

        return TranscriptionResult(text=text)

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
            # last assistant message, generate suggestions via a separate fast
            # API call, and emit a ClientEffectEvent for the frontend chips.
            try:
                final_items = await self.store.load_thread_items(
                    thread.id, after=None, limit=5, order="desc", context=context,
                )
                for item in final_items.data:
                    if isinstance(item, AssistantMessageItem) and item.content:
                        for part in item.content:
                            if hasattr(part, "text") and part.text:
                                suggestions = await _generate_suggestions(part.text)
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
