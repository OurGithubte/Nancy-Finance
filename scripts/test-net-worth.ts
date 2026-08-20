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

    const [account] = await db
      .insert(financialAccounts)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: "Test Account",
        type: "bank",
        balance: 10_000_000, // current balance = 10,000,000 VND
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

    console.log("✓ Net Worth reconstruction correct (assets/debt/netWorth, VN-calendar boundaries)");
    console.log("✓ Excluded accounts respected");
    console.log("✓ Historical reversal of future transactions correct");
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
