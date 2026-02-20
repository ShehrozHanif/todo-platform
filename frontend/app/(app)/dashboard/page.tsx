'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTaskContext } from '@/context/TaskContext';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { StatCard } from '@/components/dashboard/StatCard';
import { ProgressRings } from '@/components/dashboard/ProgressRings';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Snackbar } from '@/components/ui/Snackbar';
import { useState } from 'react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function DashboardPage() {
  const { state, dispatch } = useTaskContext();
  const router = useRouter();
  const [snack, setSnack] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.completed).length;
  const pending = total - completed;
  const high = state.tasks.filter(t => t.priority === 'high' && !t.completed).length;

  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);
  const todayTasks = state.tasks.filter(t => t.dueDate === todayStr);
  const recentTasks = state.tasks.slice(0, 4);

  function handleSnack(msg: string) {
    setSnack(msg);
    setShowSnack(true);
  }

  function goToTasks(filter: string) {
    dispatch({ type: 'SET_CATEGORY', payload: null });
    dispatch({ type: 'SET_FILTER', payload: filter });
    router.push('/tasks');
  }

  return (
    <div className="p-5 md:p-7">
      <WelcomeBanner />

      {/* Stat cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          num={total}
          label="Total Tasks"
          sub="All time"
          subColor="text-indigo-500"
          accentColor="#4F46E5"
          accentBg="#4F46E510"
          delay={0}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
          onClick={() => goToTasks('All')}
        />
        <StatCard
          num={completed}
          label="Completed"
          sub={`${total ? Math.round(completed / total * 100) : 0}% done`}
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
          num={pending}
          label="Pending"
          sub="In progress"
          subColor="text-amber-500"
          accentColor="#F59E0B"
          accentBg="#F59E0B10"
          delay={0.14}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          }
          onClick={() => goToTasks('All')}
        />
        <StatCard
          num={high}
          label="High Priority"
          sub="Needs attention"
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
      </motion.div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Recent tasks */}
          <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Recent Tasks</h3>
              <a href="/tasks" className="text-[12px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">View all</a>
            </div>
            <div>
              {recentTasks.map(task => (
                <TaskCard key={task.id} task={task} onSnack={handleSnack} />
              ))}
            </div>
          </div>

          {/* Today's tasks */}
          {todayTasks.length > 0 && (
            <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5">
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-4">Due Today</h3>
              {todayTasks.map(task => (
                <TaskCard key={task.id} task={task} onSnack={handleSnack} />
              ))}
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="flex flex-col gap-5">
          <ProgressRings />
          <CalendarGrid mini />

          {/* Streak */}
          <div className="bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Daily Streak</h3>
              <span className="text-[13px] font-bold text-amber-500">🔥 14</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center text-sm bg-gradient-to-br from-orange-400 to-amber-400">
                  🔥
                </div>
              ))}
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-[#1C1D30]" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Snackbar message={snack} show={showSnack} onHide={() => setShowSnack(false)} />
    </div>
  );
}
