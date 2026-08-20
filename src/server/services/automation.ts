import { db } from "@/db";
import { recurringTransactions, transactions, financialAccounts } from "@/db/schema";
import { eq, sql, and, lte } from "drizzle-orm";
import { transactionsService } from "./transactions";
import { calculateNextDueDate } from "@/lib/format/date";
import { CreateTransactionData } from "../repositories/transactions";

export class AutomationService {
  /**
   * Process a single recurring transaction.
   * This method uses a row-level lock (FOR UPDATE) to ensure idempotency and prevent race conditions.
   */
  async processRecurringTransaction(id: string) {
    return await db.transaction(async (tx) => {
      // 1. Lock the row to prevent concurrent processing of the same transaction
      const [rt] = await tx
        .select()
        .from(recurringTransactions)
        .where(eq(recurringTransactions.id, id))
        .for("update");

      if (!rt) {
        return { status: "not_found" };
      }

      const now = new Date();

      // 2. Re-check conditions after acquiring lock
      if (!rt.isActive) {
        return { status: "skipped", reason: "inactive" };
      }

      if (rt.nextDueDate > now) {
        return { status: "skipped", reason: "not_due" };
      }

      if (rt.endDate && rt.endDate < now) {
        // Automatically deactivate if end date is passed
        await tx
          .update(recurringTransactions)
          .set({ isActive: false })
          .where(eq(recurringTransactions.id, id));
        return { status: "skipped", reason: "expired" };
      }

      // 3. Create the actual transaction
      const transactionData: CreateTransactionData = {
        id: crypto.randomUUID(),
        userId: rt.userId,
        accountId: rt.accountId,
        categoryId: rt.categoryId,
        amount: rt.amount,
        type: rt.type,
        transactionDate: rt.nextDueDate, // Use due date for the transaction date
        note: `[Auto] ${rt.note || "Recurring transaction"}`,
      };

      // Ensure that TransactionsService.createTransaction correctly receives the transaction instance 
      // so it runs atomically in the same db transaction.
      await transactionsService.createTransaction(transactionData, tx);

      // 4. Calculate next due date
      const newNextDueDate = calculateNextDueDate(rt.nextDueDate, rt.frequency);

      // 5. Update the recurring transaction with new due date
      await tx
        .update(recurringTransactions)
        .set({ nextDueDate: newNextDueDate })
        .where(eq(recurringTransactions.id, id));

      return { status: "processed", newNextDueDate };
    });
  }

  /**
   * Find and process all due recurring transactions.
   */
  async processDueRecurringTransactions() {
    const now = new Date();
    
    // Find all active recurring transactions that are due
    const dueTransactions = await db
      .select({ id: recurringTransactions.id })
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.isActive, true),
          lte(recurringTransactions.nextDueDate, now)
        )
      );

    const stats = {
      processed: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process them sequentially to avoid overwhelming DB, or use Promise.allSettled for concurrency.
    // For small batches Promise.allSettled is better.
    const results = await Promise.allSettled(
      dueTransactions.map((dt) => this.processRecurringTransaction(dt.id))
    );

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      if (res.status === "fulfilled") {
        if (res.value.status === "processed") {
          stats.processed++;
        } else {
          stats.skipped++;
        }
      } else {
        stats.failed++;
        stats.errors.push(`Failed ${dueTransactions[i].id}: ${res.reason?.message || "Unknown error"}`);
      }
    }

    return stats;
  }
}

export const automationService = new AutomationService();
