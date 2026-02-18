# pyproject.toml Template

```toml
[project]
name = "phase-1"
version = "0.1.0"
description = "Todo In-Memory Console App"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []

[dependency-groups]
dev = [
    "pytest>=9.0.2",
    "pytest-cov>=7.0.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

## Key Configuration Notes

- `pythonpath = ["."]` — Critical for `from src.xxx import` to work in tests
- `testpaths = ["tests"]` — pytest discovers tests only in the tests/ directory
- No runtime dependencies — stdlib only
- Dev dependencies: pytest + pytest-cov for TDD workflow
- Run app: `uv run python -m src.main`
- Run tests: `uv run pytest`
- Run coverage: `uv run pytest --cov=src --cov-report=term-missing`

## .gitignore Template

```gitignore
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
dist/
build/
.venv/
.env
.pytest_cache/
.coverage
htmlcov/
*.egg
.mypy_cache/
```
