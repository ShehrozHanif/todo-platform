'use client';

import { cn } from '@/lib/utils';

interface ToggleProps {
  on: boolean;
  onToggle: () => void;
  className?: string;
}

export function Toggle({ on, onToggle, className }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0',
        on ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700',
        className
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          on && 'translate-x-[18px]'
        )}
      />
    </button>
  );
}
