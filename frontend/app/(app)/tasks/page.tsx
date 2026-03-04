// [Task]: T009 [From]: specs/phase5-cloud/advanced-features/tasks.md §T009
// Tasks page with backend-powered search, filter, and sort.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/lib/auth-client';
import { useTaskContext } from '@/context/TaskContext';
import { FilterChips } from '@/components/tasks/FilterChips';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Snackbar } from '@/components/ui/Snackbar';
import { Button } from '@/components/ui/Button';
import { Task } from '@/lib/types';
import * as api from '@/lib/api';
import type { TaskQueryParams } from '@/lib/api';
import { categoryColors, categoryLabels } from '@/lib/data';
import { cn } from '@/lib/utils';

const builtInCats = ['work', 'personal', 'study', 'health'] as const;

// Map a filter chip value → backend query params
function chipToParams(chip: string, today: string): Partial<TaskQueryParams> {
  switch (chip) {
    case 'High':      return { priority: 'high' };
    case 'Medium':    return { priority: 'medium' };
    case 'Low':       return { priority: 'low' };
    case 'Completed': return { completed: true };
    case 'Today':     return { due_date_from: today, due_date_to: today };
    default:          return {};
  }
}

// Split a "field:order" sort value string
function parseSortValue(v: string): { sort: string; order: 'asc' | 'desc' } | null {
  if (!v) return null;
  const [field, ord] = v.split(':');
  return { sort: field, order: (ord as 'asc' | 'desc') ?? 'asc' };
}

