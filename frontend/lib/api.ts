// [Task]: T005 [From]: specs/phase2-web/frontend-ui/plan.md §API Client
// Centralized API client with JWT auto-attach. Never call fetch directly in components.
"use client";

import type { Task, TaskCreateInput, TaskUpdateInput } from "@/types/task";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get an HS256 JWT from our custom /api/token endpoint.
 * That endpoint verifies the Better Auth session cookie and issues
 * a JWT the FastAPI backend can verify with BETTER_AUTH_SECRET.
 */
async function getToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/token", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Centralized fetch wrapper that auto-attaches JWT Bearer token.
 */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error((error as { detail?: string }).detail || `HTTP ${response.status}`);
  }

  // 204 No Content — no body to parse
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ── Task API Functions ────────────────────────────────────────────

/** List all tasks for a user. */
export async function getTasks(userId: string): Promise<Task[]> {
  return apiFetch<Task[]>(`/api/${userId}/tasks`);
}

/** Create a new task. */
export async function createTask(userId: string, data: TaskCreateInput): Promise<Task> {
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
export async function toggleComplete(userId: string, taskId: number): Promise<Task> {
  return apiFetch<Task>(`/api/${userId}/tasks/${taskId}/complete`, {
    method: "PATCH",
  });
}
