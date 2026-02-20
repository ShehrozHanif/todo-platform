// [Task]: T008 [From]: specs/phase2-web/authentication/plan.md §Auth Routes
// Catch-all route that delegates all /api/auth/* requests to Better Auth.
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const { GET: _GET, POST: _POST } = toNextJsHandler(auth);

export async function GET(req: Request) {
  try {
    return await _GET(req);
  } catch (e) {
    console.error("[AUTH GET ERROR]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(req: Request) {
  try {
    return await _POST(req);
  } catch (e) {
    console.error("[AUTH POST ERROR]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
