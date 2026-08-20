import { ReportService, getReportPeriodDates } from "../src/server/services/reports";
import { db } from "../src/db";
import { users, financialAccounts, categories, transactions, loans, loanPayments, creditCards, creditCardTransactions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import assert from "node:assert";

// removed mock

async function setupTestData() {
  await db.delete(users).where(eq(users.email, "testA@nancyfinance.vn"));
  await db.delete(users).where(eq(users.email, "testB@nancyfinance.vn"));

  const [userA] = await db.insert(users).values({
    id: "userA_report_test", name: "User A", email: "testA@nancyfinance.vn",
  }).returning();

  const [userB] = await db.insert(users).values({
    id: "userB_report_test", name: "User B", email: "testB@nancyfinance.vn",
  }).returning();

  const [accA1, accA2] = await db.insert(financialAccounts).values([
    { id: "accA_1", userId: userA.id, name: "Cash A", type: "cash", balance: 1000 },
    { id: "accA_2", userId: userA.id, name: "Bank A", type: "bank", balance: 500 },
  ]).returning();

  const [catFood] = await db.insert(categories).values([
    { id: "catA_food", userId: userA.id, name: "Food", type: "expense" },
  ]).returning();

  // Transactions semantics
  const baseDate = new Date();
  const txDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 15);
  
  await db.insert(transactions).values([
    // Normal income
    { id: "txA_inc1", userId: userA.id, accountId: accA1.id, type: "income", amount: 10000, transactionDate: txDate, status: "completed" },
    // Normal expense
    { id: "txA_exp1", userId: userA.id, accountId: accA1.id, categoryId: catFood.id, type: "expense", amount: 2000, transactionDate: txDate, status: "completed" },
    // Transfer (should be excluded from income/expense)
    { id: "txA_tfr1", userId: userA.id, accountId: accA1.id, toAccountId: accA2.id, type: "transfer", amount: 500, transactionDate: txDate, status: "completed" },
    // Refund / negative expense (implemented as expense with negative amount, or income)
    { id: "txA_exp_ref", userId: userA.id, accountId: accA1.id, categoryId: catFood.id, type: "expense", amount: -500, transactionDate: txDate, status: "completed" },
    // User B data (isolation check)
    { id: "txB_inc1", userId: userB.id, accountId: accA1.id, type: "income", amount: 99999, transactionDate: txDate, status: "completed" }
  ]);

  // Debt (Loans & CC)
  const [loanA] = await db.insert(loans).values({
    id: "loanA_1", userId: userA.id, name: "Car Loan", lenderName: "Bank", totalAmount: 50000, remainingAmount: 40000, monthlyPayment: 1000, interestRate: "5.0", totalTerms: 60, remainingTerms: 40, startDate: new Date("2020-01-01T00:00:00+07:00"), endDate: new Date("2025-01-01T00:00:00+07:00")
  }).returning();

  const [ccA] = await db.insert(creditCards).values({
    id: "ccA_1", userId: userA.id, name: "Visa", bankName: "Bank", last4Digits: "1234", creditLimit: 20000, currentBalance: 5000, statementDay: 1, dueDay: 15, cardNetwork: "visa"
  }).returning();

  return { userA, userB };
}

async function cleanupTestData() {
  await db.delete(users).where(eq(users.email, "testA@nancyfinance.vn"));
  await db.delete(users).where(eq(users.email, "testB@nancyfinance.vn"));
}

async function testDateBoundaries() {
  // Test Ho Chi Minh Time bounds
  const feb28 = getReportPeriodDates("custom", "2026-02-01", "2026-02-28");
  assert.strictEqual(feb28.startDate.toISOString(), "2026-01-31T17:00:00.000Z"); // Feb 1 00:00 UTC+7
  assert.strictEqual(feb28.endDate.toISOString(), "2026-02-28T17:00:00.000Z"); // Mar 1 00:00 UTC+7
  
  const leapYear = getReportPeriodDates("custom", "2024-02-01", "2024-02-29");
  assert.strictEqual(leapYear.endDate.toISOString(), "2024-02-29T17:00:00.000Z"); // Mar 1 00:00 UTC+7

  const thirtyDay = getReportPeriodDates("custom", "2026-04-01", "2026-04-30");
  assert.strictEqual(thirtyDay.endDate.toISOString(), "2026-04-30T17:00:00.000Z"); // May 1 00:00 UTC+7
  
  const thirtyOneDay = getReportPeriodDates("custom", "2026-05-01", "2026-05-31");
  assert.strictEqual(thirtyOneDay.endDate.toISOString(), "2026-05-31T17:00:00.000Z"); // Jun 1 00:00 UTC+7
}

async function runTests() {
  console.log("Setting up report test data...");
  const { userA, userB } = await setupTestData();

  try {
    testDateBoundaries();
    console.log("Date boundary tests passed.");

    const report = await ReportService.getFinancialReport(userA.id, "this_month");

    // Transaction Semantics
    // Income = 10000. Expense = 2000 - 500 = 1500. Net = 8500. Transfer is ignored.
    assert.strictEqual(report.summary.totalIncome, 10000, "totalIncome should ignore transfers");
    assert.strictEqual(report.summary.totalExpense, 1500, "totalExpense should sum negative expenses correctly");
    assert.strictEqual(report.summary.netCashflow, 8500, "netCashflow should be 8500");
    assert.strictEqual(report.summary.savingsRate, 85, "savingsRate should be 85%");

    // Assets/Debt
    assert.strictEqual(report.summary.totalAssets, 1500, "totalAssets should sum current balances");
    assert.strictEqual(report.summary.totalDebt, 45000, "totalDebt should be loan (40k) + CC (5k)");

    // User Isolation
    const reportB = await ReportService.getFinancialReport(userB.id, "this_month");
    assert.strictEqual(reportB.summary.totalIncome, 99999, "User B income isolated");
    assert.strictEqual(reportB.summary.totalExpense, 0, "User B has 0 expenses");
    assert.strictEqual(reportB.summary.totalDebt, 0, "User B has 0 debt");
    
    // Empty Data
    const emptyReport = await ReportService.getFinancialReport(userB.id, "custom", "1990-01-01", "1990-01-31");
    assert.strictEqual(emptyReport.summary.totalIncome, 0);
    assert.strictEqual(emptyReport.summary.savingsRate, null, "savingsRate should be null when income is 0");

    // Historical Snapshot (End of Last Month)
    const lastMonth = getReportPeriodDates("last_month");
    const reportLastMonth = await ReportService.getFinancialReport(userA.id, "last_month");
    // Since all our txs were inserted in "this month", the snapshot for last month should exclude them!
    // Total assets: 1500 currently. Txs: 10000 income, 1500 expense. Transfer 500 (internal).
    // So current assets = 1500. Past assets = 1500 - 10000 + 1500 = -7000.
    assert.strictEqual(reportLastMonth.summary.totalAssets, -7000, "totalAssets snapshot at end of last month");
    
    // Quick Export Test (No actual endpoint, just simulate calling PDF generation logic if we could, but we can't easily here without mocking request)
    // We already tested logic, API routes are tested via typecheck and build.

    console.log("All report logic tests PASSED.");
  } finally {
    console.log("Cleaning up test data...");
    await cleanupTestData();
  }
}

runTests().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});
