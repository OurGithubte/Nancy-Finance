import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const seq = await sql`SELECT pg_get_serial_sequence('drizzle.__drizzle_migrations', 'id') as seq`;
  console.log("Seq:", seq);
}
main();
