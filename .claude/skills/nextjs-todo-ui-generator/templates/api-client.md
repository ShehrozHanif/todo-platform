# API Client Template

## frontend/lib/api.ts

```typescript
// [Task]: T00X [From]: specs/phase2-web/frontend-ui/plan.md §API Client
"use client";

import { authClient } from "@/lib/auth-client";
import type { Task, TaskCreateInput, TaskUpdateInput } from "@/types/task";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get the current JWT token from Better Auth session.
 */
async function getToken(): Promise<string | null> {
  try {
    const session = await authClient.getSession();
    return session?.data?.session?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Centralized fetch wrapper that auto-attaches JWT Bearer token.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  // 204 No Content — no body to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Task API Functions ───────────────────────────────────────────

/** List all tasks for a user. */
export async function getTasks(userId: string): Promise<Task[]> {
  return apiFetch<Task[]>(`/api/${userId}/tasks`);
}

/** Create a new task. */
export async function createTask(
  userId: string,
  data: TaskCreateInput,
): Promise<Task> {
  return apiFetch<Task>(`/api/${userId}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Get a single task by ID. */
export async function getTask(userId: string, taskId: number): Promise<Task> {
  return apiFetch<Task>(`/api/${userId}/tasks/${taskId}`);
}

/** Update a task's title and/or description. */
export async function updateTask(
  userId: string,
  taskId: number,
  data: TaskUpdateInput,
): Promise<Task> {
  return apiFetch<Task>(`/api/${userId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** Delete a task. */
export async function deleteTask(userId: string, taskId: number): Promise<void> {
  return apiFetch<void>(`/api/${userId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

/** Toggle task completion status. */
export async function toggleComplete(
  userId: string,
  taskId: number,
): Promise<Task> {
  return apiFetch<Task>(`/api/${userId}/tasks/${taskId}/complete`, {
    method: "PATCH",
  });
}
```

## Key Points

- `apiFetch` — generic wrapper, handles JWT, errors, 204 responses
- `getToken()` — gets JWT from Better Auth session (not localStorage)
- All 6 functions map 1:1 to backend endpoints
- TypeScript generics ensure return types match
- Errors throw `Error` with backend's `detail` message
- `API_URL` from `NEXT_PUBLIC_API_URL` env var
- `"use client"` because it imports `authClient` which uses React context
