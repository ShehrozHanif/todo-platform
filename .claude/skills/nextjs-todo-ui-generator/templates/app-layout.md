# App Layout & Landing Page Template

## frontend/app/layout.tsx

```typescript
// [Task]: T00X [From]: specs/phase2-web/frontend-ui/plan.md §Layout
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

## Key Points — Layout

- **Server component** (no `"use client"`) — metadata export requires server component
- `globals.css` includes Tailwind directives (`@tailwind base/components/utilities`)
- `antialiased` class for better font rendering
- No providers needed at root — Better Auth client works without a provider wrapper
- Children render inside `<body>` — each page provides its own structure

---

## frontend/app/page.tsx

```typescript
// [Task]: T00X [From]: specs/phase2-web/frontend-ui/plan.md §Landing
"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending) {
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}
```

## Key Points — Landing

- Checks auth state on mount
- Authenticated → `/dashboard`
- Unauthenticated → `/login`
- Shows "Redirecting..." briefly during session check
- `"use client"` needed for `useSession()` hook and `useRouter()`
- `router.replace()` (not `push`) so user can't go "back" to the redirect page
