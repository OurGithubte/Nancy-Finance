import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

// Script CHẨN ĐOÁN, chỉ SELECT — không ghi/sửa bất cứ thứ gì trong DB hay trên đĩa.
async function main() {
  const filePath = resolve(process.cwd(), "src/db/migrations/0005_burly_gunslinger.sql");
  const buf = readFileSync(filePath);
  const hash = createHash("sha256").update(buf).digest("hex");

  console.log("=== File hiện tại trên đĩa ===");
  console.log("Path       :", filePath);
  console.log("Bytes      :", buf.length);
  console.log("Chứa CRLF? :", buf.includes(0x0d) ? "CÓ (0x0D tồn tại)" : "KHÔNG");
  console.log("SHA256     :", hash);
  console.log("");
  console.log("--- Nội dung raw (hex 40 byte đầu) ---");
  console.log(buf.subarray(0, 40).toString("hex"));

  if (!process.env.DATABASE_URL) {
    console.error("Thiếu DATABASE_URL trong .env.local — không đọc được DB.");
    process.exitCode = 1;
    return;
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);

  const rows = (await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at, id
  `) as Array<{ id: number; hash: string; created_at: string | number }>;

  console.log("");
  console.log("=== Lịch sử migration đã APPLY trong DB (drizzle.__drizzle_migrations) ===");
  for (const r of rows) {
    console.log(`  id=${r.id}  created_at=${r.created_at}  hash=${r.hash}`);
  }

  const dbRowForIdx5 = rows[5];
  console.log("");
  if (!dbRowForIdx5) {
    console.log("Không có row thứ 6 (idx=5) trong DB — có thể migration 0005 CHƯA từng được apply thật sự.");
  } else if (dbRowForIdx5.hash === hash) {
    console.log("Hash KHỚP — không có mismatch (có thể do lần chạy verify trước đó có vấn đề khác).");
  } else {
    console.log("Hash LỆCH xác nhận: file trên đĩa đã thay đổi SAU KHI migration 0005 được apply vào DB.");
    console.log("DB hash   :", dbRowForIdx5.hash);
    console.log("File hash :", hash);
  }
}

main().catch((error) => {
  console.error("DIAGNOSE FAILED:", error);
  process.exitCode = 1;
});
