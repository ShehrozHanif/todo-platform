// [Task]: T013 [From]: specs/phase2-web/frontend-ui/tasks.md §T013
// Single task row with toggle, edit, and delete actions.
"use client";

import type { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const handleDelete = () => {
    if (window.confirm(`Delete "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  return (
    <li className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          className="w-5 h-5 rounded cursor-pointer"
        />
        <div className="min-w-0">
          <p
            className={`font-medium truncate ${
              task.completed ? "line-through text-gray-400" : "text-gray-900"
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-sm text-gray-500 truncate">{task.description}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 ml-4 shrink-0">
        <button
          onClick={() => onEdit(task)}
          className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
