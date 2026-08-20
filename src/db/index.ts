import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// `next build` statically imports server modules to collect route metadata,
// so this file is evaluated even when no real database is needed yet.
// We must NOT fall back to a fake connection string at runtime: doing so
// would silently point production traffic at a bogus/placeholder database.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && !isBuildPhase) {
  throw new Error(
    "DATABASE_URL is not set. Nancy Finance requires a valid Neon PostgreSQL connection string in the server environment (.env.local locally, or the hosting provider's environment variables in production)."
  );
}

// Use Pool (WebSocket) to support interactive transactions
const pool = new Pool({ connectionString: connectionString || "postgresql://placeholder/build" });

export const db = drizzle(pool, { schema });
