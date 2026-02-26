# Spec: Smart Suggestions — AI-Generated Follow-Up Chips

**Feature:** Context-aware suggestion chips after AI responses
**Phase:** 3 — AI Chatbot (Bonus 3)
**Spec Location:** `specs/phase3-chatbot/smart-suggestions/`
**Status:** Draft
**Date:** 2026-02-26

---

## 1. Purpose

After each AI response, display 2-3 clickable suggestion chips that propose relevant follow-up actions based on what just happened and the user's task context.

## 2. Background

The chat UI currently shows static suggestions only on the empty state (greeting screen). Once a conversation starts, the user must type every message manually. Smart suggestions reduce friction by predicting the next likely action.

## 3. In Scope

- AI system prompt update to generate suggestions with every response
- Hidden suggestion marker in AI response text (HTML comment format)
- Backend parsing to extract suggestions from response and return separately
- `suggestions` field added to ChatResponse API schema
- Frontend suggestion chips rendered below AI messages
- Clicking a chip sends it as a new user message

## 4. Out of Scope

- Machine learning model for suggestion ranking
- User-customizable suggestion preferences
- Suggestion caching or pre-fetching
- Suggestions for the ChatKit mode (FallbackChat only)

## 5. User Scenarios & Testing

### User Story 1 — Suggestion Display (Priority: P1)

After the AI responds, 2-3 suggestion chips appear below the response. User clicks one and it sends as a message.

**Acceptance Scenarios**:

1. **Given** user sent "Add task Buy groceries" and AI confirmed, **When** response appears, **Then** 2-3 suggestion chips like "List all tasks", "Add another task" appear below.
2. **Given** suggestion chips are visible, **When** user clicks one, **Then** it sends as a new user message.
3. **Given** AI fails to generate suggestions, **When** response appears, **Then** no chips shown (graceful fallback).

---

### User Story 2 — Context-Aware Suggestions (Priority: P2)

Suggestions are relevant to the action just performed, not generic.

**Acceptance Scenarios**:

1. **Given** user listed tasks and has 5 tasks, **When** AI responds with the list, **Then** suggestions include actions like "Complete task 1" or "Add a new task".
2. **Given** user completed a task, **When** AI confirms, **Then** suggestions might include "List remaining tasks" or "Delete completed tasks".

---

### Edge Cases

- AI response doesn't contain suggestion marker → no chips, no error
- AI generates malformed JSON in marker → no chips, no error
- AI generates more than 3 suggestions → show only first 3
- Empty suggestion strings → filter them out

## 6. Functional Requirements

- **FR-001**: System prompt MUST instruct AI to append suggestions as `<!--suggestions:["...","..."]-->` at the end of every response
- **FR-002**: Backend MUST parse the suggestion marker from the response text and strip it before returning
- **FR-003**: Backend MUST return a `suggestions` field (list of strings) in ChatResponse
- **FR-004**: Frontend MUST render suggestion chips below the latest AI message
- **FR-005**: Clicking a chip MUST send its text as a new user message via `handleSend()`
- **FR-006**: If no suggestions are present, no chips are rendered (graceful fallback)
- **FR-007**: Stored message in DB MUST contain clean text (suggestions marker stripped)

## 7. Technical Approach

**Suggestion format in AI response:**
```
Done! I've added 'Buy groceries' to your tasks.

<!--suggestions:["List all tasks","Add another task","Complete a task"]-->
```

**Backend parses** the `<!--suggestions:[...]-->` marker via regex, extracts the JSON array, strips it from the response text, and returns both in the API response.

## 8. Success Criteria

- **SC-001**: Every AI response shows 2-3 relevant suggestion chips
- **SC-002**: Clicking a chip sends it as a message
- **SC-003**: No suggestion marker visible in the chat bubble text
- **SC-004**: Graceful fallback when AI doesn't generate suggestions
