// [Task]: T014 [From]: specs/phase2-web/frontend-ui/tasks.md §T014
// Task list container — handles loading, empty, and populated states.
"use client";

import type { Task } from "@/types/task";
import TaskItem from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onToggle: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
}

export default function TaskList({
  tasks,
  loading,
  onToggle,
  onDelete,
  onEdit,
}: TaskListProps) {
  if (loading) {
    return <p className="text-center text-gray-500 py-8">Loading tasks...</p>;
  }

  if (tasks.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">No tasks yet. Add one above!</p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}
