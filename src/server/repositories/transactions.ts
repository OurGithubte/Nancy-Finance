import { db } from "@/db";
import { transactions, financialAccounts, categories } from "@/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export type CreateTransactionData = typeof transactions.$inferInsert;

// Explicit whitelist: KHÔNG bao gồm id, userId, createdAt, updatedAt,
// recurringTransactionId, recurringOccurrenceDate (các field hệ thống dùng để
// chống double-count giao dịch định kỳ — client tuyệt đối không được sửa).
export interface UpdateTransactionData {
  type?: "income" | "expense" | "transfer";
  accountId?: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  amount?: number;
  transactionDate?: Date;
  note?: string | null;
  status?: "completed" | "pending" | "cancelled";
}

export class TransactionsRepository {
  async getTransactions(
    userId: string,
    periodStart?: Date,
    periodEnd?: Date,
    limitParam?: number
  ) {
    const toAccount = alias(financialAccounts, "to_account");

    const conditions = [eq(transactions.userId, userId)];
    if (periodStart) conditions.push(gte(transactions.transactionDate, periodStart));
    if (periodEnd) conditions.push(lte(transactions.transactionDate, periodEnd));

    let query = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
        toAccountId: transactions.toAccountId,
        type: transactions.type,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
        note: transactions.note,
        status: transactions.status,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        account: {
          id: financialAccounts.id,
          name: financialAccounts.name,
          icon: financialAccounts.icon,
          color: financialAccounts.color,
        },
        category: {
          id: categories.id,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
        },
        toAccount: {
          id: toAccount.id,
          name: toAccount.name,
          icon: toAccount.icon,
          color: toAccount.color,
        },
      })
      .from(transactions)
      .leftJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(toAccount, eq(transactions.toAccountId, toAccount.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt));

    if (limitParam) {
      query = query.limit(limitParam) as any;
    }

    return query;
  }

  async getTransactionById(id: string, userId: string) {
    const result = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    return result[0];
  }
}

export const transactionsRepository = new TransactionsRepository();
