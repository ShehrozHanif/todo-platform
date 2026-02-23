import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TaskFlow — Stay organised',
  description: 'A beautiful task management app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script runs before React hydrates — prevents dark/light flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('taskflow-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s===null&&d)){document.documentElement.classList.add('dark')}})()` }} />
        {/* OpenAI ChatKit web component — required for chat UI */}
        <script src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js" async />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
