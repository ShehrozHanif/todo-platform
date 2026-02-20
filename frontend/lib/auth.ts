// [Task]: T006 [From]: specs/phase2-web/authentication/plan.md §Better Auth
// Better Auth server config with JWT plugin for Next.js.
// BETTER_AUTH_SECRET must match backend for cross-service JWT verification.
// Uses @neondatabase/serverless Pool for Vercel serverless compatibility.
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "@neondatabase/serverless";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL!,
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL,
  trustedOrigins: [baseURL],
  plugins: [
    jwt({
      jwt: {
        expiresIn: "7d",
        issuer: "todo-platform",
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      secure: true,
      sameSite: "lax",
      path: "/",
    },
  },
});
