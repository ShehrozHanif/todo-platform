// [Task]: T008 [From]: specs/phase2-web/authentication/plan.md §Auth Routes
// Catch-all route that delegates all /api/auth/* requests to Better Auth.
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const { GET: _GET, POST: _POST } = toNextJsHandler(auth);

export async function GET(req: Request) {
  try {
    return await _GET(req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.stack || e.message : String(e);
    console.error("[AUTH GET ERROR]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    return await _POST(req);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.stack || e.message : String(e);
    console.error("[AUTH POST ERROR]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
