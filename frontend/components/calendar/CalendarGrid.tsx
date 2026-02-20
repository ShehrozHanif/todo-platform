'use client';

import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { cn } from '@/lib/utils';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface CalendarGridProps {
  mini?: boolean;
}

export function CalendarGrid({ mini = false }: CalendarGridProps) {
  const { state, dispatch } = useTaskContext();
  const today = new Date();
  const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });
  const [selected, setSelected] = useState<number | null>(today.getDate());

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const daysInPrev = new Date(current.year, current.month, 0).getDate();

  function prev() {
    setCurrent(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
  }
  function next() {
    setCurrent(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });
  }

  function isoForDay(day: number) {
    return `${current.year}-${String(current.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function getTasksForDay(day: number) {
    return state.tasks.filter(t => t.dueDate === isoForDay(day));
  }

  /** Open the "New Task" modal pre-filled with the clicked date. */
  function addTaskForDay(day: number) {
    // Open modal with a stub task that has the dueDate pre-filled
    dispatch({
      type: 'OPEN_MODAL',
      payload: {
        id: '',
        title: '',
        priority: 'medium',
        category: 'work',
        dueDate: isoForDay(day),
        completed: false,
        createdAt: new Date().toISOString(),
      },
    });
  }

  // Build cells: previous month fillers + current month + next month fillers
  const cells: Array<{ day: number; type: 'prev' | 'current' | 'next' }> = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'current' });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: 'next' });

  const isToday = (day: number) =>
    day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();

  const selectedTasks = selected ? getTasksForDay(selected) : [];

  if (mini) {
    return (
      <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">
            {MONTHS[current.month]} {current.year}
          </h3>
          <div className="flex gap-1">
            <button onClick={prev} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1C1D30] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={next} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1C1D30] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] font-bold text-gray-400 dark:text-[#5B6180] py-1">{d[0]}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => {
            const tasks = cell.type === 'current' ? getTasksForDay(cell.day) : [];
            return (
              <button key={i}
                onClick={() => cell.type === 'current' && setSelected(cell.day)}
                className={cn(
                  'relative h-8 rounded-md text-[12px] font-medium flex items-center justify-center transition-all duration-150',
                  cell.type !== 'current' && 'text-gray-300 dark:text-[#3A3B52] pointer-events-none',
                  cell.type === 'current' && isToday(cell.day) && 'bg-indigo-600 text-white font-bold',
                  cell.type === 'current' && !isToday(cell.day) && selected === cell.day && 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 font-bold',
                  cell.type === 'current' && !isToday(cell.day) && selected !== cell.day && 'text-gray-700 dark:text-[#9CA3C8] hover:bg-gray-100 dark:hover:bg-[#1C1D30]',
                )}>
                {cell.day}
                {tasks.length > 0 && !isToday(cell.day) && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Full calendar — matches reference design with tall cells and full-width task bars
  return (
    <div className="flex flex-col lg:flex-row gap-5">
      {/* Calendar */}
      <div className="flex-1 bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5 overflow-x-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[20px] font-bold text-gray-900 dark:text-white">
            {MONTHS[current.month]} {current.year}
          </h2>
          <div className="flex gap-2">
            <button onClick={prev} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] flex items-center justify-center text-gray-500 hover:border-indigo-400 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={next} className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#1C1D30] border border-gray-200 dark:border-[#252742] flex items-center justify-center text-gray-500 hover:border-indigo-400 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        {/* Day headers — full names in purple like reference */}
        <div className="grid grid-cols-7 border-b border-indigo-200/60 dark:border-[#252742] mb-0">
          {DAYS_FULL.map(d => (
            <div key={d} className="text-center text-[13px] font-semibold text-indigo-500 dark:text-indigo-400 py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* Cells — tall boxes with task bars matching reference */}
        <div className="grid grid-cols-7 border-l border-indigo-200/60 dark:border-[#252742]">
          {cells.map((cell, i) => {
            const tasks = cell.type === 'current' ? getTasksForDay(cell.day) : [];
            const todayCell = cell.type === 'current' && isToday(cell.day);
            const isSaturday = i % 7 === 6;
            return (
              <button key={i}
                onClick={() => cell.type === 'current' && setSelected(cell.day)}
                onDoubleClick={() => cell.type === 'current' && addTaskForDay(cell.day)}
                className={cn(
                  'min-h-[130px] border-r border-b border-indigo-200/60 dark:border-[#252742] p-2.5 text-left transition-all duration-150 flex flex-col',
                  cell.type !== 'current' && 'bg-gray-50/40 dark:bg-[#0F1020]/30 pointer-events-none',
                  // Today: lavender fill + thick purple border
                  todayCell && 'bg-indigo-50/80 dark:bg-indigo-950/30 ring-2 ring-indigo-500 dark:ring-indigo-400 ring-inset',
                  // Saturday: subtle purple tint like reference
                  cell.type === 'current' && !todayCell && isSaturday && 'bg-indigo-50/40 dark:bg-indigo-950/10',
                  // Normal day
                  cell.type === 'current' && !todayCell && !isSaturday && 'bg-white dark:bg-[#151628] hover:bg-gray-50/70 dark:hover:bg-[#1A1B2E]',
                )}>
                {/* Date number — bold top-left, purple for today */}
                <span className={cn(
                  'text-[16px] font-bold mb-2',
                  cell.type !== 'current' && 'text-gray-300 dark:text-[#3A3B52]',
                  todayCell && 'text-indigo-600 dark:text-indigo-400',
                  cell.type === 'current' && !todayCell && 'text-gray-800 dark:text-[#c0c6e0]',
                )}>{cell.day}</span>

                {/* Task bars — full-width indigo bars with left accent border */}
                <div className="flex flex-col gap-[4px] w-full mt-auto">
                  {tasks.slice(0, 3).map(t => (
                    <div
                      key={t.id}
                      className={cn(
                        'w-full text-[11px] font-medium text-white rounded-[4px] px-2 py-[3px] truncate border-l-[3px]',
                        t.completed
                          ? 'bg-indigo-400/50 dark:bg-indigo-600/35 border-l-indigo-300 dark:border-l-indigo-500 line-through opacity-70'
                          : 'bg-indigo-600 dark:bg-indigo-500 border-l-indigo-800 dark:border-l-indigo-300',
                      )}
                    >
                      {t.title}
                    </div>
                  ))}
                  {tasks.length > 3 && (
                    <div className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 pl-1">+{tasks.length - 3} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side panel — selected day detail */}
      <div className="lg:w-80 bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5 flex-shrink-0">
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-1">
          {selected ? `${MONTHS[current.month]} ${selected}, ${current.year}` : 'Select a day'}
        </h3>
        <p className="text-[12px] text-gray-400 dark:text-[#5B6180] mb-4">
          {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} scheduled
        </p>

        {selectedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-[#5B6180]">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-3 opacity-40">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <p className="text-[13px] mb-3">No tasks this day</p>
            {selected && (
              <button
                onClick={() => addTaskForDay(selected)}
                className="text-[12px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add Task
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedTasks.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => dispatch({ type: 'OPEN_MODAL', payload: t })}
                className="w-full flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-[#1C1D30] border border-gray-100 dark:border-[#252742] text-left hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className={cn(
                  'w-1.5 min-h-[36px] rounded-full flex-shrink-0 mt-0.5',
                  t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-500',
                )} />
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-[13px] font-semibold truncate',
                    t.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white',
                  )}>{t.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-gray-400 dark:text-[#5B6180] capitalize">{t.category}</span>
                    <span className="text-gray-300 dark:text-[#3A3B52]">&middot;</span>
                    <span className="text-[11px] text-gray-400 dark:text-[#5B6180] capitalize">{t.priority}</span>
                    {t.dueTime && (
                      <>
                        <span className="text-gray-300 dark:text-[#3A3B52]">&middot;</span>
                        <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium">{t.dueTime}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {selected && (
              <button
                onClick={() => addTaskForDay(selected)}
                className="w-full text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-xl py-2.5 flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add Another Task
              </button>
            )}
          </div>
        )}

        {/* Unscheduled tasks hint */}
        {(() => {
          const unscheduled = state.tasks.filter(t => !t.dueDate);
          if (unscheduled.length === 0) return null;
          return (
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-[#1E2035]">
              <p className="text-[11px] font-bold text-gray-400 dark:text-[#5B6180] uppercase tracking-wider mb-2">Unscheduled</p>
              <p className="text-[12px] text-gray-400 dark:text-[#5B6180] mb-2">
                {unscheduled.length} task{unscheduled.length !== 1 ? 's' : ''} without a due date
              </p>
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                {unscheduled.slice(0, 8).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => dispatch({ type: 'OPEN_MODAL', payload: t })}
                    className="w-full text-left text-[12px] text-gray-600 dark:text-[#9CA3C8] hover:text-indigo-600 dark:hover:text-indigo-400 truncate py-1 px-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    {t.title}
                  </button>
                ))}
                {unscheduled.length > 8 && (
                  <p className="text-[11px] text-gray-400 dark:text-[#5B6180] pl-2">+{unscheduled.length - 8} more</p>
                )}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-[#5B6180] mt-2 italic">Click a task to add a due date</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
