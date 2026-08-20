import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const migrations = await sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY id ASC`;
  console.log("Migrations:", migrations);
}
main();
