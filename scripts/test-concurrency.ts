import { db } from "../src/db";
import { recurringTransactions, financialAccounts, users, transactions } from "../src/db/schema";
import { automationService } from "../src/server/services/automation";
import { eq, and } from "drizzle-orm";

async function run() {
  console.log("Setting up test data...");

  const [user] = await db.select().from(users).limit(1);
  if (!user) throw new Error("No user found for testing");

  const [account] = await db.insert(financialAccounts).values({
    id: crypto.randomUUID(),
    userId: user.id,
    name: "Test Account",
    balance: 10000000,
    type: "cash",
  }).returning();

  const cleanupIds: string[] = [];

  try {
    // SCENARIO A: Same occurrence
    console.log("\n--- SCENARIO A: Same occurrence (5 concurrent) ---");
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 day overdue
    const initialBalance = account.balance;

    const [rtA] = await db.insert(recurringTransactions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      accountId: account.id,
      amount: 500000,
      type: "expense",
      frequency: "monthly",
      startDate: pastDate,
      nextDueDate: pastDate,
      isActive: true,
    }).returning();
    cleanupIds.push(rtA.id);

    const resultsA = await Promise.all([
      automationService.processRecurringTransaction(rtA.id),
      automationService.processRecurringTransaction(rtA.id),
      automationService.processRecurringTransaction(rtA.id),
      automationService.processRecurringTransaction(rtA.id),
      automationService.processRecurringTransaction(rtA.id),
    ]);

    const processedA = resultsA.reduce((sum, r) => sum + (r.processedCount || 0), 0);
    const actualTransactionsA = await db.select().from(transactions).where(eq(transactions.recurringTransactionId, rtA.id));
    const [accountA] = await db.select().from(financialAccounts).where(eq(financialAccounts.id, account.id));

    if (processedA === 1 && actualTransactionsA.length === 1 && accountA.balance === initialBalance - 500000) {
      console.log("✅ Scenario A PASS");
    } else {
      throw new Error(`Scenario A FAIL: processed=${processedA}, txns=${actualTransactionsA.length}, balance=${accountA.balance}`);
    }

    // SCENARIO E: Test DB Unique Constraint Directly
    console.log("\n--- SCENARIO E: DB Unique Constraint Test ---");
    const testDate = new Date(2026, 0, 1);
    
    // First insert
    await db.insert(transactions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      accountId: account.id,
      amount: 100,
      type: "expense",
      transactionDate: testDate,
      note: "First insert",
      recurringTransactionId: rtA.id,
      recurringOccurrenceDate: testDate,
    });

    let duplicateFailedWith23505 = false;
    try {
      // Second insert with same recurringTransactionId and recurringOccurrenceDate
      await db.insert(transactions).values({
        id: crypto.randomUUID(),
        userId: user.id,
        accountId: account.id,
        amount: 100,
        type: "expense",
        transactionDate: testDate,
        note: "Duplicate insert",
        recurringTransactionId: rtA.id,
        recurringOccurrenceDate: testDate,
      });
    } catch (err: any) {
      if (err.code === "23505" && err.constraint === "transactions_recurring_occurrence_unq") {
        duplicateFailedWith23505 = true;
      }
    }

    if (duplicateFailedWith23505) {
      console.log("✅ Scenario E PASS (DB blocked duplicate correctly)");
    } else {
      throw new Error("Scenario E FAIL: DB did not block duplicate insert with 23505!");
    }

    // SCENARIO B: Overdue multiple periods
    console.log("\n--- SCENARIO B: 5 due occurrences ---");
    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    const [rtB] = await db.insert(recurringTransactions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      accountId: account.id,
      amount: 100000,
      type: "expense",
      frequency: "monthly",
      startDate: fourMonthsAgo,
      nextDueDate: fourMonthsAgo,
      isActive: true,
    }).returning();
    cleanupIds.push(rtB.id);

    const resultB = await automationService.processRecurringTransaction(rtB.id);
    const actualTransactionsB = await db.select().from(transactions).where(eq(transactions.recurringTransactionId, rtB.id));
    const [updatedRtB] = await db.select().from(recurringTransactions).where(eq(recurringTransactions.id, rtB.id));

    if (resultB.processedCount === 5 && actualTransactionsB.length === 5 && updatedRtB.nextDueDate > new Date()) {
      console.log("✅ Scenario B PASS");
    } else {
      throw new Error(`Scenario B FAIL: processed=${resultB.processedCount}, txns=${actualTransactionsB.length}, nextDueDate=${updatedRtB.nextDueDate}`);
    }

    // SCENARIO C: Run processor second time
    console.log("\n--- SCENARIO C: Rerun processor ---");
    const resultC = await automationService.processRecurringTransaction(rtB.id);
    if (resultC.status === "skipped_not_due" && resultC.processedCount === 0) {
      console.log("✅ Scenario C PASS");
    } else {
      throw new Error(`Scenario C FAIL: ${JSON.stringify(resultC)}`);
    }

    // SCENARIO D: Concurrent catch-up
    console.log("\n--- SCENARIO D: Concurrent catch-up (5 due occurrences x 3 concurrent) ---");
    const [rtD] = await db.insert(recurringTransactions).values({
      id: crypto.randomUUID(),
      userId: user.id,
      accountId: account.id,
      amount: 100000,
      type: "expense",
      frequency: "monthly",
      startDate: fourMonthsAgo,
      nextDueDate: fourMonthsAgo,
      isActive: true,
    }).returning();
    cleanupIds.push(rtD.id);

    const resultsD = await Promise.all([
      automationService.processRecurringTransaction(rtD.id),
      automationService.processRecurringTransaction(rtD.id),
      automationService.processRecurringTransaction(rtD.id),
    ]);

    const processedD = resultsD.reduce((sum, r) => sum + (r.processedCount || 0), 0);
    const actualTransactionsD = await db.select().from(transactions).where(eq(transactions.recurringTransactionId, rtD.id));

    if (processedD === 5 && actualTransactionsD.length === 5) {
      console.log("✅ Scenario D PASS");
    } else {
      throw new Error(`Scenario D FAIL: totalProcessedCount=${processedD}, txns=${actualTransactionsD.length}`);
    }

    console.log("\n🎉 ALL TESTS PASSED!");

  } finally {
    console.log("Cleaning up...");
    for (const id of cleanupIds) {
      await db.delete(transactions).where(eq(transactions.recurringTransactionId, id));
      await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
    }
    await db.delete(financialAccounts).where(eq(financialAccounts.id, account.id));
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
