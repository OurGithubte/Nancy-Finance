import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const target = (process.env.DB_ENV || "").trim().toLowerCase();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

if (!target) {
  throw new Error("DB_ENV must be explicitly set before running db:push");
}

if (target === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error(
    "db:push is permanently disabled for production. Generate a migration and use pnpm db:migrate instead."
  );
}

if (target !== "development" && target !== "test") {
  throw new Error("db:push is allowed only when DB_ENV=development or DB_ENV=test");
}

console.log(`db:push target: ${target}`);
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(pnpm, ["exec", "drizzle-kit", "push"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
