'use client';

import { useTaskContext } from '@/context/TaskContext';
import { categoryColors, categoryLabels } from '@/lib/data';

const CATEGORIES = ['work', 'personal', 'study', 'health'] as const;
const SIZE = 160;
const STROKE = 22;
const R = (SIZE / 2) - STROKE / 2;
const CIRC = 2 * Math.PI * R;

export function DonutChart() {
  const { state } = useTaskContext();
  const total = state.tasks.length || 1;

  const slices = CATEGORIES.map(cat => ({
    cat,
    count: state.tasks.filter(t => t.category === cat).length,
    pct: state.tasks.filter(t => t.category === cat).length / total,
  }));

  let offset = 0;
  const arcs = slices.map(s => {
    const dash = s.pct * CIRC;
    const gap = CIRC - dash;
    const currentOffset = offset;
    offset += dash;
    return { ...s, dash, gap, offset: currentOffset };
  });

  const completed = state.tasks.filter(t => t.completed).length;
  const completedPct = Math.round((completed / state.tasks.length) * 100) || 0;

  return (
    <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5">
      <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-5">Distribution</h3>

      <div className="flex items-center gap-6">
        {/* SVG donut */}
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
            {arcs.map(arc => (
              <circle key={arc.cat}
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                fill="none"
                stroke={categoryColors[arc.cat]}
                strokeWidth={STROKE}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-none">{completedPct}%</p>
            <p className="text-[11px] text-gray-400 dark:text-[#5B6180] mt-0.5">done</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1">
          {slices.map(({ cat, count, pct }) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColors[cat] }} />
              <span className="text-[13px] text-gray-600 dark:text-[#9CA3C8] flex-1">{categoryLabels[cat]}</span>
              <span className="text-[12px] font-semibold text-gray-900 dark:text-white">{count}</span>
              <span className="text-[11px] text-gray-400 dark:text-[#5B6180] w-8 text-right">{Math.round(pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
