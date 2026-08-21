import { ReportService, getReportPeriodDates, getVNDateParts, createVNDate } from "../src/server/services/reports";
import { db } from "../src/db";
import { users, financialAccounts, categories, transactions, loans, loanPayments, creditCards, creditCardTransactions } from "../src/db/schema";
import { budgets } from "../src/db/schema/planning";
import { eq } from "drizzle-orm";
import assert from "node:assert";

import { generateCSV } from "../src/app/api/reports/export/csv/route";
import { generatePDF, buildPdfDocumentDefinition } from "../src/app/api/reports/export/pdf/route";

async function setupTestData() {
  await db.delete(users).where(eq(users.email, "testA@nancyfinance.vn"));
  await db.delete(users).where(eq(users.email, "testB@nancyfinance.vn"));

  const [userA] = await db.insert(users).values({
    id: "userA_report_test", name: "User A", email: "testA@nancyfinance.vn",
  }).returning();

  const [userB] = await db.insert(users).values({
    id: "userB_report_test", name: "User B", email: "testB@nancyfinance.vn",
  }).returning();

  const [accA1, accA2, accA3] = await db.insert(financialAccounts).values([
    { id: "accA_1", userId: userA.id, name: "Cash A", type: "cash", balance: 1000 },
    { id: "accA_2", userId: userA.id, name: "Bank A", type: "bank", balance: 500 },
    { id: "accA_3", userId: userA.id, name: "Hidden A", type: "bank", balance: 5000, isExcludedFromTotal: true },
  ]).returning();

  const [catFoodA, catFoodB] = await db.insert(categories).values([
    { id: "catA_food", userId: userA.id, name: "Food", type: "expense" },
    { id: "catB_food", userId: userB.id, name: "Food B", type: "expense" },
  ]).returning();

  // Transactions semantics
  const baseDate = new Date();
  const txDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 15);
  
  await db.insert(transactions).values([
    // Normal income
    { id: "txA_inc1", userId: userA.id, accountId: accA1.id, type: "income", amount: 10000, transactionDate: txDate, status: "completed" },
    // Normal expense
    { id: "txA_exp1", userId: userA.id, accountId: accA1.id, categoryId: catFoodA.id, type: "expense", amount: 2000, transactionDate: txDate, status: "completed" },
    // Transfer (should be excluded from income/expense)
    { id: "txA_tfr1", userId: userA.id, accountId: accA1.id, toAccountId: accA2.id, type: "transfer", amount: 500, transactionDate: txDate, status: "completed" },
    // Refund / negative expense (implemented as expense with negative amount, or income)
    { id: "txA_exp_ref", userId: userA.id, accountId: accA1.id, categoryId: catFoodA.id, type: "expense", amount: -500, transactionDate: txDate, status: "completed" },
    
    // User B data (isolation check)
    { id: "txB_inc1", userId: userB.id, accountId: accA1.id, type: "income", amount: 99999, transactionDate: txDate, status: "completed" },
    
    // Cross-user isolation check: User A creates a transaction referencing User B's category
    { id: "txA_cross", userId: userA.id, accountId: accA1.id, categoryId: catFoodB.id, type: "expense", amount: 100, transactionDate: txDate, status: "completed" },

    // CSV Injection test
    { id: "txA_inj", userId: userA.id, accountId: accA1.id, type: "expense", amount: 50, note: "=CMD|' /C calc'!A0", transactionDate: txDate, status: "completed" },
    
    // Test custom partial month budget calculation
    // Expense on 20th
    { id: "txA_exp20", userId: userA.id, accountId: accA1.id, categoryId: catFoodA.id, type: "expense", amount: 500, transactionDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), 20), status: "completed" },
  ]);

  // Budgets
  await db.insert(budgets).values([
    { id: "budgetA_1", userId: userA.id, categoryId: catFoodA.id, allocatedAmount: 5000, spentAmount: 2000, month: baseDate.getMonth() + 1, year: baseDate.getFullYear() }
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

  // Test Aug 1 00:00 boundary
  const aug1 = getReportPeriodDates("custom", "2026-08-01", "2026-08-01");
  assert.strictEqual(aug1.startDate.toISOString(), "2026-07-31T17:00:00.000Z"); // Aug 1 00:00 UTC+7
  assert.strictEqual(aug1.endDate.toISOString(), "2026-08-01T17:00:00.000Z");   // Aug 2 00:00 UTC+7

  // Test budget month logic
  const augParts = getVNDateParts(new Date("2026-08-15T00:00:00Z"));
  assert.strictEqual(augParts.m, 8, "August date should yield month 8");

  const decParts = getVNDateParts(new Date("2026-12-31T20:00:00Z")); // Jan 1 03:00 VN
  assert.strictEqual(decParts.m, 1, "December 31 20:00Z is Jan 1 VN time (month 1)");

  const earlyDec = getVNDateParts(new Date("2026-12-05T00:00:00Z"));
  assert.strictEqual(earlyDec.m, 12, "December date should yield month 12");
}

async function runTests() {
  console.log("Setting up report test data...");
  const { userA, userB } = await setupTestData();

  try {
    testDateBoundaries();
    console.log("Date boundary tests passed.");

    const report = await ReportService.getFinancialReport(userA.id, "this_month");

    // Test Custom Partial Month Budget logic
    // Range is up to 18th, so the expense on the 20th should be ignored.
    const baseDate = new Date();
    const customFrom = `${baseDate.getFullYear()}-${(baseDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
    const customTo = `${baseDate.getFullYear()}-${(baseDate.getMonth() + 1).toString().padStart(2, '0')}-18`;
    const partialReport = await ReportService.getFinancialReport(userA.id, "custom", customFrom, customTo);
    const budgetPerf = partialReport.budgetPerformance.find((b: any) => b.categoryName === "Food");
    assert.ok(budgetPerf, "Budget should be returned for partial month");
    // Expense 1 is 2000, refund is -500. Total = 1500.
    // We added txA_exp20 (500) on the 20th. It should NOT be included in this partial month (up to 18th).
    assert.strictEqual(budgetPerf.spentAmount, 1500, "Partial month spentAmount should NOT include expenses outside range");
    
    // Transaction Semantics
    // Income = 10000. Expense = 2000 - 500 + 100 + 50 + 500 = 2150. Net = 7850. Transfer is ignored.
    assert.strictEqual(report.summary.totalIncome, 10000, "totalIncome should ignore transfers");
    assert.strictEqual(report.summary.totalExpense, 2150, "totalExpense should sum negative expenses correctly");

    // Assets/Debt
    // Total balances = 1000 + 500 = 1500 (accA_3 is excluded!)
    assert.strictEqual(report.summary.totalAssets, 1500, "totalAssets should respect isExcludedFromTotal");
    assert.strictEqual(report.summary.totalDebt, 45000, "totalDebt should be loan (40k) + CC (5k)");

    // Phase 6 Final Hardening Fix 1: an account created AFTER a historical report's
    // endDate must contribute 0 to that report's asset snapshot — it did not exist yet
    // at that instant — even though it has a non-zero balance today.
    const pastPeriod = getReportPeriodDates("custom", "2020-01-01", "2020-01-31");
    const [accFuture] = await db
      .insert(financialAccounts)
      .values({ id: "accA_future", userId: userA.id, name: "Future Account", type: "bank", balance: 999_000 })
      .returning();
    assert.ok(accFuture.createdAt > pastPeriod.endDate, "Sanity: accFuture must be created after the 2020 report period");

    const pastReport = await ReportService.getFinancialReport(userA.id, "custom", "2020-01-01", "2020-01-31");
    assert.strictEqual(
      pastReport.summary.totalAssets,
      0,
      "Account created after a historical report's endDate must not appear in that report's totalAssets"
    );

    // Sanity: the CURRENT (this_month) report must still include it, proving the fix
    // only affects historical snapshots, not present-day totals.
    const reportWithFutureAccount = await ReportService.getFinancialReport(userA.id, "this_month");
    assert.strictEqual(
      reportWithFutureAccount.summary.totalAssets,
      1500 + 999_000,
      "Current report must include the account once it exists"
    );

    // User Isolation for metadata
    const crossTxCat = report.topExpenses.find(t => t.id === "txA_cross");
    assert.ok(crossTxCat, "Cross transaction exists in report");
    assert.strictEqual(crossTxCat.categoryName, "Khác", "Should not leak User B category name");

    // CSV Export Test
    console.log("Testing CSV generation...");
    const { csvContent } = await generateCSV(userA.id, "this_month");
    assert.ok(csvContent.startsWith("\uFEFF"), "CSV must have UTF-8 BOM");
    assert.ok(csvContent.includes("'="), "Formula injection must be escaped");
    assert.ok(!csvContent.includes("Food B"), "User A CSV must NOT contain User B category name");
    
    // User B CSV Isolation Test
    const { csvContent: csvB } = await generateCSV(userB.id, "this_month");
    assert.ok(!csvB.includes("Cash A"), "User B CSV must NOT contain User A account metadata");

    // PDF Export Test
    console.log("Testing PDF generation...");
    
    // Assert PDF logical sections
    const docDef = buildPdfDocumentDefinition(report);
    const pdfTextStr = JSON.stringify(docDef);
    assert.ok(pdfTextStr.includes("Tổng quan KPI"), "PDF must contain KPI");
    assert.ok(pdfTextStr.includes("Dòng tiền"), "PDF must contain Cashflow");
    assert.ok(pdfTextStr.includes("Cơ cấu chi tiêu"), "PDF must contain Expense Breakdown");
    assert.ok(pdfTextStr.includes("Hiệu suất ngân sách"), "PDF must contain Budget Performance");
    assert.ok(pdfTextStr.includes("Mục tiêu tiết kiệm"), "PDF must contain Saving Goals");
    assert.ok(pdfTextStr.includes("Tổng quan dư nợ"), "PDF must contain Debt Summary");
    assert.ok(pdfTextStr.includes("Chi tiêu lớn nhất"), "PDF must contain Top Expenses");

    const { buffer: pdfBuffer } = await generatePDF(userA.id, "this_month");
    const pdfHeader = pdfBuffer.toString("utf-8", 0, 5);
    
    assert.strictEqual(pdfHeader, "%PDF-", "PDF must have correct signature");
    assert.ok(pdfBuffer.length > 1000, "PDF must not be empty");

    console.log("All report logic tests PASSED.");
  } finally {
    console.log("Cleaning up test data...");
    await cleanupTestData();
  }
}

runTests().catch(err => {
  console.error("Test failed", err);
  process.exit(1);
});;
