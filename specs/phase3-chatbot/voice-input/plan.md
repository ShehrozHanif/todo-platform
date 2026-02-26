# Implementation Plan: Voice Input

**Branch**: `master` | **Date**: 2026-02-26 | **Spec**: `specs/phase3-chatbot/voice-input/spec.md`

## Summary

Add a microphone button to the FallbackChat component in `ChatWindow.tsx` using the browser's built-in Web Speech API. This is a frontend-only change — no backend modifications, no new dependencies, no new files.

## Technical Context

**Language/Version**: TypeScript (Next.js 16+ / React 19)
**Primary Dependencies**: None (browser built-in Web Speech API)
**Storage**: N/A
**Testing**: Manual browser testing (Chrome, Edge, Firefox)
**Target Platform**: Modern browsers (Chrome 33+, Edge 79+)
**Project Type**: Web application (frontend only)
**Performance Goals**: Transcription appears within 2s of speech end
**Constraints**: Single file change, no npm packages, no backend changes
**Scale/Scope**: ~40 lines of code added to existing component

## Constitution Check

- Single file change: YES (smallest viable diff)
- No new dependencies: YES
- No backend changes: YES
- No security implications: YES (microphone permission handled by browser)
- Existing functionality preserved: YES

## Project Structure

### Source Code (single file touched)

```text
frontend/
└── components/
    └── chat/
        └── ChatWindow.tsx    # MODIFY: Add voice input to FallbackChat
```

No new files created. No files deleted.

## Architecture Decision

**Decision**: Use browser Web Speech API directly (not a third-party SDK)

**Why**:
- Zero cost (runs in browser, no API calls)
- Zero dependencies (built into Chrome/Edge)
- Zero backend changes needed
- Sufficient for the use case (single utterance → text)
- Graceful degradation on unsupported browsers (just hide the button)

**Rejected alternatives**:
- OpenAI Whisper API — adds cost, latency, backend endpoint, API key management
- Deepgram SDK — adds npm dependency, API key, backend proxy
- React Speech Recognition package — adds dependency for wrapping 15 lines of browser API

## Implementation Approach

### State Additions (in FallbackChat)

```typescript
const [isListening, setIsListening] = useState(false);
const [speechSupported, setSpeechSupported] = useState(false);
const recognitionRef = useRef<any>(null);
```

### Lifecycle

1. **Mount**: Check `window.SpeechRecognition || window.webkitSpeechRecognition` → set `speechSupported`
2. **If supported**: Create `SpeechRecognition` instance, attach `onresult`, `onerror`, `onend` handlers
3. **Click mic**: Toggle `recognition.start()` / `recognition.stop()`
4. **On result**: Set input text from `event.results[0][0].transcript`
5. **On end/error**: Reset `isListening` to false
6. **Unmount**: Call `recognition.stop()` cleanup

### UI Placement

```
[  input textarea  ] [🎤 mic] [➤ send]
```

- Mic button: 40x40px rounded-xl, same height as send button
- Default state: gray background, microphone icon
- Listening state: red background, stop icon
- Disabled when: loading, no userId, or speech not supported

## Complexity Tracking

No constitution violations. Single-file, ~40-line change.
