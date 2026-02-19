// [Task]: T005 [From]: specs/phase2-web/frontend-ui/plan.md §API Client
// Custom token endpoint: verifies Better Auth session, issues HS256 JWT
// that the FastAPI backend can verify with BETTER_AUTH_SECRET.
import { auth } from "@/lib/auth";
import { SignJWT } from "jose";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sign HS256 JWT with shared secret — backend verifies with same key
    const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET!);
    const token = await new SignJWT({ sub: session.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secret);

    return Response.json({ token });
  } catch {
    return Response.json({ error: "Token generation failed" }, { status: 500 });
  }
}
