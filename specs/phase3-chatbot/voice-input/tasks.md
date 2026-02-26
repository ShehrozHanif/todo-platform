# Tasks: Voice Input

**Input**: Design documents from `specs/phase3-chatbot/voice-input/`
**Prerequisites**: plan.md (required), spec.md (required)
**File**: `frontend/components/chat/ChatWindow.tsx` (single file)

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (No setup needed)

Voice input modifies an existing file only. No new project setup required.

---

## Phase 2: User Story 1+2 — Voice Capture & Toggle (Priority: P1)

**Goal**: User can click mic, speak, see transcribed text in input, and toggle listening on/off.

**Independent Test**: Open `/chat` in Chrome, click mic, speak, verify text appears.

### Implementation

- [ ] T001 [US1] Add state variables to FallbackChat: `isListening` (boolean), `speechSupported` (boolean), `recognitionRef` (ref) in `frontend/components/chat/ChatWindow.tsx`
- [ ] T002 [US1] Add `useEffect` to detect browser speech recognition support on mount and initialize `SpeechRecognition` instance with `onresult`, `onerror`, `onend` handlers in `frontend/components/chat/ChatWindow.tsx`
- [ ] T003 [US1+US2] Add `handleVoiceInput()` function that toggles `recognition.start()` / `recognition.stop()` based on `isListening` state in `frontend/components/chat/ChatWindow.tsx`
- [ ] T004 [US1] Add `useEffect` cleanup to call `recognition.stop()` on unmount in `frontend/components/chat/ChatWindow.tsx`

**Checkpoint**: Speech recognition initializes on supported browsers, toggle works, text populates input.

---

## Phase 3: User Story 3+4 — UI Button & Visual Feedback (Priority: P2)

**Goal**: Mic button renders with correct styling, hides on unsupported browsers, shows listening state.

**Independent Test**: Check Chrome (button visible), Firefox (button hidden), verify red state when listening.

### Implementation

- [ ] T005 [US3+US4] Add mic button JSX between input field and send button, conditionally rendered/disabled based on `speechSupported`, `loading`, `userId`. Listening state: red bg + stop icon. Default: gray bg + mic icon. In `frontend/components/chat/ChatWindow.tsx`
- [ ] T006 [US4] Wrap input field and buttons in a flex container with `items-center gap-2` for proper alignment in `frontend/components/chat/ChatWindow.tsx`

**Checkpoint**: Button visible in Chrome/Edge, hidden in Firefox, red when listening, gray when idle.

---

## Phase 4: Polish

- [ ] T007 Verify no console errors on Chrome, Edge, and Firefox
- [ ] T008 Verify existing chat functionality unchanged (send, receive, suggestions, typing indicator)

---

## Dependencies & Execution Order

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008
```

All tasks are sequential (same file, same component). No parallel opportunities.

## Notes

- All tasks modify ONE file: `frontend/components/chat/ChatWindow.tsx`
- No new files created
- No npm packages added
- No backend changes
- Total estimated: ~40 lines added
