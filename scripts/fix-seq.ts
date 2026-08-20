import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`SELECT setval('drizzle.__drizzle_migrations_id_seq', (SELECT MAX(id) FROM drizzle.__drizzle_migrations))`;
  console.log("Sequence fixed!");
}
main();
