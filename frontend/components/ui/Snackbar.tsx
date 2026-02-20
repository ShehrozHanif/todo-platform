'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SnackbarProps {
  message: string;
  show: boolean;
  onHide: () => void;
}

export function Snackbar({ message, show, onHide }: SnackbarProps) {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onHide, 3000);
      return () => clearTimeout(t);
    }
  }, [show, onHide]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.22 }}
          className="fixed bottom-24 md:bottom-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-lg px-5 py-3 text-sm font-medium z-[2000] flex items-center gap-2.5 whitespace-nowrap shadow-lg"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
