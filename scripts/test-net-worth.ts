/**
 * Integration test for NetWorthService — verifies monthly Net Worth
 * reconstruction (assets - debt) and the [start, endExclusive) VN-calendar
 * semantics used by the historical trend.
 *
 * Uses a dedicated, freshly created test user + isolated financial data and
 * cleans up everything in `finally`, per DATABASE_RULES.md 6.5.
 */
import { db } from "../src/db";
import { users, financialAccounts, transactions, loans } from "../src/db/schema";
import { NetWorthService } from "../src/server/services/net-worth";
import * as assert from "assert";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Setting up Net Worth history test...");

  const [testUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: "Phase6 NetWorth Test User",
      email: `phase6-networth-${Date.now()}@example.test`,
    })
    .returning();

  const cleanup = {
    userId: testUser.id,
  };

  try {
    const now = new Date();

    // Phase 6 Final Hardening Fix 1: an account is only counted in a historical
    // snapshot if it already existed at that boundary (createdAt < boundaryExclusive).
    // This test simulates an account that existed well BEFORE the 2-months-ago income
    // transaction below, so its `createdAt` must be explicitly backdated too — leaving
    // it at the DB default (now) would make Fix 1 correctly exclude it from the
    // 2-months-ago snapshot, which is not what this section is exercising. The opposite
    // case — an account created AFTER a boundary must contribute 0 — is covered
    // separately below by "Account B" (section 4) and by test-reports.ts (accFuture).
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [account] = await db
      .insert(financialAccounts)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Test Account",
        type: "bank",
        balance: 10_000_000, // current balance = 10,000,000 VND
        createdAt: threeMonthsAgo,
      })
      .returning();

    const [excludedAccount] = await db
      .insert(financialAccounts)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Excluded Investment",
        type: "investment",
        balance: 999_000_000,
        isExcludedFromTotal: true,
        createdAt: threeMonthsAgo,
      })
      .returning();

    // An income transaction 2 months ago that increased the balance by 4,000,000.
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: testUser.id,
      accountId: account.id,
      type: "income",
      amount: 4_000_000,
      transactionDate: twoMonthsAgo,
      status: "completed",
    });

    const [loan] = await db
      .insert(loans)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Test Loan",
        lenderName: "Test Bank",
        totalAmount: 20_000_000,
        remainingAmount: 5_000_000,
        monthlyPayment: 1_000_000,
        interestRate: "10.00",
        totalTerms: 20,
        remainingTerms: 5,
        startDate: twoMonthsAgo,
        endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
      })
      .returning();

    // 1. Current snapshot: assets should exclude the investment account.
    const nowSnapshot = await NetWorthService.getSnapshotAt(testUser.id, new Date(Date.now() + 60_000));
    assert.strictEqual(nowSnapshot.assets, 10_000_000, "Excluded account must not count toward assets");
    assert.strictEqual(nowSnapshot.debt, 5_000_000, "Debt must equal loan remainingAmount");
    assert.strictEqual(nowSnapshot.netWorth, 5_000_000, "netWorth must be assets - debt, not assets alone");

    // 2. Historical snapshot BEFORE the income transaction: balance should be reconstructed
    // back to 6,000,000 (10,000,000 - the 4,000,000 income that happened after).
    const beforeIncome = new Date(twoMonthsAgo.getTime() - 24 * 60 * 60 * 1000);
    const pastSnapshot = await NetWorthService.getSnapshotAt(testUser.id, beforeIncome);
    assert.strictEqual(pastSnapshot.assets, 6_000_000, "Past assets should reverse out the later income transaction");
    assert.strictEqual(pastSnapshot.debt, 0, "Loan did not exist yet before its startDate");

    // 3. Monthly history: 6 points, last point matches current snapshot.
    const history = await NetWorthService.getNetWorthHistory(testUser.id, 6);
    assert.strictEqual(history.points.length, 6, "Must return exactly 6 monthly points");
    const last = history.points[history.points.length - 1];
    assert.strictEqual(last.netWorth, nowSnapshot.netWorth, "Last history point should match current snapshot");

    // 4. Phase 6 Final Hardening Fix 1: an account created AFTER a historical boundary
    // must contribute 0 to that snapshot — it did not exist yet — even though its
    // CURRENT balance is non-zero today. Captured BEFORE inserting account B so the
    // boundary is strictly earlier than accountB.createdAt.
    const boundaryBeforeAccountB = new Date(Date.now() - 1000);

    await db
      .insert(financialAccounts)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Account B (created after boundary)",
        type: "bank",
        balance: 50_000_000,
      })
      .returning();

    const snapshotBeforeAccountB = await NetWorthService.getSnapshotAt(testUser.id, boundaryBeforeAccountB);
    assert.strictEqual(
      snapshotBeforeAccountB.assets,
      10_000_000,
      "Account B must NOT appear in a snapshot taken before it existed (only account A's balance counts)"
    );

    const snapshotAfterAccountB = await NetWorthService.getSnapshotAt(testUser.id, new Date(Date.now() + 60_000));
    assert.strictEqual(
      snapshotAfterAccountB.assets,
      10_000_000 + 50_000_000,
      "Current snapshot must include account B once it exists and is not excluded"
    );

    console.log("✓ Net Worth reconstruction correct (assets/debt/netWorth, VN-calendar boundaries)");
    console.log("✓ Excluded accounts respected");
    console.log("✓ Historical reversal of future transactions correct");
    console.log("✓ Account created after a historical boundary contributes 0 to that snapshot (Fix 1)");
    console.log("PASS");
  } finally {
    // Cleanup: delete in FK-safe order.
    await db.delete(loans).where(eq(loans.userId, cleanup.userId));
    await db.delete(transactions).where(eq(transactions.userId, cleanup.userId));
    await db.delete(financialAccounts).where(eq(financialAccounts.userId, cleanup.userId));
    await db.delete(users).where(eq(users.id, cleanup.userId));
    console.log("Cleanup complete.");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAIL", err);
    process.exit(1);
  });
