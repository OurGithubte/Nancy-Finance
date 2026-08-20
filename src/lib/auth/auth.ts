import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

// `next build` statically evaluates this module. A hardcoded fallback secret
// would be a critical vulnerability if it ever shipped to production (it would
// let anyone forge a valid session token), so we only allow it to be missing
// during the build phase — any real request (dev or prod) must fail loudly.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const authSecret = process.env.BETTER_AUTH_SECRET;

if (!authSecret && !isBuildPhase) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Nancy Finance requires a strong, random secret in the server environment to sign session tokens securely."
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  secret: authSecret || "build-phase-only-unused-secret",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
});
