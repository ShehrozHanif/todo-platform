// [Task]: T017 [From]: specs/phase2-web/frontend-ui/tasks.md §T017
// Root layout — server component, metadata, Tailwind globals.
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo Platform",
  description: "Manage your tasks with a modern web interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
