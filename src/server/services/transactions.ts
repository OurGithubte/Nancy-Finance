import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import { CreateTransactionData, UpdateTransactionData } from "../repositories/transactions";

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

export class TransactionsService {
  async createTransaction(data: CreateTransactionData) {
    return await db.transaction(async (tx) => {
      // 0. Validate account ownership
      const accountsToVerify = [data.accountId];
      if (data.type === 'transfer' && data.toAccountId) {
        accountsToVerify.push(data.toAccountId);
      }
      await validateAccountOwnership(tx, accountsToVerify, data.userId);

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
    });
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

  async updateTransaction(id: string, userId: string, data: UpdateTransactionData) {
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

      // 1.5 Validate account ownership
      const accountsToVerify = [
        existingTx.accountId,
        data.accountId || existingTx.accountId
      ];
      if (existingTx.type === 'transfer' && existingTx.toAccountId) accountsToVerify.push(existingTx.toAccountId);
      if (data.type === 'transfer' && data.toAccountId) accountsToVerify.push(data.toAccountId);
      // If it changed type to transfer, data.toAccountId needs check.
      
      await validateAccountOwnership(tx, accountsToVerify, userId);

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
