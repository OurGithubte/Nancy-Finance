import { db } from "../src/db";
import { users, creditCards, creditCardStatements, financialAccounts, categories, transactions } from "../src/db/schema";
import { budgets } from "../src/db/schema/planning";
import { insightsService } from "../src/server/services/insights";
import { getVNDateParts, getReportPeriodDates } from "../src/server/services/reports";
import * as assert from "assert";
import { eq } from "drizzle-orm";

/**
 * Phase 6 Final Hardening Fix 3 regression tests. Uses its own dedicated, freshly
 * created test user + isolated financial data (NOT the shared/arbitrary `userA` used
 * by the credit-card tests below), cleaned up in `finally`, per DATABASE_RULES.md 6.5 —
 * the shared user in this file is an arbitrary existing row and must never receive
 * synthetic transactions/budgets.
 */
async function testVnTimezoneAndExclusiveBoundary() {
  const [testUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      name: "Phase6 Insights VN-Boundary Test User",
      email: `phase6-insights-vnb-${Date.now()}@example.test`,
    })
    .returning();

  try {
    const now = new Date();

    const [account] = await db
      .insert(financialAccounts)
      .values({ id: crypto.randomUUID(), userId: testUser.id, name: "Test Account", type: "bank", balance: 0 })
      .returning();

    const [category] = await db
      .insert(categories)
      .values({ id: crypto.randomUUID(), userId: testUser.id, name: "Test Category", type: "expense" })
      .returning();

    // 3A: budget month/year must be resolved via VN timezone (getVNDateParts), not
    // server-local now.getMonth()/getFullYear() (Vercel runs UTC). We key the test
    // budget by the SAME helper the fixed implementation now uses — if insights.ts
    // ever regresses back to now.getMonth()+1, this budget would fall out of the
    // month/year insights.ts actually queries and the warning below would disappear.
    const { y: vnYear, m: vnMonth } = getVNDateParts(now);
    const [budget] = await db
      .insert(budgets)
      .values({
        id: crypto.randomUUID(),
        userId: testUser.id,
        categoryId: category.id,
        allocatedAmount: 1_000_000,
        spentAmount: 900_000, // 90% used -> "warning"
        month: vnMonth,
        year: vnYear,
      })
      .returning();

    const budgetInsights = await insightsService.getSmartInsights(testUser.id);
    const budgetWarning = budgetInsights.find((i) => i.id === `budget_warn_${budget.id}`);
    assert.ok(budgetWarning, "Budget keyed to the current VN month/year must be picked up (getVNDateParts, not server-local time)");

    // 3B: getReportPeriodDates() returns [startDate, endDate) — endDate EXCLUSIVE.
    // A transaction dated EXACTLY at monthEnd belongs to NEXT month and must be
    // excluded from this month's savings-rate calculation.
    const { startDate: monthStart, endDate: monthEnd } = getReportPeriodDates("this_month");

    await db.insert(transactions).values([
      // In-month income/expense -> savings rate 5%, well under the 10% threshold.
      {
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        type: "income",
        amount: 1_000_000,
        transactionDate: new Date(monthStart.getTime() + 24 * 60 * 60 * 1000),
        status: "completed",
      },
      {
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        type: "expense",
        amount: 950_000,
        transactionDate: new Date(monthStart.getTime() + 24 * 60 * 60 * 1000),
        status: "completed",
      },
      // Large income dated EXACTLY at the exclusive monthEnd boundary. If this were
      // wrongly included (old `lte(monthEnd)` bug), savings rate would jump to ~91%
      // and the low-savings-rate warning below would incorrectly disappear.
      {
        id: crypto.randomUUID(),
        userId: testUser.id,
        accountId: account.id,
        type: "income",
        amount: 10_000_000,
        transactionDate: monthEnd,
        status: "completed",
      },
    ]);

    const savingsInsights = await insightsService.getSmartInsights(testUser.id);
    const lowSavingsWarning = savingsInsights.find((i) => i.id === "savings_rate_low");
    assert.ok(
      lowSavingsWarning,
      "Transaction dated exactly at the exclusive monthEnd boundary must NOT be counted into this month's savings rate (lt, not lte)"
    );

    console.log("✓ Budget insight resolved via VN timezone (getVNDateParts), not server-local time (Fix 3A)");
    console.log("✓ Transaction at exclusive monthEnd boundary excluded from savings-rate calculation (Fix 3B)");
  } finally {
    await db.delete(budgets).where(eq(budgets.userId, testUser.id));
    await db.delete(transactions).where(eq(transactions.userId, testUser.id));
    await db.delete(categories).where(eq(categories.userId, testUser.id));
    await db.delete(financialAccounts).where(eq(financialAccounts.userId, testUser.id));
    await db.delete(users).where(eq(users.id, testUser.id));
  }
}

