import { ReportService, getReportPeriodDates } from "../src/server/services/reports";
import { db } from "../src/db";
import { users, financialAccounts, categories, transactions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import assert from "node:assert";

async function setupTestData() {
  // Clean up test data if exists
  await db.delete(users).where(eq(users.email, "testA@nancyfinance.vn"));
  await db.delete(users).where(eq(users.email, "testB@nancyfinance.vn"));

  // Create User A
  const [userA] = await db.insert(users).values({
    id: "userA_report_test",
    name: "User A",
    email: "testA@nancyfinance.vn",
  }).returning();

  // Create User B (for isolation test)
  const [userB] = await db.insert(users).values({
    id: "userB_report_test",
    name: "User B",
    email: "testB@nancyfinance.vn",
  }).returning();

  // Create Accounts
  const [accA] = await db.insert(financialAccounts).values({
    id: "accA_1",
    userId: userA.id,
    name: "Cash A",
    type: "cash",
    balance: 5000000,
  }).returning();

  const [accB] = await db.insert(financialAccounts).values({
    id: "accB_1",
    userId: userB.id,
    name: "Cash B",
    type: "cash",
    balance: 10000000,
  }).returning();

  // Create Categories for A
  const [catFood, catTransport, catOther] = await db.insert(categories).values([
    { id: "catA_food", userId: userA.id, name: "Food", type: "expense" },
    { id: "catA_transport", userId: userA.id, name: "Transport", type: "expense" },
    { id: "catA_other", userId: userA.id, name: "Other", type: "expense" },
    { id: "catA_salary", userId: userA.id, name: "Salary", type: "income" },
  ]).returning();

  // The test requires:
  // Income: 10,000,000
  // Expenses: Food 2,000,000, Transport 1,000,000, Other 500,000
  
  // Set date to current month so "this_month" works
  const now = new Date();
  const txDate = new Date(now.getFullYear(), now.getMonth(), 15);

  await db.insert(transactions).values([
    {
      id: "txA_inc1",
      userId: userA.id,
      accountId: accA.id,
      categoryId: catFood.id, // technically salary category but just using ID
      type: "income",
      amount: 10000000,
      transactionDate: txDate,
      status: "completed",
    },
    {
      id: "txA_exp1",
      userId: userA.id,
      accountId: accA.id,
      categoryId: catFood.id,
      type: "expense",
      amount: 2000000,
      transactionDate: txDate,
      status: "completed",
    },
    {
      id: "txA_exp2",
      userId: userA.id,
      accountId: accA.id,
      categoryId: catTransport.id,
      type: "expense",
      amount: 1000000,
      transactionDate: txDate,
      status: "completed",
    },
    {
      id: "txA_exp3",
      userId: userA.id,
      accountId: accA.id,
      categoryId: catOther.id,
      type: "expense",
      amount: 500000,
      transactionDate: txDate,
      status: "completed",
    },
    // User B data to test isolation
    {
      id: "txB_inc1",
      userId: userB.id,
      accountId: accB.id,
      type: "income",
      amount: 9999999,
      transactionDate: txDate,
      status: "completed",
    }
  ]);

  return { userA, userB };
}

async function cleanupTestData(userAId: string, userBId: string) {
  await db.delete(users).where(eq(users.id, userAId));
  await db.delete(users).where(eq(users.id, userBId));
}

async function runTests() {
  console.log("Setting up report test data...");
  const { userA, userB } = await setupTestData();

  try {
    console.log("Testing getFinancialReport for User A...");
    const report = await ReportService.getFinancialReport(userA.id, "this_month");

    // 1. Check KPIs
    assert.strictEqual(report.summary.totalIncome, 10000000, "totalIncome should be 10M");
    assert.strictEqual(report.summary.totalExpense, 3500000, "totalExpense should be 3.5M");
    assert.strictEqual(report.summary.netCashflow, 6500000, "netCashflow should be 6.5M");
    assert.strictEqual(report.summary.savingsRate, 65, "savingsRate should be 65%");
    assert.strictEqual(report.summary.totalAssets, 5000000, "totalAssets should match account balance");

    // 2. Check Expense Share
    const foodCat = report.expenseCategories.find(c => c.name === "Food");
    assert.ok(foodCat, "Food category missing");
    assert.strictEqual(foodCat.amount, 2000000, "Food amount incorrect");
    assert.strictEqual(Math.round(foodCat.percentage), 57, "Food percentage incorrect"); // 2M / 3.5M = ~57.14%

    const transportCat = report.expenseCategories.find(c => c.name === "Transport");
    assert.ok(transportCat, "Transport category missing");
    assert.strictEqual(Math.round(transportCat.percentage), 29, "Transport percentage incorrect"); // 1M / 3.5M = ~28.57%

    const otherCat = report.expenseCategories.find(c => c.name === "Other");
    assert.ok(otherCat, "Other category missing");
    assert.strictEqual(Math.round(otherCat.percentage), 14, "Other percentage incorrect"); // 500k / 3.5M = ~14.29%

    // 3. User Isolation Test
    console.log("Testing user isolation...");
    const reportB = await ReportService.getFinancialReport(userB.id, "this_month");
    assert.strictEqual(reportB.summary.totalIncome, 9999999, "User B income should not mix with User A");
    assert.strictEqual(reportB.summary.totalExpense, 0, "User B should have 0 expenses");
    
    // 4. Test period boundaries
    const { startDate, endDate } = getReportPeriodDates("custom", "2026-08-01", "2026-08-31");
    // Start should be Aug 1 00:00:00
    assert.strictEqual(startDate.getDate(), 1);
    assert.strictEqual(startDate.getHours(), 0);
    // End should be Sep 1 00:00:00 (exclusive)
    assert.strictEqual(endDate.getDate(), 1);
    assert.strictEqual(endDate.getMonth(), 8); // 8 is Sept since 0 is Jan
    assert.strictEqual(endDate.getHours(), 0);

    console.log("All report tests PASSED.");
  } finally {
    console.log("Cleaning up test data...");
    await cleanupTestData(userA.id, userB.id);
  }
}

runTests().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});
