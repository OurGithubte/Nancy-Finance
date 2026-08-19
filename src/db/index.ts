import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:placeholder_pass@ep-demo-sample.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

// Neon HTTP client for edge and serverless environments
const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
