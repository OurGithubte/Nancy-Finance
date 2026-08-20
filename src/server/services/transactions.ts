import { db } from "@/db";
import { transactions, financialAccounts, categories } from "@/db/schema";
import { eq, sql, and, inArray, isNull, or } from "drizzle-orm";
import { CreateTransactionData, UpdateTransactionData } from "../repositories/transactions";
import { z } from "zod";

const TX_TYPES = ["income", "expense", "transfer"] as const;
const TX_STATUS = ["completed", "pending", "cancelled"] as const;

// Whitelist update: KHÔNG bao giờ nhận id/userId/createdAt/recurringTransactionId/
// recurringOccurrenceDate từ client, kể cả khi payload cố nhét thêm các field này.
const updateTransactionSchema = z
  .object({
    type: z.enum(TX_TYPES).optional(),
    accountId: z.string().min(1).optional(),
    toAccountId: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    amount: z.number().int().positive("Số tiền phải lớn hơn 0").optional(),
    transactionDate: z.date().optional(),
    note: z.string().max(1000).nullable().optional(),
    status: z.enum(TX_STATUS).optional(),
  })
  .strict();

async function validateAccountOwnership(tx: any, accountIds: (string | null | undefined)[], userId: string) {
  const uniqueIds = Array.from(new Set(accountIds.filter(Boolean))) as string[];
  if (uniqueIds.length === 0) return;

  const accounts = await tx
    .select({ id: financialAccounts.id, userId: financialAccounts.userId })
    .from(financialAccounts)
    .where(inArray(financialAccounts.id, uniqueIds));

  if (accounts.length !== uniqueIds.length) {
    throw new Error("One or more financial accounts not found");
  }
  for (const acc of accounts) {
    if (acc.userId !== userId) {
      throw new Error("Account ownership validation failed");
    }
  }
}

async function validateCategoryOwnership(tx: any, categoryId: string | null | undefined, userId: string) {
  if (!categoryId) return;
  const [category] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), or(eq(categories.userId, userId), isNull(categories.userId))))
    .limit(1);
  if (!category) {
    throw new Error("Category not found or does not belong to user");
  }
}

export class TransactionsService {
  async createTransaction(data: CreateTransactionData, externalTx?: any) {
    if (!data.amount || data.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    if (externalTx) {
      return await this._createTx(data, externalTx);
    }
    return await db.transaction(async (tx) => {
      return await this._createTx(data, tx);
    });
  }

  private async _createTx(data: CreateTransactionData, tx: any) {
    // 0. Validate account + category ownership
    const accountsToVerify = [data.accountId];
    if (data.type === 'transfer') {
      if (!data.toAccountId) {
        throw new Error("Transfer requires a destination account");
      }
      if (data.accountId === data.toAccountId) {
        throw new Error("Cannot transfer to the same account");
      }
      accountsToVerify.push(data.toAccountId);
    }
    await validateAccountOwnership(tx, accountsToVerify, data.userId);
    await validateCategoryOwnership(tx, data.categoryId, data.userId);

    // 1. Insert transaction
    const [newTx] = await tx.insert(transactions).values(data).returning();

    // 2. Update balances
    const amountStr = data.amount.toString();
    
    if (data.type === "expense") {
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
        .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, data.userId)));
    } else if (data.type === "income") {
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
        .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, data.userId)));
    } else if (data.type === "transfer" && data.toAccountId) {
      // Decrease source
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
        .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, data.userId)));
      // Increase destination
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
        .where(and(eq(financialAccounts.id, data.toAccountId), eq(financialAccounts.userId, data.userId)));
    }

    return newTx;
  }

  async deleteTransaction(id: string, userId: string) {
    return await db.transaction(async (tx) => {
      // 1. Get existing transaction
      const [existingTx] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .limit(1);

      if (!existingTx) {
        throw new Error("Transaction not found");
      }

      // 2. Reverse balances
      const amountStr = existingTx.amount.toString();
      
      if (existingTx.type === "expense") {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "income") {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "transfer" && existingTx.toAccountId) {
        // Re-increase source
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
        // Re-decrease destination
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.toAccountId), eq(financialAccounts.userId, userId)));
      }

      // 3. Delete transaction
      await tx
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
        
      return true;
    });
  }

  async updateTransaction(id: string, userId: string, rawData: UpdateTransactionData) {
    // Whitelist tuyệt đối: id/userId/createdAt/recurringTransactionId/recurringOccurrenceDate
    // bị loại bỏ ngay cả khi payload cố gửi kèm — .strict() sẽ reject request.
    const data = updateTransactionSchema.parse(rawData);
    return await db.transaction(async (tx) => {
      // 1. Get existing
      const [existingTx] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .limit(1);

      if (!existingTx) {
        throw new Error("Transaction not found");
      }

      // Giao dịch sinh ra từ recurring transaction không được sửa loại/tài khoản/số tiền
      // qua đường update thủ công để tránh phá vỡ liên kết đối soát với recurring.
      if (existingTx.recurringTransactionId) {
        throw new Error("Giao dịch được sinh tự động từ giao dịch định kỳ không thể chỉnh sửa trực tiếp");
      }

      // 1.5 Validate account + category ownership
      const finalType = data.type ?? existingTx.type;
      const finalAccountId = data.accountId ?? existingTx.accountId;
      const finalToAccountId = data.toAccountId !== undefined ? data.toAccountId : existingTx.toAccountId;

      if (finalType === 'transfer') {
        if (!finalToAccountId) {
          throw new Error("Transfer requires a destination account");
        }
        if (finalAccountId === finalToAccountId) {
          throw new Error("Cannot transfer to the same account");
        }
      }

      const accountsToVerify = [
        existingTx.accountId,
        data.accountId || existingTx.accountId
      ];
      if (existingTx.type === 'transfer' && existingTx.toAccountId) accountsToVerify.push(existingTx.toAccountId);
      if (data.type === 'transfer' && data.toAccountId) accountsToVerify.push(data.toAccountId);
      // If it changed type to transfer, data.toAccountId needs check.

      await validateAccountOwnership(tx, accountsToVerify, userId);
      if (data.categoryId !== undefined) {
        await validateCategoryOwnership(tx, data.categoryId, userId);
      }

      // 2. Reverse balances (same logic as delete)
      const oldAmountStr = existingTx.amount.toString();
      if (existingTx.type === "expense") {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "income") {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "transfer" && existingTx.toAccountId) {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.toAccountId), eq(financialAccounts.userId, userId)));
      }

      // 3. Update row
      const [updatedTx] = await tx
        .update(transactions)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning();

      // 4. Apply new balances
      const newAmountStr = updatedTx.amount.toString();
      if (updatedTx.type === "expense") {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (updatedTx.type === "income") {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (updatedTx.type === "transfer" && updatedTx.toAccountId) {
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.accountId), eq(financialAccounts.userId, userId)));
        await tx
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.toAccountId), eq(financialAccounts.userId, userId)));
      }

      return updatedTx;
    });
  }
}

export const transactionsService = new TransactionsService();
