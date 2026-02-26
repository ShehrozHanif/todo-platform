# Implementation Plan: Smart Suggestions

**Branch**: `master` | **Date**: 2026-02-26 | **Spec**: `specs/phase3-chatbot/smart-suggestions/spec.md`

## Summary

Add AI-generated follow-up suggestion chips after every AI response. The AI appends a hidden marker with suggestions, the backend parses and strips it, and the frontend renders clickable chips.

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript (frontend)
**Primary Dependencies**: re (Python stdlib), existing FastAPI + React
**Storage**: N/A (suggestions are transient, not persisted)
**Constraints**: No new dependencies, 3 files modified

## Architecture

```
AI Response: "Done! I've added 'Buy milk'.\n\n<!--suggestions:["List tasks","Add another"]-->"
    ↓
Backend (chat.py): regex parse → strip marker → return {response: "Done!...", suggestions: ["List tasks","Add another"]}
    ↓
Frontend (ChatWindow.tsx): render chips below AI message → click sends as new message
```

## Files Modified

```text
backend/
├── agent.py              # MODIFY: Add suggestion instruction to system prompt
└── routes/chat.py        # MODIFY: Parse suggestions, add to ChatResponse

frontend/
├── lib/api.ts            # MODIFY: Add suggestions to ChatResponse type
└── components/chat/
    └── ChatWindow.tsx     # MODIFY: Render suggestion chips, handle click
```

## Implementation Details

### 1. System Prompt (agent.py)
Add instruction:
```
After EVERY response, append exactly this format on a new line:
<!--suggestions:["suggestion 1","suggestion 2","suggestion 3"]-->
Generate 2-3 contextual follow-up suggestions based on what just happened.
```

### 2. Backend Parsing (chat.py)
```python
import re, json

SUGGESTIONS_RE = re.compile(r'<!--suggestions:(\[.*?\])-->', re.DOTALL)

def parse_suggestions(text: str) -> tuple[str, list[str]]:
    match = SUGGESTIONS_RE.search(text)
    if not match:
        return text, []
    try:
        suggestions = json.loads(match.group(1))
    except json.JSONDecodeError:
        return text, []
    clean_text = SUGGESTIONS_RE.sub('', text).rstrip()
    return clean_text, suggestions[:3]
```

### 3. ChatResponse Schema (chat.py)
Add `suggestions: list[str] = []` to existing ChatResponse.

### 4. Frontend Chips (ChatWindow.tsx)
Store suggestions on the latest AI message. Render as clickable buttons below the message bubble.
