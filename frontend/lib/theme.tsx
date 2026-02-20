'use client';

// Direct DOM-based dark mode hook.
// No context/provider needed — each consumer reads/writes document.documentElement.classList directly.
// Components stay in sync via MutationObserver watching <html> class changes.

import { useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'taskflow-theme';

export function useTheme() {
  const [resolvedTheme, setResolvedTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    // Read current DOM state (the inline <script> in layout.tsx already applied the class)
    setResolvedTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    // Stay in sync when another component toggles the class
    const observer = new MutationObserver(() => {
      setResolvedTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((t: Theme) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, t);
    // MutationObserver fires → setResolvedTheme updates automatically
  }, []);

  return { resolvedTheme, setTheme };
}
