'use client';

import { motion } from 'framer-motion';

interface StatCardProps {
  num: number | string;
  label: string;
  sub?: string;
  subColor?: string;
  accentColor?: string;   // e.g. '#4F46E5'
  accentBg?: string;      // e.g. '#4F46E510'
  icon?: React.ReactNode;
  delay?: number;
  onClick?: () => void;
}

export function StatCard({
  num, label, sub, subColor = 'text-emerald-500',
  accentColor, accentBg, icon, delay = 0, onClick,
}: StatCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="w-full text-left bg-white dark:bg-[#151628] border border-gray-200 dark:border-[#252742] rounded-2xl p-5 hover:shadow-lg hover:border-opacity-60 transition-shadow duration-200 cursor-pointer group focus:outline-none"
      style={accentColor ? { ['--accent' as string]: accentColor } : undefined}
    >
      {/* Icon bubble */}
      {icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: accentBg ?? '#4F46E510' }}
        >
          <span style={{ color: accentColor ?? '#4F46E5' }}>{icon}</span>
        </div>
      )}

      <p className="text-3xl font-extrabold text-gray-900 dark:text-white leading-none">{num}</p>
      <p className="text-[12px] text-gray-400 dark:text-[#5B6180] mt-1 font-medium">{label}</p>
      {sub && <p className={`text-[11px] font-semibold mt-2 ${subColor}`}>{sub}</p>}

      {/* Arrow hint on hover */}
      <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[11px] font-semibold" style={{ color: accentColor ?? '#6366F1' }}>
          View tasks
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ color: accentColor ?? '#6366F1' }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  );
}
