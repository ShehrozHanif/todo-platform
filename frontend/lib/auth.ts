// [Task]: T006 [From]: specs/phase2-web/authentication/plan.md §Better Auth
// Better Auth server config with JWT plugin for Next.js.
// BETTER_AUTH_SECRET must match backend for cross-service JWT verification.
// Uses pg Pool directly for Neon SSL compatibility.
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
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
});
