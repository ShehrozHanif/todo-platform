# Spec: Voice Input — Browser Speech-to-Text for Chat

**Feature:** Voice input for chat via Web Speech API
**Phase:** 3 — AI Chatbot (Bonus 1)
**Spec Location:** `specs/phase3-chatbot/voice-input/`
**Status:** Draft
**Date:** 2026-02-26

---

## 1. Purpose

Add a microphone button to the FallbackChat component that allows users to dictate chat messages using their voice instead of typing. Uses the browser's built-in Web Speech API — zero external dependencies, zero cost.

## 2. Background

Phase 3 base features (MCP Server, AI Agent, Chat UI) are complete and deployed. The FallbackChat component in `frontend/components/chat/ChatWindow.tsx` currently only supports typed text input. Voice input is the first bonus feature — a frontend-only enhancement that adds accessibility and convenience.

## 3. In Scope

- Microphone button next to the send button in FallbackChat
- Browser Web Speech API integration (`SpeechRecognition` / `webkitSpeechRecognition`)
- Visual feedback when listening (button color change, icon swap)
- Transcribed text populates the input field
- Toggle behavior: click to start, click again to stop
- Graceful fallback: hide mic button if browser doesn't support speech API
- Cleanup on component unmount

## 4. Out of Scope

- Third-party speech APIs (Deepgram, Whisper, Google Cloud Speech)
- Continuous listening mode (multi-sentence dictation)
- Interim/partial results display
- Custom language selector for speech (uses browser default)
- Voice output / text-to-speech for AI responses
- ChatKit mode voice support (only FallbackChat)

## 5. User Scenarios & Testing

### User Story 1 — Voice Message (Priority: P1)

User clicks the microphone button, speaks a command like "Add a task called Buy groceries", and the transcribed text is placed in the input field ready to send.

**Why this priority**: Core functionality — the entire feature is this interaction.

**Independent Test**: Open chat page in Chrome/Edge, click mic, speak, verify text appears in input.

**Acceptance Scenarios**:

1. **Given** the chat page is loaded in a supported browser, **When** user clicks the mic button, **Then** the browser requests microphone permission and begins listening.
2. **Given** the mic is actively listening, **When** user speaks a phrase, **Then** the transcribed text populates the input textarea.
3. **Given** text has been transcribed into the input, **When** user clicks send (or presses Enter), **Then** the message is sent normally.

---

### User Story 2 — Stop Listening (Priority: P1)

User can stop listening by clicking the mic button again, or listening stops automatically after a silence timeout.

**Why this priority**: Essential for usability — users must be able to cancel.

**Independent Test**: Click mic to start, click again to stop, verify listening stops.

**Acceptance Scenarios**:

1. **Given** the mic is listening, **When** user clicks the mic button again, **Then** listening stops and the button returns to default state.
2. **Given** the mic is listening, **When** there is a silence timeout (browser default), **Then** listening stops automatically and `onend` fires.

---

### User Story 3 — Graceful Fallback (Priority: P2)

On browsers that don't support the Web Speech API (Firefox, Safari), the mic button is hidden entirely — no errors, no broken UI.

**Why this priority**: Prevents broken UX on unsupported browsers.

**Independent Test**: Open chat in Firefox, verify mic button is not visible.

**Acceptance Scenarios**:

1. **Given** a browser without `SpeechRecognition` or `webkitSpeechRecognition`, **When** the chat page loads, **Then** the mic button is not rendered.
2. **Given** a browser with speech support, **When** the chat page loads, **Then** the mic button is visible and enabled.

---

### User Story 4 — Visual Feedback (Priority: P2)

The mic button changes appearance when actively listening so the user knows the browser is recording.

**Why this priority**: Without visual feedback, users can't tell if it's working.

**Acceptance Scenarios**:

1. **Given** the mic is not listening, **When** user views the chat input area, **Then** the mic button shows a microphone icon with neutral/gray styling.
2. **Given** the mic is actively listening, **When** user views the chat input area, **Then** the mic button shows a stop icon with red background.

---

### Edge Cases

- Browser denies microphone permission → `onerror` fires with "not-allowed", `isListening` resets to false
- Speech recognition error (network, no-speech) → `onerror` logs error, button resets
- User navigates away while listening → `useEffect` cleanup calls `recognition.stop()`
- User clicks mic while a message is loading → button is disabled (same as send button)
- Multiple rapid clicks → only one recognition session active at a time

## 6. Functional Requirements

- **FR-001**: System MUST detect browser speech recognition support on component mount
- **FR-002**: System MUST show mic button only when `SpeechRecognition` or `webkitSpeechRecognition` is available
- **FR-003**: System MUST toggle listening state on mic button click
- **FR-004**: System MUST populate input textarea with transcribed text from `onresult` event
- **FR-005**: System MUST reset `isListening` state on `onend` and `onerror` events
- **FR-006**: System MUST disable mic button when `loading` is true or `userId` is null
- **FR-007**: System MUST clean up recognition instance on component unmount
- **FR-008**: Mic button MUST be positioned between the input field and the send button

## 7. Technical Constraints

- **Browser API only** — `window.SpeechRecognition` or `window.webkitSpeechRecognition`
- **No external dependencies** — zero npm packages added
- **Single file change** — `frontend/components/chat/ChatWindow.tsx` only
- **No backend changes** — transcribed text uses existing `handleSend()` flow

## 8. Success Criteria

- **SC-001**: Mic button visible in Chrome and Edge
- **SC-002**: Click mic → speak → text appears in input within 2 seconds of finishing speech
- **SC-003**: Mic button hidden in Firefox (no Web Speech API support)
- **SC-004**: No console errors on any browser
- **SC-005**: Existing chat functionality unchanged (send, receive, suggestions all still work)
