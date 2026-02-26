# Tasks: Multi-Language

**Input**: Design documents from `specs/phase3-chatbot/multi-language/`

---

- [ ] T001 [US1+US3] Add language matching and localized suggestions instruction to system prompt in `backend/agent.py`
- [ ] T002 [US2] Add `isRtl()` helper function in `frontend/components/chat/ChatWindow.tsx` that detects RTL scripts (Arabic, Urdu, Hebrew, Farsi)
- [ ] T003 [US2] Apply `dir="rtl"` attribute to message content `<p>` tags when `isRtl()` returns true
- [ ] T004 [US2+US3] Apply `dir="rtl"` to suggestion chips container when AI response is RTL
- [ ] T005 Verify: chat in Urdu → response in Urdu with RTL direction
- [ ] T006 Verify: chat in English → response in English with LTR direction

---

## Dependencies

```
T001 (backend, independent)
T002 → T003 → T004 (frontend, sequential)
T005 + T006 (verification, depends on all above)
```
