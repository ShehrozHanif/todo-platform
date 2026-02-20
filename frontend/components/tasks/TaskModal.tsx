'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskContext } from '@/context/TaskContext';
import { Priority } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITIES: { value: Priority; label: string; dot: string; selected: string }[] = [
  {
    value: 'high',
    label: 'High',
    dot: 'bg-red-500',
    selected: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-400',
  },
  {
    value: 'medium',
    label: 'Medium',
    dot: 'bg-amber-400',
    selected: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400',
  },
  {
    value: 'low',
    label: 'Low',
    dot: 'bg-emerald-500',
    selected: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400',
  },
];

const CATEGORIES: { value: string; label: string; icon: string; selected: string }[] = [
  {
    value: 'work',
    label: 'Work',
    icon: '💼',
    selected: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-400',
  },
  {
    value: 'personal',
    label: 'Personal',
    icon: '🏠',
    selected: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-400',
  },
  {
    value: 'study',
    label: 'Study',
    icon: '📖',
    selected: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-400',
  },
  {
    value: 'health',
    label: 'Health',
    icon: '💪',
    selected: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400',
  },
];

const UNSELECTED = 'bg-gray-50 dark:bg-[#1C1D30] border-gray-200 dark:border-[#252742] text-gray-600 dark:text-[#9CA3C8]';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 focus:outline-none',
        checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-[#3A3B52]',
        disabled && 'opacity-50 cursor-default'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export function TaskModal() {
  const { state, dispatch } = useTaskContext();
  const { modalOpen, editingTask } = state;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('work');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset submitting flag whenever the modal closes
  useEffect(() => {
    if (!modalOpen) setSubmitting(false);
  }, [modalOpen]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setDueDate(editingTask.dueDate ?? '');
      setDueTime(editingTask.dueTime ?? '');
      setRecurring(editingTask.recurring ?? false);
      setReminder(editingTask.reminder ?? false);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('work');
      setDueDate('');
      setDueTime('');
      setRecurring(false);
      setReminder(false);
    }
  }, [editingTask, modalOpen]);

  // A task with an empty id is a "pre-filled new task" (e.g. from calendar date click), not an edit
  const isRealEdit = !!editingTask?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    if (isRealEdit) {
      dispatch({ type: 'EDIT', payload: { ...editingTask!, title, description, priority, category, dueDate, dueTime, recurring, reminder } });
      // EDIT closes the modal synchronously via reducer, so submitting resets via the modalOpen effect
    } else {
      dispatch({ type: 'ADD', payload: { title, description, priority, category, dueDate, dueTime, recurring, reminder, completed: false } });
      // ADD is async — modal closes after API responds, resetting submitting via the modalOpen effect
    }
  }

  const contentProps = {
    title, setTitle, description, setDescription,
    priority, setPriority, category, setCategory,
    dueDate, setDueDate, dueTime, setDueTime,
    recurring, setRecurring, reminder, setReminder,
    handleSubmit, submitting, isEdit: isRealEdit,
    isCompleted: isRealEdit && !!editingTask?.completed,
    onClose: () => dispatch({ type: 'CLOSE_MODAL' }),
  };

  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 bg-black/45 z-[1000] flex items-end md:items-center justify-center backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) dispatch({ type: 'CLOSE_MODAL' }); }}
        >
          {/* Mobile: bottom sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="md:hidden w-full bg-white dark:bg-[#151628] rounded-t-3xl max-h-[92vh] overflow-y-auto"
          >
            <ModalContent {...contentProps} mobile />
          </motion.div>

          {/* Desktop: centered modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22 }}
            className="hidden md:block w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-[#151628] rounded-2xl border border-gray-200 dark:border-[#252742] shadow-2xl"
          >
            <ModalContent {...contentProps} mobile={false} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ContentProps {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  priority: Priority; setPriority: (v: Priority) => void;
  category: string; setCategory: (v: string) => void;
  dueDate: string; setDueDate: (v: string) => void;
  dueTime: string; setDueTime: (v: string) => void;
  recurring: boolean; setRecurring: (v: boolean) => void;
  reminder: boolean; setReminder: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  isEdit: boolean;
  isCompleted: boolean;
  onClose: () => void;
  mobile: boolean;
}

function ModalContent({
  title, setTitle, description, setDescription, priority, setPriority,
  category, setCategory, dueDate, setDueDate, dueTime, setDueTime,
  recurring, setRecurring, reminder, setReminder,
  handleSubmit, submitting, isEdit, isCompleted, onClose, mobile,
}: ContentProps) {
  const inputBase = 'border rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-gray-900 dark:text-white outline-none transition-colors w-full';
  const inputActive = 'bg-gray-100 dark:bg-[#1C1D30] border-gray-200 dark:border-[#252742] placeholder-gray-400 dark:placeholder-[#5B6180] focus:border-indigo-500';
  const inputReadonly = 'bg-gray-50 dark:bg-[#1A1B2E] border-gray-100 dark:border-[#1E1F35] cursor-default';

  return (
    <form onSubmit={handleSubmit}>
      {/* Mobile handle */}
      {mobile && <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mt-3 mb-1" />}

      {/* Completed banner */}
      {isCompleted && (
        <div className="mx-6 mt-4 mb-1 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">Task Completed</p>
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70">This task has been marked as done. You can still view it below.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">
          {isCompleted ? 'View Task' : isEdit ? 'Edit Task' : 'New Task'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1C1D30] flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-[#23243A] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-4">

        {/* Task Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.8px]">Task Title</label>
          <input
            value={title}
            onChange={e => !isCompleted && setTitle(e.target.value)}
            readOnly={isCompleted}
            placeholder="What needs to be done?"
            autoFocus={!isCompleted && !isEdit}
            className={cn(inputBase, isCompleted ? inputReadonly : inputActive)}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.8px]">Description</label>
          {isCompleted ? (
            <div className="bg-gray-50 dark:bg-[#1A1B2E] border border-gray-100 dark:border-[#1E1F35] rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-gray-700 dark:text-[#9CA3C8] min-h-[80px]">
              {description || <span className="text-gray-400 dark:text-[#5B6180] italic">No description</span>}
            </div>
          ) : (
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Add details, notes, or context..."
              className="bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180] outline-none focus:border-indigo-500 transition-colors w-full resize-none"
            />
          )}
        </div>

        {/* Due Date + Time — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.8px]">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => !isCompleted && setDueDate(e.target.value)}
              readOnly={isCompleted}
              className={cn(inputBase, 'text-[13px] [color-scheme:light] dark:[color-scheme:dark]', isCompleted ? inputReadonly : inputActive)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.8px]">Time</label>
            <input
              type="time"
              value={dueTime}
              onChange={e => !isCompleted && setDueTime(e.target.value)}
              readOnly={isCompleted}
              className={cn(inputBase, 'text-[13px] [color-scheme:light] dark:[color-scheme:dark]', isCompleted ? inputReadonly : inputActive)}
            />
          </div>
        </div>

        {/* Priority */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.8px]">Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => !isCompleted && setPriority(p.value)}
                disabled={isCompleted}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all duration-200',
                  priority === p.value ? p.selected : UNSELECTED,
                  isCompleted && 'cursor-default opacity-75'
                )}
              >
                <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', p.dot)} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.8px]">Category</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => !isCompleted && setCategory(c.value)}
                disabled={isCompleted}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] border text-[13px] font-semibold transition-all duration-200',
                  category === c.value ? c.selected : UNSELECTED,
                  isCompleted && 'cursor-default opacity-75'
                )}
              >
                <span className="text-[15px] leading-none">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring Task */}
        <div className="flex items-center gap-3.5 pt-3 border-t border-gray-100 dark:border-[#1E2035]">
          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white">Recurring Task</p>
            <p className="text-[11.5px] text-gray-400 dark:text-[#5B6180]">Repeat Daily / Weekly / Monthly</p>
          </div>
          <Toggle checked={recurring} onChange={setRecurring} disabled={isCompleted} />
        </div>

        {/* Reminder */}
        <div className="flex items-center gap-3.5 pt-3 border-t border-gray-100 dark:border-[#1E2035]">
          <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-gray-900 dark:text-white">Reminder</p>
            <p className="text-[11.5px] text-gray-400 dark:text-[#5B6180]">Get notified before due date</p>
          </div>
          <Toggle checked={reminder} onChange={setReminder} disabled={isCompleted} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {isCompleted ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[10px] border border-gray-200 dark:border-[#252742] text-[13.5px] font-semibold text-gray-700 dark:text-[#9CA3C8] bg-white dark:bg-[#1C1D30] hover:bg-gray-50 dark:hover:bg-[#23243A] transition-colors"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-[10px] border border-gray-200 dark:border-[#252742] text-[13.5px] font-semibold text-gray-700 dark:text-[#9CA3C8] bg-white dark:bg-[#1C1D30] hover:bg-gray-50 dark:hover:bg-[#23243A] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || submitting}
                className="flex-1 py-2.5 rounded-[10px] text-[13.5px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0110 10" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                )}
                {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Task'}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
