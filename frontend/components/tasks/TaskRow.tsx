'use client';

import { Task } from '@/lib/types';
import { useTaskContext } from '@/context/TaskContext';
import { Checkbox } from '@/components/ui/Checkbox';
import { PriorityBadge, CategoryBadge } from '@/components/ui/Badge';
import { formatDate, isOverdue } from '@/lib/utils';

interface TaskRowProps {
  task: Task;
  onSnack: (msg: string) => void;
}

export function TaskRow({ task, onSnack }: TaskRowProps) {
  const { state, dispatch } = useTaskContext();
  const catColor = state.customCategories.find(c => c.id === task.category)?.color;

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE', payload: task.id });
    onSnack(task.completed ? 'Task reopened' : 'Task completed!');
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    dispatch({ type: 'DELETE', payload: task.id });
    onSnack('Task deleted');
  }

  function handleRowClick() {
    dispatch({ type: 'OPEN_MODAL', payload: task });
  }

  const overdue = isOverdue(task.dueDate) && !task.completed;

  return (
    <tr
      onClick={handleRowClick}
      className={`group border-b border-gray-100 dark:border-[#252742] hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer ${task.completed ? 'opacity-60' : ''}`}
    >
      <td className="px-4 py-3.5 w-10" onClick={e => e.stopPropagation()}>
        <Checkbox checked={task.completed} onChange={() => {
          dispatch({ type: 'TOGGLE', payload: task.id });
          onSnack(task.completed ? 'Task reopened' : 'Task completed!');
        }} />
      </td>

      <td className="px-4 py-3.5">
        <span className={`text-[13.5px] font-medium ${task.completed ? 'line-through text-gray-400 dark:text-[#5B6180]' : 'text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors'}`}>
          {task.title}
        </span>
        {task.description && (
          <p className="text-[12px] text-gray-400 dark:text-[#5B6180] mt-0.5 truncate max-w-xs">{task.description}</p>
        )}
      </td>

      <td className="px-4 py-3.5 hidden md:table-cell">
        <CategoryBadge category={task.category} color={catColor} />
      </td>

      <td className="px-4 py-3.5">
        <PriorityBadge priority={task.priority} />
      </td>

      <td className={`px-4 py-3.5 text-[12px] font-medium hidden sm:table-cell ${overdue ? 'text-red-500' : 'text-gray-500 dark:text-[#9CA3C8]'}`}>
        {task.dueDate ? formatDate(task.dueDate) : '—'}
        {overdue && <span className="ml-1 text-[10px]">Overdue</span>}
      </td>

      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDelete}
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