async function run() {
  await testVnTimezoneAndExclusiveBoundary();

  console.log("Setting up Credit Card Insights tests...");

  const [userA] = await db.select().from(users).limit(1);
  if (!userA) throw new Error("No user found");

  const [userB] = await db.insert(users).values({
    id: crypto.randomUUID(),
    name: "User B",
    email: "userb2@example.com",
  }).returning();

  const cleanupIds: string[] = [userB.id];

  try {
    const now = new Date();

    // CC1 for User A
    const [cc1] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: userA.id,
      name: "CC1",
      bankName: "Bank",
      last4Digits: "1111",
      creditLimit: 20000000,
      statementDay: 1,
      dueDay: 15,
    }).returning();
    cleanupIds.push(cc1.id);

    // CC2 for User B
    const [ccB] = await db.insert(creditCards).values({
      id: crypto.randomUUID(),
      userId: userB.id,
      name: "CC2",
      bankName: "Bank",
      last4Digits: "2222",
      creditLimit: 20000000,
      statementDay: 1,
      dueDay: 15,
    }).returning();
    cleanupIds.push(ccB.id);

    // Case 1: Card no statement -> No warning
    let insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_undefined` || i.id.includes(cc1.id)).length, 0);

    // Case 2: Paid statement within 3 days -> No warning
    const dueIn3Days = new Date(now);
    dueIn3Days.setDate(dueIn3Days.getDate() + 3);

    const [stmtPaid] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(),
      dueDate: dueIn3Days,
      totalDue: 2000000,
      minPaymentDue: 200000,
      isPaid: "paid",
    }).returning();
    
    insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_${stmtPaid.id}`).length, 0);

    // Case 3: Unpaid statement within 3 days -> Warning exists with amount
    const [stmtUnpaid] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(),
      dueDate: dueIn3Days,
      totalDue: 2500000,
      minPaymentDue: 200000,
      isPaid: "unpaid",
    }).returning();

    insights = await insightsService.getSmartInsights(userA.id);
    const dueInsight = insights.find(i => i.id === `cc_due_${stmtUnpaid.id}`);
    assert.ok(dueInsight, "Expected warning for unpaid statement within 3 days");
    assert.strictEqual(dueInsight?.amount, 2500000);

    // Case 4: Unpaid statement > 7 days -> No near-due warning
    const dueIn10Days = new Date(now);
    dueIn10Days.setDate(dueIn10Days.getDate() + 10);

    const [stmtFar] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: cc1.id,
      statementDate: new Date(),
      dueDate: dueIn10Days,
      totalDue: 5000000,
      minPaymentDue: 500000,
      isPaid: "unpaid",
    }).returning();

    insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_${stmtFar.id}`).length, 0);

    // Case 5: Other user's unpaid statement -> No warning for current user
    const [stmtUserB] = await db.insert(creditCardStatements).values({
      id: crypto.randomUUID(),
      creditCardId: ccB.id,
      statementDate: new Date(),
      dueDate: dueIn3Days,
      totalDue: 9000000,
      minPaymentDue: 900000,
      isPaid: "unpaid",
    }).returning();

    insights = await insightsService.getSmartInsights(userA.id);
    assert.strictEqual(insights.filter(i => i.id === `cc_due_${stmtUserB.id}`).length, 0);

    console.log("✅ INSIGHTS TESTS PASSED");

  } finally {
    console.log("Cleaning up...");
    for (const id of cleanupIds) {
      await db.delete(users).where(eq(users.id, id));
      await db.delete(creditCards).where(eq(creditCards.id, id));
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
