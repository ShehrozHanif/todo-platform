'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 text-white shadow-[0_2px_10px_rgba(79,70,229,.3)] hover:bg-indigo-700 hover:shadow-[0_4px_16px_rgba(79,70,229,.4)] active:scale-[.98]',
    outline: 'bg-white dark:bg-surface border border-border text-text1 hover:border-indigo-500 hover:text-indigo-600',
    ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:scale-[.98]',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-[15px]',
  };
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
