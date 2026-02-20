'use client';

import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

export function Checkbox({ checked, onChange, className }: CheckboxProps) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'w-[18px] h-[18px] rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200',
        checked
          ? 'bg-emerald-500 border-emerald-500'
          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
        className
      )}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
