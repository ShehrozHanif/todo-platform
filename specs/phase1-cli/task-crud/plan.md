# Implementation Plan: Task CRUD CLI

**Branch**: `phase1/task-crud` | **Date**: 2026-02-18 | **Spec**: specs/phase1-cli/task-crud/spec.md
**Input**: Feature specification from `specs/phase1-cli/task-crud/spec.md`

## Summary

Build an in-memory Python console todo app with 5 CRUD operations using 3-layer clean architecture (models/services/cli), TDD with 70+ tests, and 90%+ coverage.

## Technical Context

**Language/Version**: Python 3.13+ with UV package manager
**Primary Dependencies**: None (stdlib only); dev: pytest, pytest-cov
**Storage**: In-memory Python list (no persistence)
**Testing**: pytest + pytest-cov (TDD: Red → Green → Refactor)
**Target Platform**: CLI console application
**Project Type**: Single project
**Constraints**: No external runtime dependencies; all I/O in CLI layer only

## Constitution Check

- [x] SDD cycle followed (spec → plan → tasks → implement)
- [x] TDD mandatory — tests written before implementation
- [x] Type hints on all functions
- [x] No hardcoded secrets (N/A for Phase 1)
- [x] Clean architecture — strict one-way dependencies

## Project Structure

### Documentation (this feature)

```text
specs/phase1-cli/task-crud/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown
```

### Source Code

```text
src/
├── __init__.py
├── models/
│   ├── __init__.py      # Exports: Task, TaskStore
│   └── task.py          # Task dataclass + TaskStore class
├── services/
│   ├── __init__.py      # Exports: TaskService
│   └── task_service.py  # Business logic, validation, CRUD delegation
├── cli/
│   ├── __init__.py      # Exports: CLIHandler
│   └── handlers.py      # Menu loop, input/output, formatting
└── main.py              # Entry point: wires Store → Service → CLI → run()

tests/
├── __init__.py
├── test_task_model.py       # 5 tests — Task dataclass
├── test_task_store.py       # 18 tests — TaskStore CRUD + ID behavior
├── test_task_service.py     # 20 tests — Business logic + validation
└── test_cli_handlers.py     # 27 tests — CLI flows with monkeypatch/capsys
```

**Structure Decision**: Single project layout. `src/` contains three sub-packages following the 3-layer architecture. Dependency flow is strictly one-way: `main.py → CLIHandler → TaskService → TaskStore → Task`.

## Implementation Phases

### Phase 1: Project Setup
- Initialize UV project, add dev dependencies
- Create directory structure with all `__init__.py` files
- Configure pyproject.toml with pytest settings

### Phase 2: Data Layer (TDD)
- RED: Write 23 tests (5 model + 18 store)
- GREEN: Implement Task dataclass + TaskStore
- Verify all 23 tests pass

### Phase 3: Service Layer (TDD)
- RED: Write 20 tests for TaskService
- GREEN: Implement TaskService with validation
- Verify 43 cumulative tests pass

### Phase 4: CLI Layer (TDD)
- RED: Write 27 tests for CLIHandler
- GREEN: Implement CLIHandler with menu loop
- Verify all 70 tests pass

### Phase 5: Entry Point + Verification
- Create main.py wiring
- Run full coverage report (target 90%+)
- Manual smoke test via `uv run python -m src.main`

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | Python list in TaskStore | Simplest in-memory; O(n) lookup fine for CLI scale |
| IDs | Auto-increment, never reuse | Prevents confusion after deletion |
| Validation | Service layer raises ValueError | Models stay pure data; CLI catches and displays |
| Not-found | Return None (not exception) | Lets CLI decide presentation |
| Update semantics | Empty string = keep existing | UX-friendly |
| Delete confirmation | y/n prompt | Prevents accidental deletion |
| Toggle (not set) | `toggle_complete` flips bool | More intuitive for CLI |
| Test I/O | monkeypatch + capsys | pytest built-ins, no extra deps |
