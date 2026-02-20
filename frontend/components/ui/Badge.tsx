import { cn } from '@/lib/utils';
import { Priority } from '@/lib/types';

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const styles: Record<Priority, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold', styles[priority], className)}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

interface CategoryBadgeProps {
  category: string;
  color?: string;
  className?: string;
}

export function CategoryBadge({ category, color, className }: CategoryBadgeProps) {
  const builtInStyles: Record<string, string> = {
    work: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    personal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    study: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  };

  if (builtInStyles[category]) {
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold', builtInStyles[category], className)}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  }

  // Custom category — use the color prop
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold', className)}
      style={color ? { backgroundColor: `${color}20`, color } : { backgroundColor: '#4F46E520', color: '#4F46E5' }}
    >
      {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />}
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}
