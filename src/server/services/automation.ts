import { db } from "@/db";
import { recurringTransactions, transactions } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { transactionsService } from "./transactions";
import { calculateNextDueDate } from "@/lib/format/date";
import { CreateTransactionData } from "../repositories/transactions";

export class AutomationService {
  /**
   * Process a single recurring transaction.
   * This method uses a row-level lock (FOR UPDATE) to ensure idempotency and prevent race conditions.
   * Catches up overdue occurrences up to 100 times.
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
        return { status: "not_found", processedCount: 0 };
      }

      const now = new Date();

      if (!rt.isActive) {
        return { status: "skipped_inactive", processedCount: 0 };
      }

      if (rt.nextDueDate > now) {
        return { status: "skipped_not_due", processedCount: 0 };
      }

      const MAX_CATCH_UP = 100;
      let processedCount = 0;
      let skippedCount = 0;
      let currentDueDate = new Date(rt.nextDueDate);
      let status = "processed";

      while (currentDueDate <= now && (processedCount + skippedCount) < MAX_CATCH_UP) {
        if (rt.endDate && currentDueDate > rt.endDate) {
          await tx
            .update(recurringTransactions)
            .set({ isActive: false })
            .where(eq(recurringTransactions.id, id));
          status = "expired";
          break;
        }

        // Check idempotency (has this occurrence been processed already?)
        // Safe from races because we hold the FOR UPDATE lock on the parent recurring transaction.
        const [existing] = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.recurringTransactionId, id),
              eq(transactions.recurringOccurrenceDate, currentDueDate)
            )
          )
          .limit(1);

        if (existing) {
          skippedCount++;
        } else {
          // Create the actual transaction
          const transactionData: CreateTransactionData & {
            recurringTransactionId: string;
            recurringOccurrenceDate: Date;
          } = {
            id: crypto.randomUUID(),
            userId: rt.userId,
            accountId: rt.accountId,
            categoryId: rt.categoryId,
            amount: rt.amount,
            type: rt.type,
            transactionDate: currentDueDate,
            note: `[Auto] ${rt.note || "Recurring transaction"}`,
            recurringTransactionId: id,
            recurringOccurrenceDate: currentDueDate,
          };

          // Wait, TransactionsService.createTransaction does not expect recurringTransactionId and recurringOccurrenceDate in CreateTransactionData.
          // Wait, the CreateTransactionData type is inferred from transactions.$inferInsert. So it DOES accept them!
          await transactionsService.createTransaction(transactionData, tx);
          processedCount++;
        }

        // Advance to next due date
        const next = calculateNextDueDate(currentDueDate, rt.frequency as any, rt.startDate);
        if (next.getTime() <= currentDueDate.getTime()) {
          // Safety break to prevent infinite loops in case of logic error
          break;
        }
        currentDueDate = next;
      }

      // Update the recurring transaction with new due date
      await tx
        .update(recurringTransactions)
        .set({ nextDueDate: currentDueDate })
        .where(eq(recurringTransactions.id, id));

      if (processedCount === 0 && skippedCount > 0 && status !== "expired") {
         status = "skipped_already_processed";
      }

      return { status, processedCount, skippedCount, nextDueDate: currentDueDate };
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
      processedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [] as string[],
    };

    const results = await Promise.allSettled(
      dueTransactions.map((dt) => this.processRecurringTransaction(dt.id))
    );

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      if (res.status === "fulfilled") {
        stats.processedCount += res.value.processedCount;
        stats.skippedCount += res.value.skippedCount || 0;
      } else {
        stats.failedCount++;
        stats.errors.push(`Failed ${dueTransactions[i].id}: ${res.reason?.message || "Unknown error"}`);
      }
    }

    return stats;
  }
}

export const automationService = new AutomationService();
