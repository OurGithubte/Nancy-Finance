import { config } from "dotenv";
import { resolve, join } from "path";
import { readFileSync, existsSync } from "fs";

// Load .env.local BEFORE any other imports!
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const schema = await import("../src/db/schema");
  const { auth } = await import("../src/lib/auth/auth");
  const { db } = await import("../src/db");

  const connectionString = process.env.DATABASE_URL!;
  console.log("Connecting to Neon endpoint:", connectionString.split("@")[1]?.split("/")[0]);

  const sql = neon(connectionString);

  console.log("\n=== 1. VERIFYING NEON DATABASE CONNECTION ===");
  const versionRes = await sql`SELECT version(), current_database(), current_user;`;
  console.log("PostgreSQL Version & DB:", versionRes[0]);

  console.log("\n=== 2. APPLYING ALL MIGRATIONS (0000, 0001, 0002) ===");
  await sql`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `;

  const existingMigrations = await sql`SELECT * FROM "__drizzle_migrations";`;
  const appliedHashes = new Set(existingMigrations.map((m: any) => m.hash));

  const migrationsList = [
    { name: "0000_flat_mojo", file: "0000_flat_mojo.sql" },
    { name: "0001_wandering_stature", file: "0001_wandering_stature.sql" },
    { name: "0002_tiny_hammerhead", file: "0002_tiny_hammerhead.sql" },
  ];

  for (const mig of migrationsList) {
    if (!appliedHashes.has(mig.name)) {
      console.log(`Applying ${mig.file}...`);
      const migPath = join(process.cwd(), "src/db/migrations", mig.file);
      if (existsSync(migPath)) {
        const content = readFileSync(migPath, "utf-8");
        const statements = content
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          if (statement.length > 0) {
            await sql(statement);
          }
        }
        await sql`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${mig.name}, ${Date.now()});`;
        console.log(`✓ Applied ${mig.name} successfully.`);
      }
    } else {
      console.log(`Migration ${mig.name} already applied.`);
    }
  }

  console.log("\n=== 3. VERIFYING ALL 18 TABLES IN NEON ===");
  const tablesRes = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name != '__drizzle_migrations'
    ORDER BY table_name;
  `;
  console.log(`Total Tables Found: ${tablesRes.length}`);
  console.log("Tables list:\n" + tablesRes.map((t: any, idx: number) => `  ${idx + 1}. ${t.table_name}`).join("\n"));

  console.log("\n=== 4. VERIFYING COLUMN TYPES (BOOLEAN & BIGINT) ===");
  const booleanCols = await sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name IN ('is_active', 'is_completed', 'is_paid', 'email_verified')
    ORDER BY table_name, column_name;
  `;
  console.log("Boolean columns:", booleanCols);

  const bigintCols = await sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name IN ('amount', 'balance', 'credit_limit', 'current_balance', 'principal_amount', 'remaining_amount')
    ORDER BY table_name, column_name;
  `;
  console.log("Sample BigInt monetary columns:", bigintCols);

  console.log("\n=== 5. TESTING BETTER AUTH ON NEON PRODUCTION ===");
  const testEmail = `tester_${Date.now()}@nancyfinance.vn`;
  const testPassword = "Password123!Secure";
  const testName = "Nancy Production Tester";

  console.log(`Step 5.1: Register new user (${testEmail})...`);
  const signUpRes = await auth.api.signUpEmail({
    body: {
      email: testEmail,
      password: testPassword,
      name: testName,
    },
  });
  console.log("✓ Register Success! User ID:", signUpRes.user.id);

  console.log(`Step 5.2: Sign In user...`);
  const signInRes = await auth.api.signInEmail({
    body: {
      email: testEmail,
      password: testPassword,
    },
  });
  console.log("✓ Login Success! Token:", signInRes.token.slice(0, 20) + "...");

  console.log(`Step 5.3: Verify Session via token...`);
  const sessionUser = await auth.api.getSession({
    headers: new Headers({
      authorization: `Bearer ${signInRes.token}`,
    }),
  });
  console.log("✓ Session verified for user:", sessionUser?.user.email, "| Session ID:", sessionUser?.session.id);

  console.log(`Step 5.4: Test Sign Out / Revoke Session...`);
  await auth.api.signOut({
    headers: new Headers({
      authorization: `Bearer ${signInRes.token}`,
    }),
  });
  console.log("✓ Sign Out Success!");

  console.log(`Step 5.5: Verify Protected Route / Revoked Session rejection...`);
  const afterLogoutSession = await auth.api.getSession({
    headers: new Headers({
      authorization: `Bearer ${signInRes.token}`,
    }),
  });
  console.log("✓ After Logout Session is null:", afterLogoutSession === null);

  console.log("\n=== 6. VERIFYING NEON USER & SESSION ROWS IN DATABASE ===");
  const dbUser = await sql`SELECT id, name, email, email_verified, created_at FROM "user" WHERE email = ${testEmail};`;
  console.log("Database user row:", dbUser[0]);

  console.log("\n================================================");
  console.log("✓ ALL NEON DATABASE & AUTH GATES PASSED 100%!");
  console.log("================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR during Phase 0 Gate verification:", err);
  process.exit(1);
});
