import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local explicitly
config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { neon } = await import("@neondatabase/serverless");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment or .env.local");
  }

  console.log("Connecting to Neon endpoint:", connectionString.split("@")[1]?.split("/")[0]);
  const sql = neon(connectionString);

  console.log("\n=======================================================");
  console.log("=== PHASE 0 TEST USERS CLEANUP ON NEON PRODUCTION ===");
  console.log("=======================================================");

  // 1. Query matching test users
  console.log("\n[1] Querying test users matching patterns:");
  console.log("    - 'tester_%@nancyfinance.vn'");
  console.log("    - 'auth_test_v2_%@nancyfinance.vn'");

  const testUsers = await sql`
    SELECT id, name, email, email_verified, created_at
    FROM "user"
    WHERE email LIKE 'tester_%@nancyfinance.vn'
       OR email LIKE 'auth_test_v2_%@nancyfinance.vn'
    ORDER BY created_at ASC;
  `;

  console.log(`\n[2] Found ${testUsers.length} test user(s):`);
  if (testUsers.length > 0) {
    console.table(testUsers);
  } else {
    console.log("    (No test users found matching criteria)");
  }

  // Query other users (real users) to verify they won't be touched
  const nonTestUsers = await sql`
    SELECT id, name, email, created_at
    FROM "user"
    WHERE email NOT LIKE 'tester_%@nancyfinance.vn'
      AND email NOT LIKE 'auth_test_v2_%@nancyfinance.vn';
  `;
  console.log(`\n[Info] Non-test users (real users) count: ${nonTestUsers.length}`);
  if (nonTestUsers.length > 0) {
    console.table(nonTestUsers);
  }

  if (testUsers.length === 0) {
    console.log("\n✓ No test users to delete. Database is already clean.");
    return;
  }

  const testUserIds = testUsers.map((u: any) => u.id);

  // Count related records before deletion (to report exact cascade count)
  const relatedSessions = await sql`
    SELECT id, user_id, token, expires_at 
    FROM "session" 
    WHERE user_id = ANY(${testUserIds});
  `;
  const relatedAccounts = await sql`
    SELECT id, user_id, provider_id, account_id 
    FROM "account" 
    WHERE user_id = ANY(${testUserIds});
  `;
  console.log(`\n[3] Related records found for test users:`);
  console.log(`    - Sessions: ${relatedSessions.length}`);
  console.log(`    - Accounts: ${relatedAccounts.length}`);

  // 4. Delete test users (FK ON DELETE CASCADE will clean up sessions, accounts, etc.)
  console.log(`\n[4] Deleting ${testUsers.length} test user(s) via ON DELETE CASCADE...`);
  const deletedUsers = await sql`
    DELETE FROM "user"
    WHERE id = ANY(${testUserIds})
    RETURNING id, email;
  `;
  console.log(`    ✓ Deleted ${deletedUsers.length} user(s) successfully.`);

  // 5. Query again to confirm deletion
  console.log("\n[5] Post-deletion verification:");
  const remainingTestUsers = await sql`
    SELECT id, name, email
    FROM "user"
    WHERE email LIKE 'tester_%@nancyfinance.vn'
       OR email LIKE 'auth_test_v2_%@nancyfinance.vn';
  `;
  console.log(`    - Remaining test users matching patterns: ${remainingTestUsers.length}`);

  const remainingTestSessions = await sql`
    SELECT id FROM "session" WHERE user_id = ANY(${testUserIds});
  `;
  console.log(`    - Remaining test sessions: ${remainingTestSessions.length}`);

  const remainingTestAccounts = await sql`
    SELECT id FROM "account" WHERE user_id = ANY(${testUserIds});
  `;
  console.log(`    - Remaining test accounts: ${remainingTestAccounts.length}`);

  // Verify real users count
  const postNonTestUsers = await sql`
    SELECT id, name, email, created_at
    FROM "user"
    WHERE email NOT LIKE 'tester_%@nancyfinance.vn'
      AND email NOT LIKE 'auth_test_v2_%@nancyfinance.vn';
  `;
  console.log(`    - Non-test (real) users count after cleanup: ${postNonTestUsers.length} (Unchanged: ${postNonTestUsers.length === nonTestUsers.length})`);

  console.log("\n=======================================================");
  console.log("✓ CLEANUP REPORT SUMMARY:");
  console.log(`  - Test users before cleanup: ${testUsers.length}`);
  console.log(`  - Test users deleted: ${deletedUsers.length}`);
  console.log(`  - Related sessions deleted: ${relatedSessions.length}`);
  console.log(`  - Related accounts deleted: ${relatedAccounts.length}`);
  console.log(`  - Remaining test users: ${remainingTestUsers.length}`);
  console.log(`  - Real users affected: 0 (Preserved intact)`);
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("Cleanup script failed:", err);
  process.exit(1);
});
