// API client — wires TaskFlow UI to FastAPI backend.
// Phase 5: All fields stored in backend DB — no localStorage.
'use client';

import type { Task } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Shape the backend returns (Phase 5: includes all advanced fields)
interface BackendTask {
  id: number;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string | null;
  category: string | null;
  tags: string[] | null;
  due_date: string | null;
  due_time: string | null;
  recurring: string | null;
  reminder: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Map a backend task to the TaskFlow Task shape. */
function mapTask(t: BackendTask): Task {
  return {
    id: t.id.toString(),
    title: t.title,
    description: t.description ?? undefined,
    priority: (t.priority as Task['priority']) || 'medium',
    category: t.category || 'work',
    dueDate: t.due_date ?? undefined,
    dueTime: t.due_time ?? undefined,
    recurring: t.recurring ?? undefined,
    reminder: t.reminder ?? undefined,
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

export interface TaskQueryParams {
  search?: string;
  priority?: string;
  category?: string;
  completed?: boolean;
  tags?: string;
  due_date_from?: string;
  due_date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function getTasks(userId: string, params?: TaskQueryParams): Promise<Task[]> {
  let path = `/api/${userId}/tasks`;
  if (params) {
    const qs = new URLSearchParams();
    if (params.search)        qs.set('search', params.search);
    if (params.priority)      qs.set('priority', params.priority);
    if (params.category)      qs.set('category', params.category);
    if (params.completed !== undefined) qs.set('completed', String(params.completed));
    if (params.tags)          qs.set('tags', params.tags);
    if (params.due_date_from) qs.set('due_date_from', params.due_date_from);
    if (params.due_date_to)   qs.set('due_date_to', params.due_date_to);
    if (params.sort)          qs.set('sort', params.sort);
    if (params.order)         qs.set('order', params.order);
    const qstr = qs.toString();
    if (qstr) path = `${path}?${qstr}`;
  }
  const tasks = await apiFetch<BackendTask[]>(path);
  return tasks.map(mapTask);
}

export async function createTask(
  userId: string,
  data: {
    title: string;
    description?: string;
    priority?: string;
    category?: string;
    tags?: string[];
    due_date?: string;
    due_time?: string;
    recurring?: string;
    reminder?: boolean;
  },
): Promise<Task> {
  const task = await apiFetch<BackendTask>(`/api/${userId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return mapTask(task);
}

export async function updateTask(
  userId: string,
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: string;
    category?: string;
    tags?: string[];
    due_date?: string;
    due_time?: string;
    recurring?: string;
    reminder?: boolean;
  },
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

// ── Chat API ──────────────────────────────────────────

interface ChatResponse {
  response: string;
  conversation_id: string;
  suggestions?: string[];
}

export async function sendChatMessage(
  userId: string,
  message: string,
  newConversation = false,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/api/${userId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, new_conversation: newConversation }),
  });
}

// [Task]: T004 [From]: specs/phase3-chatbot/conversation-memory/spec.md §FR-001
interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatHistoryResponse {
  messages: ChatHistoryMessage[];
  conversation_id: string | null;
}

export async function getChatHistory(userId: string): Promise<ChatHistoryResponse> {
  return apiFetch<ChatHistoryResponse>(`/api/${userId}/chat/history`);
}
