import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const migrationsDir = path.join(process.cwd(), "src/db/migrations");
  
  const files = [
    "0000_flat_mojo.sql",
    "0001_wandering_stature.sql",
    "0002_tiny_hammerhead.sql",
    "0003_worried_inertia.sql"
  ];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
      VALUES (${i + 1}, ${hash}, ${Date.now()})
      ON CONFLICT DO NOTHING
    `;
    console.log(`Inserted ${file} with hash ${hash}`);
  }
}
main();
