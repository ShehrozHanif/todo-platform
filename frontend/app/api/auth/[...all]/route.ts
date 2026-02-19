// [Task]: T008 [From]: specs/phase2-web/authentication/plan.md §Auth Routes
// Catch-all route that delegates all /api/auth/* requests to Better Auth.
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
