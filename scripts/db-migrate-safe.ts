import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const target = (process.env.DB_ENV || "").trim().toLowerCase();
const allowedTargets = new Set(["development", "test", "production"]);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

if (!allowedTargets.has(target)) {
  throw new Error(
    "DB_ENV must be explicitly set to development, test, or production before running migrations."
  );
}

if (process.env.VERCEL_ENV === "production" && target !== "production") {
  throw new Error("VERCEL_ENV=production but DB_ENV is not production. Refusing migration.");
}

if (
  target === "production" &&
  process.env.ALLOW_PRODUCTION_DB_MIGRATION !== "YES_I_UNDERSTAND"
) {
  throw new Error(
    "Production migration blocked. Set ALLOW_PRODUCTION_DB_MIGRATION=YES_I_UNDERSTAND for this command only after reviewing the migration."
  );
}

console.log(`Database migration target: ${target}`);
console.log("Running read-only migration integrity preflight...");

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const verify = spawnSync(pnpm, ["exec", "tsx", "scripts/verify-migrations.ts", "--preflight"], {
  stdio: "inherit",
  env: process.env,
});

if (verify.status !== 0) {
  process.exit(verify.status ?? 1);
}

console.log("Preflight PASS. Running Drizzle migration...");
const migrate = spawnSync(pnpm, ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: process.env,
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

console.log("Migration command completed. Running post-migration verification...");
const post = spawnSync(pnpm, ["exec", "tsx", "scripts/verify-migrations.ts"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(post.status ?? 1);
