# Tasks: Task CRUD CLI

**Input**: Design documents from `specs/phase1-cli/task-crud/`
**Prerequisites**: plan.md (required), spec.md (required)

## Phase 1: Setup

- [ ] T001 Initialize UV project with `uv init`, configure pyproject.toml with pytest settings
- [ ] T002 [P] Create directory structure: src/, src/models/, src/services/, src/cli/, tests/ with __init__.py files
- [ ] T003 [P] Create .gitignore for Python

**Checkpoint**: Project skeleton ready, `uv run pytest` runs (0 tests collected)

---

## Phase 2: Data Layer (models/task.py)

### Tests FIRST (RED)

- [ ] T004 [P] Write test_task_model.py — 5 tests for Task dataclass (creation, defaults, field access)
- [ ] T005 [P] Write test_task_store.py — 18 tests for TaskStore (add, get_by_id, get_all, update, delete, ID behavior)

### Implementation (GREEN)

- [ ] T006 Implement Task dataclass in src/models/task.py (id, title, description, completed)
- [ ] T007 Implement TaskStore class in src/models/task.py (add, get_by_id, get_all, update, delete)
- [ ] T008 Create src/models/__init__.py with exports (Task, TaskStore)

**Checkpoint**: `uv run pytest` — 23 tests pass (5 model + 18 store)

---

## Phase 3: Service Layer (services/task_service.py)

### Tests FIRST (RED)

- [ ] T009 Write test_task_service.py — 20 tests (add validation, get_all, toggle, update semantics, delete)

### Implementation (GREEN)

- [ ] T010 Implement TaskService in src/services/task_service.py (add_task, get_all_tasks, get_task, update_task, delete_task, toggle_complete)
- [ ] T011 Create src/services/__init__.py with exports (TaskService)

**Checkpoint**: `uv run pytest` — 43 cumulative tests pass

---

## Phase 4: CLI Layer (cli/handlers.py)

### Tests FIRST (RED)

- [ ] T012 Write test_cli_handlers.py — 27 tests (menu display, run loop, add, view, update, delete, mark complete)

### Implementation (GREEN)

- [ ] T013 Implement CLIHandler in src/cli/handlers.py (display_menu, run, handle_add, handle_view, handle_update, handle_delete, handle_mark_complete)
- [ ] T014 Create src/cli/__init__.py with exports (CLIHandler)

**Checkpoint**: `uv run pytest` — all 70 tests pass

---

## Phase 5: Entry Point + Final Verification

- [ ] T015 Create src/main.py — wire TaskStore → TaskService → CLIHandler → run()
- [ ] T016 Run `uv run pytest --cov=src --cov-report=term-missing` — verify 90%+ coverage
- [ ] T017 Manual smoke test: `uv run python -m src.main` — verify interactive CLI works

**Checkpoint**: All 70 tests pass, 90%+ coverage, CLI app runs interactively

---

## Dependencies & Execution Order

- **Phase 1** (T001-T003): No dependencies — start immediately
- **Phase 2** (T004-T008): Depends on Phase 1 completion
- **Phase 3** (T009-T011): Depends on Phase 2 (imports TaskStore)
- **Phase 4** (T012-T014): Depends on Phase 3 (imports TaskService)
- **Phase 5** (T015-T017): Depends on Phase 4 (imports all layers)

### Within each phase: Tests MUST be written FIRST and FAIL before implementation begins.
