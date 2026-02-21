// [Task]: T006 [From]: specs/phase2-web/authentication/plan.md §Better Auth
// Better Auth server config with JWT plugin for Next.js.
// BETTER_AUTH_SECRET must match backend for cross-service JWT verification.
// Uses Neon HTTP driver via drizzle for stateless Vercel serverless compatibility.
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./auth-schema";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const isProduction = baseURL.startsWith("https://");
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
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
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    },
  },
});
