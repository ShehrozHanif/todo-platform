# Spec: Multi-Language — Language Matching + RTL Support

**Feature:** Multi-language chat with automatic language matching and RTL rendering
**Phase:** 3 — AI Chatbot (Bonus 4)
**Spec Location:** `specs/phase3-chatbot/multi-language/`
**Status:** Draft
**Date:** 2026-02-26

---

## 1. Purpose

Enable users to chat in any language (English, Urdu, Spanish, Arabic, etc.) and have the AI respond in the same language. Add RTL text direction support for Arabic, Urdu, Hebrew, and other right-to-left languages.

## 2. Background

OpenAI's GPT-4o-mini already understands and responds in many languages natively. However:
- The system prompt doesn't explicitly instruct language matching
- Chat bubbles don't support RTL text direction
- Smart suggestion chips are always in English

## 3. In Scope

- System prompt update: "Respond in the same language the user uses"
- RTL detection for message bubbles (Arabic, Urdu, Hebrew, Farsi, etc.)
- RTL-aware suggestion chips (suggestions in user's language)
- Suggestion chip text in the user's language

## 4. Out of Scope

- Language selector dropdown
- Translation of existing UI labels (Sidebar, Topbar, etc.)
- Spell-check in non-English languages
- Language persistence across sessions

## 5. User Scenarios & Testing

### User Story 1 — Language Matching (Priority: P1)

User chats in Urdu, AI responds in Urdu. User chats in Spanish, AI responds in Spanish.

**Acceptance Scenarios**:

1. **Given** user sends "ایک ٹاسک شامل کرو جس کا نام دودھ خریدنا ہے", **When** AI responds, **Then** response is in Urdu.
2. **Given** user sends "Agregar una tarea llamada Comprar leche", **When** AI responds, **Then** response is in Spanish.
3. **Given** user switches from Urdu to English mid-conversation, **When** AI responds, **Then** response matches the latest message language.

---

### User Story 2 — RTL Text Direction (Priority: P1)

Messages in RTL languages render with correct text direction.

**Acceptance Scenarios**:

1. **Given** user sends a message in Arabic/Urdu, **When** the message bubble renders, **Then** text is right-aligned with `dir="rtl"`.
2. **Given** AI responds in Arabic/Urdu, **When** the response bubble renders, **Then** text is right-aligned with `dir="rtl"`.
3. **Given** a message in English, **When** it renders, **Then** text direction is default LTR.

---

### User Story 3 — Localized Suggestions (Priority: P2)

Suggestion chips match the language of the conversation.

**Acceptance Scenarios**:

1. **Given** user chatted in Urdu, **When** suggestion chips appear, **Then** they are in Urdu.
2. **Given** user chatted in English, **When** suggestion chips appear, **Then** they are in English.

---

### Edge Cases

- Mixed language text (English + Urdu in same message) → use dominant language direction
- Emoji-only messages → default LTR
- Numbers in RTL text → rendered correctly (native browser bidi handling)

## 6. Functional Requirements

- **FR-001**: System prompt MUST instruct AI to respond in the same language the user uses
- **FR-002**: System prompt MUST instruct AI to generate suggestion chips in the user's language
- **FR-003**: Message bubbles MUST detect RTL content and set `dir="rtl"` attribute
- **FR-004**: RTL detection MUST cover Arabic, Urdu, Hebrew, Farsi scripts
- **FR-005**: Suggestion chips MUST inherit text direction from the AI response

## 7. Technical Approach

**RTL detection**: Check first few characters of message content against Unicode RTL ranges:
- Arabic: U+0600–U+06FF
- Hebrew: U+0590–U+05FF
- Farsi/Urdu extended: U+0750–U+077F, U+FB50–U+FDFF, U+FE70–U+FEFF

## 8. Success Criteria

- **SC-001**: Chat in Urdu → AI responds in Urdu
- **SC-002**: Chat in Spanish → AI responds in Spanish
- **SC-003**: Urdu/Arabic text renders right-to-left
- **SC-004**: English text renders left-to-right
- **SC-005**: Suggestions match conversation language
