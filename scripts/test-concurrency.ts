import { db } from "../src/db";
import { recurringTransactions, financialAccounts, users, categories } from "../src/db/schema";
import { automationService } from "../src/server/services/automation";
import { eq } from "drizzle-orm";

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

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  const [rt] = await db.insert(recurringTransactions).values({
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

  console.log('Created recurring transaction: ' + rt.id);

  console.log("Firing 5 concurrent processing requests...");
  const results = await Promise.all([
    automationService.processRecurringTransaction(rt.id),
    automationService.processRecurringTransaction(rt.id),
    automationService.processRecurringTransaction(rt.id),
    automationService.processRecurringTransaction(rt.id),
    automationService.processRecurringTransaction(rt.id),
  ]);

  console.log(results);

  const processedCount = results.filter(r => r.status === "processed").length;
  const skippedCount = results.filter(r => r.status === "skipped").length;

  console.log('Processed:', processedCount, 'Skipped:', skippedCount);

  const [updatedAccount] = await db.select().from(financialAccounts).where(eq(financialAccounts.id, account.id));
  
  if (processedCount === 1 && updatedAccount.balance === 9500000) {
    console.log("✅ CONCURRENCY TEST PASSED");
  } else {
    console.error("❌ CONCURRENCY TEST FAILED");
    process.exitCode = 1;
  }

  await db.delete(financialAccounts).where(eq(financialAccounts.id, account.id));
  process.exit();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
