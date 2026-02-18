---
name: todo-cli-generator
description: Generate a complete Todo CLI console app with in-memory storage, 3-layer clean architecture (models/services/cli), TDD with 70+ tests, and 90%+ coverage. Use when asked to create a todo app, task manager CLI, or in-memory CRUD console application.
disable-model-invocation: true
argument-hint: [project-directory]
---

# Todo CLI Generator — Reusable Intelligence Skill

Generate a **production-quality Todo In-Memory Console App** in Python using proven architecture, patterns, and test strategies. This skill encodes the complete intelligence from a validated implementation: 3-layer clean architecture, TDD with 70+ tests, 91% coverage, and zero defects.

## Quick Start

When invoked, generate the full Todo CLI app in `$ARGUMENTS` (or current directory if no argument).

## Architecture (3-Layer Clean Architecture)

```
src/
├── models/          # Layer 1: Data — Task dataclass + TaskStore
│   ├── __init__.py  # Exports: Task, TaskStore
│   └── task.py      # @dataclass Task + TaskStore (in-memory list)
├── services/        # Layer 2: Business Logic — TaskService
│   ├── __init__.py  # Exports: TaskService
│   └── task_service.py  # Validation, CRUD delegation, toggle
├── cli/             # Layer 3: Presentation — CLIHandler
│   ├── __init__.py  # Exports: CLIHandler
│   └── handlers.py  # Menu loop, input/output, formatting
├── __init__.py      # Package marker
└── main.py          # Entry point — wires Store→Service→CLI→run()

tests/
├── __init__.py
├── test_task_model.py    # 5 tests — Task dataclass
├── test_task_store.py    # 18 tests — TaskStore CRUD + ID behavior
├── test_task_service.py  # 20 tests — Business logic + validation
└── test_cli_handlers.py  # 27 tests — CLI flows with monkeypatch/capsys
```

**Dependency flow (strict one-way):** `main.py → CLIHandler → TaskService → TaskStore → Task`

## Implementation Steps

Execute in this exact order. Write tests FIRST (RED), then implementation (GREEN) for each phase.

### Phase 1: Project Setup
1. Run `uv init` if pyproject.toml doesn't exist
2. Add dev dependencies: `uv add --dev pytest pytest-cov`
3. Configure pyproject.toml with pytest settings (see [templates/pyproject.toml.md](templates/pyproject.toml.md))
4. Create all `__init__.py` files (src/, src/models/, src/services/, src/cli/, tests/)
5. Create `.gitignore` for Python

### Phase 2: Data Layer (models/task.py)
1. Write tests in `tests/test_task_model.py` (5 tests) — see [examples/test-patterns.md](examples/test-patterns.md)
2. Write tests in `tests/test_task_store.py` (18 tests)
3. Implement `Task` dataclass and `TaskStore` class — see [templates/data-layer.md](templates/data-layer.md)
4. Run `uv run pytest` — verify all 23 tests pass

### Phase 3: Business Logic (services/task_service.py)
1. Write tests in `tests/test_task_service.py` (20 tests)
2. Implement `TaskService` — see [templates/service-layer.md](templates/service-layer.md)
3. Run `uv run pytest` — verify 43 cumulative tests pass

### Phase 4: Presentation Layer (cli/handlers.py)
1. Write tests in `tests/test_cli_handlers.py` (27 tests)
2. Implement `CLIHandler` — see [templates/cli-layer.md](templates/cli-layer.md)
3. Run `uv run pytest` — verify all 70 tests pass

### Phase 5: Entry Point + Final Verification
1. Create `src/main.py` — wires TaskStore → TaskService → CLIHandler → run()
2. Run `uv run pytest --cov=src --cov-report=term-missing` — verify 90%+ coverage
3. Run `uv run python -m src.main` to verify interactive execution

## Key Design Decisions (Proven Patterns)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | Python list in TaskStore | Simplest in-memory structure; O(n) lookup is fine for CLI scale |
| IDs | Auto-increment, never reuse | Prevents confusion after deletion; `_next_id` counter |
| Validation | Service layer raises ValueError | Models stay pure data; CLI catches and displays |
| Not-found | Return None (not exception) | Lets CLI decide how to present "not found" |
| Update semantics | Empty string = keep existing | UX-friendly; whitespace-only title = keep existing too |
| Delete confirmation | y/n prompt, case-insensitive | Prevents accidental deletion |
| Toggle (not set) | `toggle_complete` flips bool | More intuitive for CLI than explicit set true/false |
| Test I/O | monkeypatch + capsys | pytest built-ins; no extra dependencies needed |

## Critical Invariants

- IDs start at 1, auto-increment, NEVER reuse after deletion
- `get_all()` returns a **copy** of the list (not a reference)
- Title validation: stripped, non-empty — enforced in **service** layer (not model)
- All `input()`/`print()` calls ONLY in `cli/handlers.py`
- Constructor injection: `TaskStore` → `TaskService` → `CLIHandler`

## Test Strategy Summary

- **70 total tests** across 4 files
- **monkeypatch** for `builtins.input` in CLI tests
- **capsys** for capturing print output
- **No mocks for service/store** — use real objects (they're in-memory, fast)
- **Each test class** maps to one feature/user story
- Target: **90%+ code coverage**

## Supporting Files

- For exact code templates: [templates/data-layer.md](templates/data-layer.md)
- For service layer patterns: [templates/service-layer.md](templates/service-layer.md)
- For CLI handler patterns: [templates/cli-layer.md](templates/cli-layer.md)
- For pyproject.toml config: [templates/pyproject.toml.md](templates/pyproject.toml.md)
- For complete test patterns: [examples/test-patterns.md](examples/test-patterns.md)

## Run Command

```bash
uv run python -m src.main
```
