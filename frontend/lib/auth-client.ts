// [Task]: T007 [From]: specs/phase2-web/authentication/plan.md §Auth Client
"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Convenience exports for components
export const { signIn, signUp, signOut, useSession } = authClient;
