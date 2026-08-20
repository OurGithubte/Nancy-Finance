import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const isPreflight = process.argv.includes("--preflight");
const migrationsDir = resolve(process.cwd(), "src/db/migrations");
const metaDir = join(migrationsDir, "meta");
const journalPath = join(metaDir, "_journal.json");

type Journal = {
  version: string;
  dialect: string;
  entries: Array<{
    idx: number;
    version: string;
    when: number;
    tag: string;
    breakpoints: boolean;
  }>;
};

function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not configured");
  if (!existsSync(journalPath)) fail("Missing src/db/migrations/meta/_journal.json");

  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
  const sqlFiles = readdirSync(migrationsDir)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  const expectedSqlFiles = journal.entries.map((entry) => `${entry.tag}.sql`);

  if (sqlFiles.length !== expectedSqlFiles.length) {
    fail(
      `Migration file/journal count mismatch. files=${sqlFiles.length}, journal=${expectedSqlFiles.length}`
    );
  }

  for (let i = 0; i < journal.entries.length; i += 1) {
    const entry = journal.entries[i];
    if (entry.idx !== i) fail(`Journal idx mismatch at ${entry.tag}: expected ${i}`);
    if (sqlFiles[i] !== expectedSqlFiles[i]) {
      fail(`Journal/file mismatch at idx ${i}: ${expectedSqlFiles[i]} != ${sqlFiles[i]}`);
    }

    const snapshot = join(metaDir, `${String(i).padStart(4, "0")}_snapshot.json`);
    if (!existsSync(snapshot)) fail(`Missing snapshot for ${entry.tag}: ${snapshot}`);
  }

  const sourceMigrations = journal.entries.map((entry) => {
    const file = join(migrationsDir, `${entry.tag}.sql`);
    return {
      idx: entry.idx,
      tag: entry.tag,
      createdAt: entry.when,
      hash: sha256File(file),
    };
  });

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const migrationTables = await sql`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name = '__drizzle_migrations'
    ORDER BY table_schema
  `;

  const hasDrizzleHistory = migrationTables.some(
    (row: any) => row.table_schema === "drizzle"
  );
  const hasLegacyPublicHistory = migrationTables.some(
    (row: any) => row.table_schema === "public"
  );

  if (hasLegacyPublicHistory) {
    fail("Legacy public.__drizzle_migrations exists; migration history is ambiguous");
  }

  let dbRows: Array<{ id: number; hash: string; created_at: string | number }> = [];
  if (hasDrizzleHistory) {
    dbRows = (await sql`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at, id
    `) as Array<{ id: number; hash: string; created_at: string | number }>;
  }

  if (dbRows.length > sourceMigrations.length) {
    fail(
      `Database migration history has more rows (${dbRows.length}) than source (${sourceMigrations.length})`
    );
  }

  for (let i = 0; i < dbRows.length; i += 1) {
    const dbRow = dbRows[i];
    const source = sourceMigrations[i];
    const dbCreatedAt = Number(dbRow.created_at);

    if (dbRow.hash !== source.hash) {
      fail(`Migration hash mismatch at ${source.tag}`);
    }
    if (dbCreatedAt !== source.createdAt) {
      fail(
        `Migration timestamp mismatch at ${source.tag}: db=${dbCreatedAt}, source=${source.createdAt}`
      );
    }
  }

  if (!isPreflight && dbRows.length !== sourceMigrations.length) {
    fail(
      `Pending migrations detected. database=${dbRows.length}, source=${sourceMigrations.length}`
    );
  }

  const requiredColumns: Array<[string, string]> = [
    ["financial_accounts", "is_active"],
    ["credit_cards", "is_active"],
    ["loans", "is_active"],
    ["saving_goals", "current_amount"],
    ["saving_goal_contributions", "saving_goal_id"],
  ];

  const columns = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `;
  const columnSet = new Set(columns.map((row: any) => `${row.table_name}.${row.column_name}`));
  const missingColumns = requiredColumns
    .map(([table, column]) => `${table}.${column}`)
    .filter((key) => !columnSet.has(key));

  if (missingColumns.length > 0) {
    fail(`Schema drift detected. Missing columns: ${missingColumns.join(", ")}`);
  }

  console.log(`Journal/source chain: PASS (${sourceMigrations.length} migrations)`);
  console.log(`Drizzle history prefix: PASS (${dbRows.length} rows)`);
  console.log("Legacy public migration history: ABSENT");
  console.log("Critical schema columns: PASS");
  console.log(
    isPreflight ? "MIGRATION PREFLIGHT: PASS" : "MIGRATION INTEGRITY: PASS"
  );
}

main().catch((error) => {
  console.error(isPreflight ? "MIGRATION PREFLIGHT: FAIL" : "MIGRATION INTEGRITY: FAIL");
  console.error(error);
  process.exitCode = 1;
});
