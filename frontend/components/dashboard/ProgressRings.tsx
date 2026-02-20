'use client';

import { useTaskContext } from '@/context/TaskContext';
import { categoryColors, categoryLabels } from '@/lib/data';

const CATEGORIES = ['work', 'personal', 'study', 'health'] as const;
const R = 28;
const CIRC = 2 * Math.PI * R;

export function ProgressRings() {
  const { state } = useTaskContext();

  return (
    <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5">
      <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-4">By Category</h3>
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map(cat => {
          const total = state.tasks.filter(t => t.category === cat).length;
          const done = state.tasks.filter(t => t.category === cat && t.completed).length;
          const pct = total > 0 ? done / total : 0;
          const color = categoryColors[cat];

          return (
            <div key={cat} className="flex items-center gap-3">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="32" cy="32" r={R} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-[#1C1D30]" />
                  <circle cx="32" cy="32" r={R} fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-gray-900 dark:text-white">
                  {Math.round(pct * 100)}%
                </span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{categoryLabels[cat]}</p>
                <p className="text-[11px] text-gray-400 dark:text-[#5B6180]">{done}/{total} done</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
