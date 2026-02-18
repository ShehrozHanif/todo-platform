# React Component Patterns Reference

## Client Component Structure

```typescript
"use client";

import { useState } from "react";

interface Props {
  // typed props
}

export default function ComponentName({ prop1, prop2 }: Props) {
  const [state, setState] = useState<Type>(initial);

  const handleAction = async () => {
    // logic
  };

  return (
    <div className="tailwind-classes">
      {/* JSX */}
    </div>
  );
}
```

## Form Pattern (Controlled)

```typescript
"use client";
import { useState, FormEvent } from "react";

export default function TaskForm({ onSubmit }: { onSubmit: (title: string, desc: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError("");
    onSubmit(title.trim(), description.trim());
    setTitle("");
    setDescription("");
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit">Add Task</button>
    </form>
  );
}
```

## List + Item Pattern

```typescript
// Parent: TaskList
export default function TaskList({ tasks, onToggle, onDelete, onEdit }: Props) {
  if (tasks.length === 0) return <p>No tasks yet. Add one above!</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
          onEdit={() => onEdit(task)}
        />
      ))}
    </ul>
  );
}

// Child: TaskItem
export default function TaskItem({ task, onToggle, onDelete, onEdit }: Props) {
  return (
    <li className="flex items-center justify-between p-3 border rounded">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={task.completed} onChange={onToggle} />
        <span className={task.completed ? "line-through text-gray-400" : ""}>
          {task.title}
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </li>
  );
}
```

## Modal Pattern

```typescript
"use client";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {children}
        <button onClick={onClose} className="mt-4 text-gray-500">Cancel</button>
      </div>
    </div>
  );
}
```

## Loading State Pattern

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await apiCall();
  } catch (err) {
    setError("Something went wrong");
  } finally {
    setLoading(false);
  }
};

// In JSX:
<button disabled={loading}>
  {loading ? "Saving..." : "Save"}
</button>
```

## Auth Guard Pattern

```typescript
"use client";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  if (isPending) return <div>Loading...</div>;
  if (!session) return null;

  return <>{children}</>;
}
```

## Delete Confirmation

```typescript
const handleDelete = async (taskId: number) => {
  if (!window.confirm("Are you sure you want to delete this task?")) return;
  await api.deleteTask(userId, taskId);
  // refresh list
};
```

## Tailwind Responsive Patterns

```typescript
// Mobile-first: sm:, md:, lg: breakpoints
<div className="px-4 md:px-8 lg:px-16">          // Responsive padding
<div className="grid grid-cols-1 md:grid-cols-2">  // Responsive grid
<h1 className="text-xl md:text-2xl lg:text-3xl">   // Responsive text
```

## Anti-Patterns to Avoid

| Anti-Pattern | Correct Pattern |
|-------------|-----------------|
| `"use client"` on every file | Only on files with hooks/events |
| `useEffect` for data fetching | Use server components or SWR |
| `any` type | Explicit TypeScript interfaces |
| Inline styles | Tailwind utility classes |
| Direct `fetch()` in components | Centralized `lib/api.ts` |
| localStorage for JWT | Session memory or httpOnly cookie |
