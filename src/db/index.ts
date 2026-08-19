import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:placeholder_pass@ep-demo-sample.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Use Pool (WebSocket) to support interactive transactions
const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
