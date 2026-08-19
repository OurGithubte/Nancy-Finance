import { db } from "@/db";
import { transactions, financialAccounts } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { CreateTransactionData, UpdateTransactionData, transactionsRepository } from "../repositories/transactions";

export class TransactionsService {
  async createTransaction(data: CreateTransactionData) {
      // 1. Insert transaction
      const [newTx] = await db.insert(transactions).values(data).returning();

      // 2. Update balances
      const amountStr = data.amount.toString();
      
      if (data.type === "expense") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, data.userId)));
      } else if (data.type === "income") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, data.userId)));
      } else if (data.type === "transfer" && data.toAccountId) {
        // Decrease source
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, data.userId)));
        // Increase destination
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, data.toAccountId), eq(financialAccounts.userId, data.userId)));
      }

      return newTx;
  }

  async deleteTransaction(id: string, userId: string) {
      // 1. Get existing transaction
      const [existingTx] = await db
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
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "income") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "transfer" && existingTx.toAccountId) {
        // Re-increase source
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
        // Re-decrease destination
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.toAccountId), eq(financialAccounts.userId, userId)));
      }

      // 3. Delete transaction
      await db
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
        
      return true;
  }

  async updateTransaction(id: string, userId: string, data: UpdateTransactionData) {
      // 1. Get existing
      const [existingTx] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .limit(1);

      if (!existingTx) {
        throw new Error("Transaction not found");
      }

      // 2. Reverse balances (same logic as delete)
      const oldAmountStr = existingTx.amount.toString();
      if (existingTx.type === "expense") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "income") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (existingTx.type === "transfer" && existingTx.toAccountId) {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.accountId), eq(financialAccounts.userId, userId)));
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${oldAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, existingTx.toAccountId), eq(financialAccounts.userId, userId)));
      }

      // 3. Update row
      const [updatedTx] = await db
        .update(transactions)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning();

      // 4. Apply new balances
      const newAmountStr = updatedTx.amount.toString();
      if (updatedTx.type === "expense") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (updatedTx.type === "income") {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.accountId), eq(financialAccounts.userId, userId)));
      } else if (updatedTx.type === "transfer" && updatedTx.toAccountId) {
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} - ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.accountId), eq(financialAccounts.userId, userId)));
        await db
          .update(financialAccounts)
          .set({ balance: sql`${financialAccounts.balance} + ${newAmountStr}::bigint` })
          .where(and(eq(financialAccounts.id, updatedTx.toAccountId), eq(financialAccounts.userId, userId)));
      }

      return updatedTx;
  }
}

export const transactionsService = new TransactionsService();
