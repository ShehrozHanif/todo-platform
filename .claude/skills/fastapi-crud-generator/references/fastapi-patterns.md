# FastAPI Patterns Reference

## Router Setup

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
```

Routers are included in the app factory with a prefix:
```python
app.include_router(router, prefix="/api")
```

## Dependency Injection

FastAPI's `Depends()` is the core pattern for injecting database sessions:

```python
from backend.db import get_session

@router.get("/{user_id}/tasks")
async def list_tasks(
    user_id: str,
    session: AsyncSession = Depends(get_session),
):
    ...
```

### Path Parameters
- `user_id: str` — Better Auth string UUIDs
- `task_id: int` — Auto-increment integer PKs
- FastAPI auto-validates types from path

## Async Handler Pattern

Every handler follows this structure:

```python
@router.post("/{user_id}/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    user_id: str,
    task_data: TaskCreate,
    session: AsyncSession = Depends(get_session),
) -> TaskResponse:
    # 1. Business logic (create/query/update/delete)
    # 2. Raise HTTPException for errors
    # 3. Return response schema
    ...
```

## SQLModel Async Queries

### Select all (filtered)
```python
from sqlmodel import select

stmt = select(Task).where(Task.user_id == user_id)
result = await session.execute(stmt)
tasks = result.scalars().all()
```

### Select one by ID + user_id
```python
stmt = select(Task).where(Task.id == task_id, Task.user_id == user_id)
result = await session.execute(stmt)
task = result.scalar_one_or_none()
if not task:
    raise HTTPException(status_code=404, detail="Task not found")
```

### Insert
```python
task = Task(user_id=user_id, title=data.title, description=data.description)
session.add(task)
await session.commit()
await session.refresh(task)
```

### Update
```python
task.title = data.title or task.title
task.description = data.description or task.description
session.add(task)
await session.commit()
await session.refresh(task)
```

### Delete
```python
await session.delete(task)
await session.commit()
```

## CORSMiddleware

```python
from fastapi.middleware.cors import CORSMiddleware
import os

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## App Lifespan

FastAPI uses `lifespan` context manager for startup/shutdown:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await engine.dispose()

app = FastAPI(lifespan=lifespan)
```

## Response Model Pattern

Use `response_model` or return type annotation for auto-serialization:

```python
@router.get("/{user_id}/tasks/{task_id}")
async def get_task(...) -> TaskResponse:
    ...
    return TaskResponse.model_validate(task)
```

`model_validate()` converts SQLModel table instance to Pydantic response schema when `from_attributes = True` is set.

## Status Codes

```python
from fastapi import status

# Explicit status codes
@router.post("...", status_code=status.HTTP_201_CREATED)
@router.delete("...", status_code=status.HTTP_204_NO_CONTENT)

# Default 200 for GET, PUT, PATCH (no need to specify)
```

## Testing with httpx

```python
from httpx import ASGITransport, AsyncClient
from backend.main import app

async with AsyncClient(
    transport=ASGITransport(app=app),
    base_url="http://test",
) as client:
    response = await client.get("/api/user1/tasks")
```

### Dependency Override for Tests
```python
from backend.db import get_session

app.dependency_overrides[get_session] = override_get_session
# ... run tests ...
app.dependency_overrides.clear()
```
