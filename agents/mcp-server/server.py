# [Task]: T003-T004 [From]: specs/phase3-chatbot/mcp-server/spec.md §Tools
# MCP Server exposing 5 task management tools for AI agents.
# Transport: SSE (for remote access from Render).
# Database: Neon PostgreSQL (same as Phase 2 web app).

import json
from typing import Optional

from mcp.server.fastmcp import FastMCP
from sqlmodel import select

from db import get_session
from models import Task, User

import os

MCP_PORT = int(os.environ.get("PORT", "8001"))

mcp = FastMCP("todo-platform", host="0.0.0.0", port=MCP_PORT)


async def _validate_user(session, user_id: str) -> User | None:
    """Check that a user exists. Returns User or None."""
    return await session.get(User, user_id)


def _task_to_dict(task: Task) -> dict:
    """Convert a Task model to a JSON-serializable dict."""
    return {
        "id": task.id,
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "completed": task.completed,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
    }


# --- Tool 1: add_task ---


@mcp.tool()
async def add_task(user_id: str, title: str, description: Optional[str] = None) -> str:
    """Create a new task for a user. Returns the created task as JSON."""
    # Validate inputs
    if not title or not title.strip():
        return json.dumps({"error": "Title is required"})
    if len(title) > 200:
        return json.dumps({"error": "Title must be 200 characters or less"})
    if description and len(description) > 1000:
        return json.dumps({"error": "Description must be 1000 characters or less"})

    async with get_session() as session:
        user = await _validate_user(session, user_id)
        if not user:
            return json.dumps({"error": "User not found"})

        task = Task(
            user_id=user_id,
            title=title.strip(),
            description=description.strip() if description else None,
        )
        session.add(task)
        await session.flush()
        await session.refresh(task)
        return json.dumps(_task_to_dict(task))


# --- Tool 2: list_tasks ---


@mcp.tool()
async def list_tasks(user_id: str) -> str:
    """Get all tasks for a user. Returns a JSON array of tasks."""
    async with get_session() as session:
        statement = select(Task).where(Task.user_id == user_id).order_by(Task.created_at.desc())
        result = await session.execute(statement)
        tasks = result.scalars().all()
        return json.dumps([_task_to_dict(t) for t in tasks])


# --- Tool 3: complete_task ---


@mcp.tool()
async def complete_task(user_id: str, task_id: int) -> str:
    """Toggle a task's completed status. Returns the updated task as JSON."""
    async with get_session() as session:
        statement = select(Task).where(Task.id == task_id, Task.user_id == user_id)
        result = await session.execute(statement)
        task = result.scalars().first()
        if not task:
            return json.dumps({"error": "Task not found"})

        task.completed = not task.completed
        session.add(task)
        await session.flush()
        await session.refresh(task)
        return json.dumps(_task_to_dict(task))


# --- Tool 4: delete_task ---


@mcp.tool()
async def delete_task(user_id: str, task_id: int) -> str:
    """Delete a task. Returns a confirmation message."""
    async with get_session() as session:
        statement = select(Task).where(Task.id == task_id, Task.user_id == user_id)
        result = await session.execute(statement)
        task = result.scalars().first()
        if not task:
            return json.dumps({"error": "Task not found"})

        await session.delete(task)
        return json.dumps({"message": "Task deleted successfully"})


# --- Tool 5: update_task ---


@mcp.tool()
async def update_task(
    user_id: str,
    task_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
) -> str:
    """Update a task's title and/or description. Returns the updated task as JSON."""
    if title is None and description is None:
        return json.dumps({"error": "Provide at least title or description to update"})
    if title is not None and not title.strip():
        return json.dumps({"error": "Title cannot be empty"})
    if title is not None and len(title) > 200:
        return json.dumps({"error": "Title must be 200 characters or less"})
    if description is not None and len(description) > 1000:
        return json.dumps({"error": "Description must be 1000 characters or less"})

    async with get_session() as session:
        statement = select(Task).where(Task.id == task_id, Task.user_id == user_id)
        result = await session.execute(statement)
        task = result.scalars().first()
        if not task:
            return json.dumps({"error": "Task not found"})

        if title is not None:
            task.title = title.strip()
        if description is not None:
            task.description = description.strip() if description else None

        session.add(task)
        await session.flush()
        await session.refresh(task)
        return json.dumps(_task_to_dict(task))


if __name__ == "__main__":
    mcp.run(transport="sse")
