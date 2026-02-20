'use client';

import { motion } from 'framer-motion';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { useTaskContext } from '@/context/TaskContext';
import { formatDate, isOverdue } from '@/lib/utils';

export default function CalendarPage() {
  const { state, dispatch } = useTaskContext();
  const upcomingTasks = state.tasks
    .filter(t => !t.completed && t.dueDate)
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
    .slice(0, 5);

  function openTask(task: typeof upcomingTasks[0]) {
    dispatch({ type: 'OPEN_MODAL', payload: task });
  }

  return (
    <div className="p-5 md:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Calendar</h2>
        <p className="text-[13px] text-gray-500 dark:text-[#9CA3C8] mt-0.5">Plan and review your tasks visually</p>
      </div>

      <CalendarGrid />

      {/* Upcoming deadlines */}
      {upcomingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5"
        >
          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-4">Upcoming Deadlines</h3>
          <div className="flex flex-col gap-2">
            {upcomingTasks.map(t => {
              const overdue = isOverdue(t.dueDate);
              const priorityDot = t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-500';
              const priorityBadge = t.priority === 'high'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : t.priority === 'medium'
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';

              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => openTask(t)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#1C1D30] border border-gray-100 dark:border-[#252742] text-left hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 active:bg-indigo-50 transition-colors duration-150 cursor-pointer group"
                >
                  {/* Priority bar */}
                  <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${priorityDot}`} />

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-[#5B6180] capitalize">{t.category}</p>
                  </div>

                  {/* Date + priority badge */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <p className={`text-[12px] font-semibold ${overdue ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                      {overdue ? 'Overdue' : formatDate(t.dueDate)}
                    </p>
                    {overdue && (
                      <p className="text-[10px] text-gray-400 dark:text-[#5B6180]">{formatDate(t.dueDate)}</p>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityBadge}`}>
                      {t.priority}
                    </span>
                  </div>

                  {/* Tap/click chevron hint */}
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    className="text-gray-300 dark:text-[#3A3C57] group-hover:text-indigo-400 transition-colors flex-shrink-0"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
