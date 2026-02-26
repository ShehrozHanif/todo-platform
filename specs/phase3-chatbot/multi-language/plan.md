# Implementation Plan: Multi-Language

**Branch**: `master` | **Date**: 2026-02-26 | **Spec**: `specs/phase3-chatbot/multi-language/spec.md`

## Summary

Add language matching instruction to AI system prompt and RTL text direction detection to chat message bubbles. Two files modified, ~15 lines total.

## Technical Context

**Language/Version**: Python 3.13+ (backend), TypeScript (frontend)
**Primary Dependencies**: None new
**Constraints**: No new dependencies, 2 files modified

## Files Modified

```text
backend/
└── agent.py              # MODIFY: Add language matching + localized suggestions instruction

frontend/
└── components/chat/
    └── ChatWindow.tsx     # MODIFY: Add RTL detection to message bubbles + suggestion chips
```

## Implementation Details

### 1. System Prompt (agent.py)

Add language matching section:
```
Language:
- Always respond in the same language the user writes in.
- Generate suggestion chips in the user's language too.
- If the user writes in Urdu, respond in Urdu. If Spanish, respond in Spanish.
```

### 2. RTL Detection (ChatWindow.tsx)

Simple helper function:
```typescript
function isRtl(text: string): boolean {
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text.charAt(0)) || rtlRegex.test(text.charAt(1));
}
```

Apply `dir="rtl"` to message `<p>` tags when detected.
