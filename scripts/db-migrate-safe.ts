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
// QUAN TRỌNG: `shell: true` là bắt buộc trên Windows. Kể từ các bản vá bảo mật của
// Node.js chặn command-injection qua .bat/.cmd (CVE-2024-27980 và các bản đã áp dụng
// tương tự), spawn trực tiếp một file `.cmd` (như `pnpm.cmd`) mà KHÔNG có `shell: true`
// sẽ thất bại ngay lập tức — không chạy được subprocess, không in ra bất kỳ output nào
// từ verify-migrations.ts, chỉ để lại exit code khác 0. Đây là nguyên nhân khiến
// `pnpm db:migrate` fail câm lặng ở bước preflight dù chạy trực tiếp
// `npx tsx scripts/verify-migrations.ts --preflight` vẫn PASS bình thường.
const spawnOpts = {
  stdio: "inherit" as const,
  env: process.env,
  shell: process.platform === "win32",
};

function runStep(label: string, args: string[]) {
  const result = spawnSync(pnpm, args, spawnOpts);
  if (result.error) {
    console.error(`${label} failed to start:`, result.error);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`${label} terminated by signal ${result.signal}`);
    process.exit(1);
  }
  return result;
}

const verify = runStep("Preflight verify", ["exec", "tsx", "scripts/verify-migrations.ts", "--preflight"]);
if (verify.status !== 0) {
  process.exit(verify.status ?? 1);
}

console.log("Preflight PASS. Running Drizzle migration...");
const migrate = runStep("Drizzle migrate", ["exec", "drizzle-kit", "migrate"]);
if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

console.log("Migration command completed. Running post-migration verification...");
const post = runStep("Post-migration verify", ["exec", "tsx", "scripts/verify-migrations.ts"]);

process.exit(post.status ?? 1);