export default function TasksPage() {
  const { state, dispatch } = useTaskContext();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [snack, setSnack] = useState('');
  const [showSnack, setShowSnack] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Search state — raw input + debounced value
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search]);

  // Sort state — "field:order" string, e.g. "due_date:asc"
  const [sortValue, setSortValue] = useState('');

  // The filter chip (All / Today / High / Medium / Low / Completed) lives in context
  const filter = state.activeFilter;

  // displayTasks: backend-fetched filtered/sorted results.
  // null means "no active params — use state.tasks directly".
  const [displayTasks, setDisplayTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];

    const params: TaskQueryParams = {
      ...chipToParams(filter, today),
      ...(parseSortValue(sortValue) ?? {}),
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (state.activeCategory) params.category = state.activeCategory;

    const hasParams = Object.keys(params).length > 0;

    if (!hasParams) {
      // No active filters — use context tasks (no extra fetch needed)
      setDisplayTasks(null);
      return;
    }

    api.getTasks(userId, params)
      .then(setDisplayTasks)
      .catch(console.error);
  // state.tasks in deps: re-query after mutations so filtered results stay in sync
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, debouncedSearch, sortValue, filter, state.activeCategory, state.tasks]);

  // The list shown in the UI
  const shown = displayTasks ?? state.tasks;

  // ── Category helpers ──────────────────────────────────
  const activeCatLabel = useMemo(() => {
    if (!state.activeCategory) return null;
    if (state.activeCategory in categoryLabels)
      return categoryLabels[state.activeCategory as keyof typeof categoryLabels];
    return state.customCategories.find(c => c.id === state.activeCategory)?.name ?? null;
  }, [state.activeCategory, state.customCategories]);

  const activeCatColor = useMemo(() => {
    if (!state.activeCategory) return '#4F46E5';
    if (state.activeCategory in categoryColors)
      return categoryColors[state.activeCategory as keyof typeof categoryColors];
    return state.customCategories.find(c => c.id === state.activeCategory)?.color ?? '#4F46E5';
  }, [state.activeCategory, state.customCategories]);

  function handleFilterChange(f: string) {
    dispatch({ type: 'SET_FILTER', payload: f });
  }

  function clearCategory() {
    dispatch({ type: 'SET_CATEGORY', payload: null });
    dispatch({ type: 'SET_FILTER', payload: 'All' });
  }

  function selectCategory(catId: string | null) {
    dispatch({ type: 'SET_CATEGORY', payload: catId });
    dispatch({ type: 'SET_FILTER', payload: 'All' });
    setShowCatPicker(false);
  }

  function handleSnack(msg: string) {
    setSnack(msg);
    setShowSnack(true);
  }

  // Whether any filter/search/sort is active
  const hasActiveFilters = !!(debouncedSearch || sortValue || filter !== 'All' || state.activeCategory);

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

      {/* Search + Sort row */}
      <div className="flex gap-2 mb-3">
        {/* Search input */}
        <div className="relative flex-1">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#5B6180] pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className={cn(
              'w-full pl-9 pr-8 py-2 text-[13.5px] rounded-[10px] border outline-none transition-colors',
              'bg-gray-100 dark:bg-[#1C1D30] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#5B6180]',
              search
                ? 'border-indigo-500'
                : 'border-gray-200 dark:border-[#252742] focus:border-indigo-500'
            )}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={sortValue}
            onChange={e => setSortValue(e.target.value)}
            className={cn(
              'appearance-none pl-3 pr-8 py-2 text-[13px] font-semibold rounded-[10px] border outline-none transition-colors cursor-pointer',
              'bg-gray-100 dark:bg-[#1C1D30] text-gray-700 dark:text-[#9CA3C8]',
              sortValue
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-[#252742]'
            )}
          >
            <option value="">Sort</option>
            <option value="created_at:desc">Newest</option>
            <option value="created_at:asc">Oldest</option>
            <option value="due_date:asc">Due Date ↑</option>
            <option value="due_date:desc">Due Date ↓</option>
            <option value="priority:asc">Priority</option>
            <option value="title:asc">Title A–Z</option>
            <option value="title:desc">Title Z–A</option>
          </select>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none',
              sortValue ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-[#5B6180]'
            )}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {/* Clear filters button — shown when any filter is active */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch('');
              setSortValue('');
              dispatch({ type: 'SET_FILTER', payload: 'All' });
              dispatch({ type: 'SET_CATEGORY', payload: null });
            }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-gray-500 dark:text-[#9CA3C8] hover:text-red-500 dark:hover:text-red-400 bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] rounded-[10px] transition-colors"
            title="Clear all filters"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Search result count */}
      {debouncedSearch && (
        <p className="text-[12px] text-gray-400 dark:text-[#5B6180] mb-2 font-medium">
          {shown.length} result{shown.length !== 1 ? 's' : ''} for &ldquo;{debouncedSearch}&rdquo;
        </p>
      )}

      {/* Active category banner (desktop) */}
      {activeCatLabel && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:flex items-center gap-2 mb-4 px-3 py-2 rounded-xl border w-fit"
          style={{ backgroundColor: `${activeCatColor}15`, borderColor: `${activeCatColor}40` }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeCatColor }} />
          <span className="text-[13px] font-semibold" style={{ color: activeCatColor }}>{activeCatLabel}</span>
          <span className="text-[12px] text-gray-400 dark:text-[#5B6180]">
            · {shown.length} task{shown.length !== 1 ? 's' : ''}
          </span>
          <button onClick={clearCategory} className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="Clear filter">
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

      {/* Mobile category picker */}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#252742]">
              <span className="text-[12px] font-bold text-gray-500 dark:text-[#9CA3C8] uppercase tracking-[.6px]">Filter by Category</span>
              <button onClick={() => setShowCatPicker(false)} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 flex flex-col gap-1">
              <CatOption label="All Categories" count={state.tasks.length} isActive={!state.activeCategory} onClick={() => selectCategory(null)} color="#4F46E5" />
              {builtInCats.map(cat => (
                <CatOption
                  key={cat}
                  label={categoryLabels[cat]}
                  count={state.tasks.filter(t => t.category === cat).length}
                  isActive={state.activeCategory === cat}
                  onClick={() => selectCategory(cat)}
                  color={categoryColors[cat]}
                />
              ))}
              {state.customCategories.map(cat => (
                <CatOption
                  key={cat.id}
                  label={cat.name}
                  count={state.tasks.filter(t => t.category === cat.id).length}
                  isActive={state.activeCategory === cat.id}
                  onClick={() => selectCategory(cat.id)}
                  color={cat.color}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      {shown.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-[#5B6180]"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mb-4 opacity-40">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <p className="text-[15px] font-medium mb-1">No tasks found</p>
          <p className="text-[13px]">
            {debouncedSearch
              ? `No tasks match "${debouncedSearch}"`
              : activeCatLabel
              ? `No tasks in "${activeCatLabel}"`
              : 'Add a new task to get started'}
          </p>
          {!debouncedSearch && (
            <Button onClick={() => dispatch({ type: 'OPEN_MODAL' })} size="sm" className="mt-4">
              Add Task
            </Button>
          )}
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
                {shown.map(task => (
                  <TaskRow key={task.id} task={task} onSnack={handleSnack} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden">
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
                  {shown.length} task{shown.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            <p className="text-[11px] text-gray-400 dark:text-[#5B6180] mb-3 font-medium">
              ← swipe to complete · swipe right to delete →
            </p>
            {shown.map((task, i) => (
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

// ── Extracted category option for the mobile picker ──

function CatOption({
  label, count, isActive, onClick, color,
}: {
  label: string; count: number; isActive: boolean; onClick: () => void; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150',
        isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#1C1D30]'
      )}
    >
      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
      <p className={cn(
        'flex-1 text-[13px] font-semibold truncate',
        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-[#9CA3C8]'
      )}>
        {label}
      </p>
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
}
