'use client';

import { useEffect, useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { Button } from '@/components/ui/Button';

export function WelcomeBanner() {
  const { state, dispatch } = useTaskContext();
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const [greeting, setGreeting] = useState('Good day');
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
  }, []);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-7 text-white mb-6">
      {/* Background checkmark */}
      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[120px] font-black opacity-[.06] leading-none select-none">✓</span>

      <div className="relative z-10">
        <p className="text-indigo-200 text-sm font-medium mb-1">{greeting},</p>
        <h2 className="text-2xl font-extrabold mb-1">Shehroz</h2>
        <p className="text-indigo-200 text-sm mb-5">
          You've completed <strong className="text-white">{completed} of {total}</strong> tasks today.
        </p>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[12px] text-indigo-200">
          <span>{pct}% complete</span>
          <span>🔥 14 day streak</span>
        </div>

        <Button
          size="sm"
          className="mt-5 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm shadow-none"
          onClick={() => dispatch({ type: 'OPEN_MODAL' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Task
        </Button>
      </div>
    </div>
  );
}
