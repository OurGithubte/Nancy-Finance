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
          try {
            // Nested transaction (savepoint) guarantees atomicity between insert and balance update.
            // If unique constraint is violated, this block rolls back safely without aborting the outer tx.
            await tx.transaction(async (tx2) => {
              await transactionsService.createTransaction(transactionData, tx2);
            });
            processedCount++;
          } catch (e: any) {
            // PostgreSQL unique violation error code
            if (e.code === "23505" && e.constraint === "transactions_recurring_occurrence_unq") {
              skippedCount++;
            } else {
              // Other DB errors (e.g., account balance failure) MUST bubble up and fail the whole job
              throw e;
            }
          }
        }

        // Advance to next due date
        const next = calculateNextDueDate(currentDueDate, rt.frequency as any, rt.startDate);
        if (next.getTime() <= currentDueDate.getTime()) {
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
      
      const limitReached = (processedCount + skippedCount) >= MAX_CATCH_UP;

      return { status, processedCount, skippedCount, nextDueDate: currentDueDate, limitReached };
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

    const MAX_CONCURRENT_RECURRING = 10;
    
    // Process them in chunks to avoid unbounded concurrency
    for (let i = 0; i < dueTransactions.length; i += MAX_CONCURRENT_RECURRING) {
      const chunk = dueTransactions.slice(i, i + MAX_CONCURRENT_RECURRING);
      
      const results = await Promise.allSettled(
        chunk.map((dt) => this.processRecurringTransaction(dt.id))
      );

      for (let j = 0; j < results.length; j++) {
        const res = results[j];
        if (res.status === "fulfilled") {
          stats.processedCount += res.value.processedCount;
          stats.skippedCount += res.value.skippedCount || 0;
          if (res.value.limitReached) {
            stats.errors.push(`Warning: ${chunk[j].id} hit max catch up limit.`);
          }
        } else {
          stats.failedCount++;
          stats.errors.push(`Failed ${chunk[j].id}: ${res.reason?.message || "Unknown error"}`);
        }
      }
    }

    return stats;
  }
}

export const automationService = new AutomationService();
