# Next.js App Router Reference

## App Router Structure

Next.js 16+ uses file-based routing in the `app/` directory:

```
app/
├── layout.tsx       # Root layout (wraps ALL pages)
├── page.tsx         # Route: /
├── login/
│   └── page.tsx     # Route: /login
├── signup/
│   └── page.tsx     # Route: /signup
└── dashboard/
    └── page.tsx     # Route: /dashboard
```

Each `page.tsx` is a route. Each `layout.tsx` wraps its siblings and children.

## Server vs Client Components

**Server components** (default — no directive):
- Render on the server, send HTML to client
- Can access server-side resources (DB, env vars without NEXT_PUBLIC_)
- Cannot use hooks, event handlers, or browser APIs

**Client components** (`"use client"` directive):
- Render on client, support interactivity
- Can use `useState`, `useEffect`, event handlers
- Required for: forms, buttons, modals, any user interaction

```typescript
"use client";  // Must be FIRST line of file
import { useState } from "react";
```

### When to Use Which

| Server Component | Client Component |
|------------------|------------------|
| Static content, layouts | Forms, buttons, modals |
| Data fetching (async) | useState, useEffect |
| No user interaction | Event handlers (onClick, onSubmit) |
| SEO-critical content | Real-time updates |

## Root Layout Pattern

```typescript
// app/layout.tsx — Server component (no "use client")
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo Platform",
  description: "Manage your tasks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

## Navigation

```typescript
"use client";
import { useRouter } from "next/navigation";

const router = useRouter();
router.push("/dashboard");  // Programmatic navigation
router.replace("/login");    // Replace history entry
```

Or with `Link`:
```typescript
import Link from "next/link";
<Link href="/login">Login</Link>
```

## Environment Variables

- `NEXT_PUBLIC_*` — exposed to browser (client-side)
- Without prefix — server-only (layouts, API routes)

```typescript
// Client component can access:
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server component / API route can access:
const secret = process.env.BETTER_AUTH_SECRET;
```

## Tailwind CSS Setup

Next.js with `--tailwind` flag auto-configures:
- `tailwind.config.ts` — content paths set to `app/` and `components/`
- `app/globals.css` — includes `@tailwind base/components/utilities`
- Ready to use in any component with `className="..."`

## Loading & Error States

```typescript
// app/dashboard/loading.tsx — auto shown while page loads
export default function Loading() {
  return <div>Loading tasks...</div>;
}

// app/dashboard/error.tsx — auto shown on errors
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <div>Something went wrong. <button onClick={reset}>Retry</button></div>;
}
```

## Redirect Pattern

```typescript
// app/page.tsx — redirect landing to dashboard or login
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

Or client-side:
```typescript
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

useEffect(() => {
  router.replace("/dashboard");
}, []);
```
