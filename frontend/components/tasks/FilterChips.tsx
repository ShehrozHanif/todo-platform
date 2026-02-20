'use client';

import { cn } from '@/lib/utils';

interface FilterChipsProps {
  active: string;
  onChange: (v: string) => void;
  catActive?: boolean;
  onCatClick?: () => void;
}

const filters = ['All', 'Today', 'High', 'Medium', 'Low', 'Completed'];

export function FilterChips({ active, onChange, catActive, onCatClick }: FilterChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {filters.map(f => (
        <button key={f} onClick={() => onChange(f)}
          className={cn(
            'px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-all duration-200',
            active === f
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white dark:bg-[#151628] border-gray-200 dark:border-[#252742] text-gray-500 dark:text-[#9CA3C8] hover:border-indigo-400 hover:text-indigo-600'
          )}>
          {f}
        </button>
      ))}

      {/* Mobile-only Category picker trigger */}
      {onCatClick && (
        <button
          onClick={onCatClick}
          className={cn(
            'md:hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-all duration-200',
            catActive
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white dark:bg-[#151628] border-gray-200 dark:border-[#252742] text-gray-500 dark:text-[#9CA3C8] hover:border-indigo-400 hover:text-indigo-600'
          )}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Category
        </button>
      )}
    </div>
  );
}
