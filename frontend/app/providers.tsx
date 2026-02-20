'use client';

// No ThemeProvider needed — useTheme() hook reads/writes the DOM directly.
// This file exists as a client boundary wrapper for any future providers.
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
