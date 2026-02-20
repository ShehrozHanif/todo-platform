'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskContext } from '@/context/TaskContext';
import { FilterChips } from '@/components/tasks/FilterChips';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Snackbar } from '@/components/ui/Snackbar';
import { Button } from '@/components/ui/Button';
import { Task } from '@/lib/types';
import { categoryColors, categoryLabels } from '@/lib/data';
import { cn } from '@/lib/utils';

const builtInCats = ['work', 'personal', 'study', 'health'] as const;

function applyFilter(tasks: Task[], filter: string): Task[] {
  const today = new Date().toISOString().split('T')[0];
  switch (filter) {
    case 'Today':     return tasks.filter(t => t.dueDate === today);
    case 'High':      return tasks.filter(t => t.priority === 'high');
    case 'Medium':    return tasks.filter(t => t.priority === 'medium');
    case 'Low':       return tasks.filter(t => t.priority === 'low');
    case 'Completed': return tasks.filter(t => t.completed);
    default:          return tasks;
  }
}

export default function TasksPage() {
  const { state, dispatch } = useTaskContext();
  const filter = state.activeFilter;
  const [snack, setSnack] = useState('');
  const [showSnack, setShowSnack] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Resolve active category label for display
  const activeCatLabel = useMemo(() => {
    if (!state.activeCategory) return null;
    if (state.activeCategory in categoryLabels) {
      return categoryLabels[state.activeCategory as keyof typeof categoryLabels];
    }
    return state.customCategories.find(c => c.id === state.activeCategory)?.name ?? null;
  }, [state.activeCategory, state.customCategories]);

  // Active category color
  const activeCatColor = useMemo(() => {
    if (!state.activeCategory) return '#4F46E5';
    if (state.activeCategory in categoryColors) {
      return categoryColors[state.activeCategory as keyof typeof categoryColors];
    }
    return state.customCategories.find(c => c.id === state.activeCategory)?.color ?? '#4F46E5';
  }, [state.activeCategory, state.customCategories]);

  const filtered = useMemo(() => {
    let base = state.activeCategory
      ? state.tasks.filter(t => t.category === state.activeCategory)
      : state.tasks;
    return applyFilter(base, filter);
  }, [state.tasks, state.activeCategory, filter]);

  function handleFilterChange(f: string) {
    dispatch({ type: 'SET_FILTER', payload: f });
  }

  function clearCategory() {
    dispatch({ type: 'SET_CATEGORY', payload: null });
    dispatch({ type: 'SET_FILTER', payload: 'All' });
  }

  function handleSnack(msg: string) {
    setSnack(msg);
    setShowSnack(true);
  }

  function selectCategory(catId: string | null) {
    dispatch({ type: 'SET_CATEGORY', payload: catId });
    dispatch({ type: 'SET_FILTER', payload: 'All' });
    setShowCatPicker(false);
  }

  return (
    <div className="p-5 md:p-7">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">My Tasks</h2>
          <p className="text-[13px] text-gray-500 dark:text-[#9CA3C8] mt-0.5">
            {state.tasks.filter(t => !t.completed).length} pending · {state.tasks.filter(t => t.completed).length} completed
          </p>
        </div>
        <Button onClick={() => dispatch({ type: 'OPEN_MODAL' })} size="sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Task
        </Button>
      </div>

      {/* Active category banner (desktop only — mobile uses picker) */}
      {activeCatLabel && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex items-center gap-2 mb-4 px-3 py-2 rounded-xl border w-fit"
          style={{
            backgroundColor: `${activeCatColor}15`,
            borderColor: `${activeCatColor}40`,
          }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeCatColor }} />
          <span className="text-[13px] font-semibold" style={{ color: activeCatColor }}>
            {activeCatLabel}
          </span>
          <span className="text-[12px] text-gray-400 dark:text-[#5B6180]">
            · {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={clearCategory}
            className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Clear filter"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}

      <FilterChips
        active={filter}
        onChange={handleFilterChange}
        catActive={!!state.activeCategory}
        onCatClick={() => setShowCatPicker(p => !p)}
      />

      {/* Mobile-only category picker panel */}
      <AnimatePresence>
        {showCatPicker && (
          <motion.div
            key="cat-picker"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden mb-4 bg-white dark:bg-[#151628] rounded-2xl border border-gray-200 dark:border-[#252742] overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#252742]">
              <span className="text-[12px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.6px]">
                Filter by Category
              </span>
              <button
                onClick={() => setShowCatPicker(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Category options */}
            <div className="p-3 flex flex-col gap-1">

              {/* All option */}
              <button
                onClick={() => selectCategory(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                  !state.activeCategory
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-[#1C1D30]'
                )}
              >
                <span className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                  !state.activeCategory ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-[#1C1D30]'
                )}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                    className={!state.activeCategory ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-[#5B6180]'}
                  >
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-[13px] font-semibold',
                    !state.activeCategory ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-[#9CA3C8]'
                  )}>All Categories</p>
                </div>
                <span className={cn(
                  'text-[11px] font-medium',
                  !state.activeCategory ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-[#5B6180]'
                )}>
                  {state.tasks.length}
                </span>
                {!state.activeCategory && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>

              {/* Built-in categories */}
              {builtInCats.map(cat => {
                const count = state.tasks.filter(t => t.category === cat).length;
                const isActive = state.activeCategory === cat;
                const color = categoryColors[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                      isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#1C1D30]'
                    )}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] font-semibold',
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-[#9CA3C8]'
                      )}>
                        {categoryLabels[cat]}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[11px] font-medium',
                      isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-[#5B6180]'
                    )}>
                      {count}
                    </span>
                    {isActive && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {/* Custom categories */}
              {state.customCategories.map(cat => {
                const count = state.tasks.filter(t => t.category === cat.id).length;
                const isActive = state.activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => selectCategory(cat.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
                      isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#1C1D30]'
                    )}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] font-semibold truncate',
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-[#9CA3C8]'
                      )}>
                        {cat.name}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[11px] font-medium',
                      isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-[#5B6180]'
                    )}>
                      {count}
                    </span>
                    {isActive && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-indigo-500 dark:text-indigo-400 flex-shrink-0">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-[#5B6180]"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mb-4 opacity-40">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <p className="text-[15px] font-medium mb-1">No tasks found</p>
          <p className="text-[13px]">
            {activeCatLabel ? `No tasks in "${activeCatLabel}"` : 'Add a new task to get started'}
          </p>
          <Button onClick={() => dispatch({ type: 'OPEN_MODAL' })} size="sm" className="mt-4">
            Add Task
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-[#252742]">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.6px]">Task</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.6px] hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.6px]">Priority</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-[.6px] hidden sm:table-cell">Due Date</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <TaskRow key={task.id} task={task} onSnack={handleSnack} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
            {/* Mobile active category badge */}
            {activeCatLabel && (
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: `${activeCatColor}18`, color: activeCatColor }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeCatColor }} />
                  {activeCatLabel}
                  <button onClick={clearCategory} className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
                <span className="text-[11px] text-gray-400 dark:text-[#5B6180]">
                  {filtered.length} task{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <p className="text-[11px] text-gray-400 dark:text-[#5B6180] mb-3 font-medium">
              ← swipe to complete · swipe right to delete →
            </p>
            {filtered.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <TaskCard task={task} onSnack={handleSnack} />
              </motion.div>
            ))}
          </div>
        </>
      )}

      <Snackbar message={snack} show={showSnack} onHide={() => setShowSnack(false)} />
    </div>
  );
}
