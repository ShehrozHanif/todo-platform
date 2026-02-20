// API client — wires TaskFlow UI to FastAPI backend.
// Backend tasks are mapped to TaskFlow's Task type (priority/category/dueDate get defaults).
'use client';

import type { Task } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Shape the backend returns
interface BackendTask {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** UI-only fields that the backend doesn't store. */
interface TaskExtras {
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
  recurring?: boolean;
  reminder?: boolean;
}

const EXTRAS_PREFIX = 'taskflow-extras-';

/** Persist UI-only fields for a task in localStorage. */
export function saveTaskExtras(taskId: string, extras: TaskExtras): void {
  try {
    localStorage.setItem(`${EXTRAS_PREFIX}${taskId}`, JSON.stringify(extras));
  } catch { /* quota exceeded — silently ignore */ }
}

/** Read persisted UI-only fields for a task. */
export function getTaskExtras(taskId: string): TaskExtras {
  try {
    const raw = localStorage.getItem(`${EXTRAS_PREFIX}${taskId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Remove persisted extras when a task is deleted. */
export function removeTaskExtras(taskId: string): void {
  try { localStorage.removeItem(`${EXTRAS_PREFIX}${taskId}`); } catch { /* ignore */ }
}

/** Map a backend task to the TaskFlow Task shape, merging any stored extras. */
function mapTask(t: BackendTask): Task {
  const extras = getTaskExtras(t.id.toString());
  return {
    id: t.id.toString(),
    title: t.title,
    description: t.description ?? undefined,
    priority: (extras.priority as Task['priority']) || 'medium',
    category: extras.category || 'work',
    dueDate: extras.dueDate || undefined,
    dueTime: extras.dueTime || undefined,
    recurring: extras.recurring,
    reminder: extras.reminder,
    completed: t.completed,
    createdAt: t.created_at ?? new Date().toISOString(),
  };
}

/** Fetch an HS256 JWT from the /api/token bridge endpoint. */
async function getToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/token', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

/** Fetch wrapper that auto-attaches the JWT Bearer token. */
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error((error as { detail?: string }).detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getTasks(userId: string): Promise<Task[]> {
  const tasks = await apiFetch<BackendTask[]>(`/api/${userId}/tasks`);
  return tasks.map(mapTask);
}

export async function createTask(userId: string, data: { title: string; description?: string }): Promise<Task> {
  const task = await apiFetch<BackendTask>(`/api/${userId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapTask(task);
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: { title?: string; description?: string },
): Promise<Task> {
  const task = await apiFetch<BackendTask>(`/api/${userId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return mapTask(task);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await apiFetch<void>(`/api/${userId}/tasks/${taskId}`, { method: 'DELETE' });
}

export async function toggleComplete(userId: string, taskId: string): Promise<Task> {
  const task = await apiFetch<BackendTask>(`/api/${userId}/tasks/${taskId}/complete`, {
    method: 'PATCH',
  });
  return mapTask(task);
}
