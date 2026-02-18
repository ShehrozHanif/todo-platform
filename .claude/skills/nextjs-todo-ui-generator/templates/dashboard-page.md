# Dashboard Page Template

## frontend/app/dashboard/page.tsx

```typescript
// [Task]: T00X [From]: specs/phase2-web/frontend-ui/plan.md §Dashboard
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import type { Task } from "@/types/task";
import * as api from "@/lib/api";
import AuthGuard from "@/components/AuthGuard";
import AddTaskForm from "@/components/AddTaskForm";
import TaskList from "@/components/TaskList";
import EditTaskModal from "@/components/EditTaskModal";

function DashboardContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const userId = session?.user?.id;

  const loadTasks = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.getTasks(userId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAdd = async (title: string, description: string) => {
    if (!userId) return;
    const newTask = await api.createTask(userId, { title, description: description || undefined });
    setTasks((prev) => [...prev, newTask]);
  };

  const handleToggle = async (taskId: number) => {
    if (!userId) return;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
    );
    try {
      await api.toggleComplete(userId, taskId);
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
      );
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!userId) return;
    try {
      await api.deleteTask(userId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleEdit = async (taskId: number, title: string, description: string) => {
    if (!userId) return;
    const updated = await api.updateTask(userId, taskId, {
      title,
      description: description || undefined,
    });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Todo Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <AddTaskForm onAdd={handleAdd} />

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <TaskList
          tasks={tasks}
          loading={loading}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={setEditingTask}
        />

        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleEdit}
        />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
```

## Key Points

- `AuthGuard` wraps the entire page — unauthenticated users redirected to `/login`
- `DashboardContent` is separated so `useSession()` works inside `AuthGuard`
- `userId` extracted from Better Auth session
- `loadTasks` in `useEffect` with `userId` dependency
- **Optimistic update** for toggle complete — instant UI feedback, reverts on error
- `handleDelete` uses `window.confirm()` (in TaskItem component)
- `editingTask` state controls EditTaskModal open/close
- Sign out button in header with redirect to `/login`
- All API calls through `lib/api.ts` — never raw `fetch`
- Error state displayed inline below the form
- Loading state passed to TaskList for skeleton/placeholder
