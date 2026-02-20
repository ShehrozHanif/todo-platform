'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';
import { BarChart } from '@/components/analytics/BarChart';
import { DonutChart } from '@/components/analytics/DonutChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { categoryColors, categoryLabels } from '@/lib/data';
import { cn } from '@/lib/utils';

const CATEGORIES = ['work', 'personal', 'study', 'health'] as const;

export default function AnalyticsPage() {
  const { state, dispatch } = useTaskContext();
  const router = useRouter();
  const streakRef = useRef<HTMLDivElement>(null);

  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const highCompleted = state.tasks.filter(t => t.priority === 'high' && t.completed).length;
  const highTotal = state.tasks.filter(t => t.priority === 'high').length;

  function goToTasks(filter: string, category?: string) {
    dispatch({ type: 'SET_CATEGORY', payload: category ?? null });
    dispatch({ type: 'SET_FILTER', payload: filter });
    router.push('/tasks');
  }

  function scrollToStreak() {
    streakRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div className="p-5 md:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Analytics</h2>
        <p className="text-[13px] text-gray-500 dark:text-[#9CA3C8] mt-0.5">Track your productivity trends</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          num={`${completionRate}%`}
          label="Completion Rate"
          sub="Overall progress"
          subColor="text-indigo-500"
          accentColor="#4F46E5"
          accentBg="#4F46E510"
          delay={0}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
          }
          onClick={() => goToTasks('All')}
        />
        <StatCard
          num={completed}
          label="Tasks Done"
          sub="Total completed"
          subColor="text-emerald-500"
          accentColor="#10B981"
          accentBg="#10B98110"
          delay={0.07}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          }
          onClick={() => goToTasks('Completed')}
        />
        <StatCard
          num="🔥 14"
          label="Day Streak"
          sub="Keep it up!"
          subColor="text-amber-500"
          accentColor="#F59E0B"
          accentBg="#F59E0B10"
          delay={0.14}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2c0 6-6 8-6 13a6 6 0 0012 0c0-5-6-7-6-13z" />
              <path d="M12 22v-4" />
            </svg>
          }
          onClick={scrollToStreak}
        />
        <StatCard
          num={`${highTotal > 0 ? Math.round(highCompleted / highTotal * 100) : 0}%`}
          label="High Priority"
          sub="Completion rate"
          subColor="text-red-500"
          accentColor="#EF4444"
          accentBg="#EF444410"
          delay={0.21}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          onClick={() => goToTasks('High')}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <BarChart />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <DonutChart />
        </motion.div>
      </div>

      {/* Category breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5"
      >
        <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-5">Progress by Category</h3>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map(cat => {
            const catTotal = state.tasks.filter(t => t.category === cat).length;
            const catDone = state.tasks.filter(t => t.category === cat && t.completed).length;
            const pct = catTotal > 0 ? Math.round((catDone / catTotal) * 100) : 0;
            return (
              <motion.button
                key={cat}
                type="button"
                onClick={() => goToTasks('All', cat)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
                className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1C1D30] transition-colors duration-150 group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColors[cat] }} />
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {categoryLabels[cat]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-gray-400 dark:text-[#5B6180]">{catDone}/{catTotal} done</span>
                    <span className="text-[12px] font-bold w-8 text-right" style={{ color: categoryColors[cat] }}>{pct}%</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      className="text-gray-300 dark:text-[#3A3C57] group-hover:text-indigo-400 transition-colors flex-shrink-0">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-[#1C1D30] overflow-hidden ml-[18px]">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ backgroundColor: categoryColors[cat] }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Streak grid */}
      <motion.div
        ref={streakRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-5 bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Activity Streak</h3>
          <span className="text-[13px] font-bold text-amber-500">🔥 14 days</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: 28 }).map((_, i) => {
            const active = i < 14;
            return (
              <div
                key={i}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors',
                  active ? 'bg-gradient-to-br from-orange-400 to-amber-400' : 'bg-gray-100 dark:bg-[#1C1D30]'
                )}
              >
                {active ? '🔥' : ''}
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-gray-400 dark:text-[#5B6180] mt-3">Keep completing tasks daily to extend your streak!</p>
      </motion.div>
    </div>
  );
}
