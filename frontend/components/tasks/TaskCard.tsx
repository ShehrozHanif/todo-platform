'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Task } from '@/lib/types';
import { useTaskContext } from '@/context/TaskContext';
import { PriorityBadge, CategoryBadge } from '@/components/ui/Badge';
import { formatDate, isOverdue } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onSnack: (msg: string) => void;
}

export function TaskCard({ task, onSnack }: TaskCardProps) {
  const { state, dispatch } = useTaskContext();
  const catColor = state.customCategories.find(c => c.id === task.category)?.color;
  const x = useMotionValue(0);
  const leftBgOpacity = useTransform(x, [0, 80], [0, 1]);
  const rightBgOpacity = useTransform(x, [-80, 0], [1, 0]);
  const constraintsRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Track whether a drag gesture actually occurred, so tap vs swipe can be distinguished
  const dragOccurred = useRef(false);

  function handleDragStart() {
    dragOccurred.current = true;
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > 80) {
      animate(x, 400, { duration: 0.2 });
      setTimeout(() => {
        dispatch({ type: 'TOGGLE', payload: task.id });
        onSnack(task.completed ? 'Task reopened' : 'Task completed!');
        animate(x, 0, { duration: 0 });
      }, 250);
    } else if (info.offset.x < -80) {
      animate(x, -400, { duration: 0.2 });
      setTimeout(() => {
        dispatch({ type: 'DELETE', payload: task.id });
        onSnack('Task deleted');
      }, 250);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
    // Reset after a short delay (the click event fires after dragEnd)
    setTimeout(() => { dragOccurred.current = false; }, 100);
  }

  function handleCardClick() {
    if (dragOccurred.current) return;
    dispatch({ type: 'OPEN_MODAL', payload: task });
  }

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

  const overdue = isOverdue(task.dueDate) && !task.completed;

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-2xl mb-2.5">

      {/* ── Full swipe backgrounds (revealed during drag) ── */}
      <motion.div style={{ opacity: leftBgOpacity }}
        className="absolute inset-0 bg-emerald-500 rounded-2xl flex items-center pl-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </motion.div>
      <motion.div style={{ opacity: rightBgOpacity }}
        className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </motion.div>

      {/* ── Draggable card ── */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.15}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onClick={handleCardClick}
        className="relative z-10 bg-white dark:bg-[#151628] rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-gray-100 dark:border-[#252742] cursor-grab active:cursor-grabbing overflow-hidden"
      >
        {/* ── Desktop-only: Left hint strip — Complete ── */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, width: hovered ? 36 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="hidden md:flex absolute left-0 top-0 bottom-0 bg-emerald-500 rounded-l-2xl flex-col items-center justify-center gap-1 pointer-events-none overflow-hidden flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className="text-[8px] font-bold text-white leading-none tracking-wide">DONE</span>
        </motion.div>

        {/* ── Desktop-only: Right hint strip — Delete ── */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, width: hovered ? 36 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="hidden md:flex absolute right-0 top-0 bottom-0 bg-red-500 rounded-r-2xl flex-col items-center justify-center gap-1 pointer-events-none overflow-hidden flex-shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          <span className="text-[8px] font-bold text-white leading-none tracking-wide">DEL</span>
        </motion.div>

        {/* Priority dot */}
        <div className={`w-1.5 h-10 rounded-full flex-shrink-0 transition-[margin] duration-200 ${hovered ? 'md:ml-6' : 'ml-0'} ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-500'}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-semibold truncate ${task.completed ? 'line-through text-gray-400 dark:text-[#5B6180]' : 'text-gray-900 dark:text-white'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <CategoryBadge category={task.category} color={catColor} />
            {task.dueDate && (
              <span className={`text-[11px] font-medium ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-[#5B6180]'}`}>
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className={`flex items-center gap-2 flex-shrink-0 transition-[margin] duration-200 ${hovered ? 'md:mr-6' : 'mr-0'}`}>
          <div className="flex flex-col items-end gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.completed && (
              <span className="text-emerald-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
            )}
          </div>

          {/* Mobile-only action buttons */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              type="button"
              onClick={handleToggle}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
              style={{
                backgroundColor: task.completed ? '#10B98118' : '#10B98112',
                color: '#10B981',
              }}
              title={task.completed ? 'Reopen' : 'Complete'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 transition-all duration-150 active:scale-90"
              title="Delete"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
