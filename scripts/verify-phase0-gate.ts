import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

/**
 * Read-only Phase 0 / database integrity verification.
 *
 * IMPORTANT:
 * - This script MUST NOT mutate schema, migration history, users, sessions, or app data.
 * - It is safe to run against production because it only performs SELECT statements.
 */
async function main() {
  const { neon } = await import("@neondatabase/serverless");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);

  console.log("=== NANCY FINANCE READ-ONLY DATABASE VERIFICATION ===");

  const dbInfo = await sql`
    SELECT current_database() AS database, current_user AS role, version() AS version
  `;
  console.log("Database:", dbInfo[0]);

  const requiredTables = [
    "user",
    "session",
    "account",
    "financial_accounts",
    "categories",
    "transactions",
    "credit_cards",
    "loans",
    "budgets",
    "saving_goals",
    "saving_goal_contributions",
  ];

  const tableRows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const existingTables = new Set(tableRows.map((row: any) => row.table_name));
  const missingTables = requiredTables.filter((name) => !existingTables.has(name));

  if (missingTables.length > 0) {
    throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
  }

  const requiredColumns: Array<[string, string]> = [
    ["financial_accounts", "is_active"],
    ["credit_cards", "is_active"],
    ["loans", "is_active"],
    ["saving_goals", "current_amount"],
    ["saving_goal_contributions", "saving_goal_id"],
  ];

  const columnRows = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const columnSet = new Set(
    columnRows.map((row: any) => `${row.table_name}.${row.column_name}`)
  );
  const missingColumns = requiredColumns
    .map(([table, column]) => `${table}.${column}`)
    .filter((key) => !columnSet.has(key));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
  }

  const drizzleHistory = await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `;

  if (drizzleHistory.length === 0) {
    throw new Error("drizzle.__drizzle_migrations is empty");
  }

  const legacyHistory = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = '__drizzle_migrations'
    ) AS exists
  `;

  if (legacyHistory[0]?.exists) {
    throw new Error(
      "Legacy public.__drizzle_migrations still exists. Migration history is ambiguous."
    );
  }

  console.log(`Required tables: PASS (${requiredTables.length})`);
  console.log(`Required columns: PASS (${requiredColumns.length})`);
  console.log(`Drizzle migration history rows: ${drizzleHistory.length}`);
  console.log("Legacy public migration history: ABSENT");
  console.log("DATABASE INTEGRITY VERIFICATION: PASS");
}

main().catch((error) => {
  console.error("DATABASE INTEGRITY VERIFICATION: FAIL");
  console.error(error);
  process.exitCode = 1;
});
