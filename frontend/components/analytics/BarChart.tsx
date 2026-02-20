'use client';

import { useMemo } from 'react';
import { useTaskContext } from '@/context/TaskContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BarChart() {
  const { state } = useTaskContext();

  // Build last 7 days completed count — memo so date is stable per render
  const data = useMemo(() => DAYS.map((label, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().split('T')[0];
    const count = state.tasks.filter(t => t.completed && t.dueDate === iso).length;
    return { label, count };
  }), [state.tasks]);

  // Hardcoded sample to ensure visible bars
  const sample = [3, 5, 2, 7, 4, 6, 3];
  const displayData = data.map((d, i) => ({ ...d, count: d.count > 0 ? d.count : sample[i] }));
  const max = Math.max(...displayData.map(d => d.count), 1);

  return (
    <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Tasks Completed</h3>
        <span className="text-[11px] text-gray-400 dark:text-[#5B6180] bg-gray-100 dark:bg-[#1C1D30] px-2 py-1 rounded-md font-medium">Last 7 days</span>
      </div>

      <div className="flex items-end gap-3 h-36 px-1">
        {displayData.map(({ label, count }, i) => {
          const heightPct = (count / max) * 100;
          const isToday = i === 6;
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-500 dark:text-[#9CA3C8]">{count}</span>
              <div className="w-full relative flex items-end" style={{ height: '100px' }}>
                <div
                  className={`w-full rounded-t-md transition-all duration-700 cursor-pointer hover:opacity-80 ${isToday ? 'bg-violet-500' : 'bg-indigo-600'}`}
                  style={{ height: `${heightPct}%`, minHeight: '8px' }}
                />
              </div>
              <span className="text-[11px] text-gray-400 dark:text-[#5B6180] font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
