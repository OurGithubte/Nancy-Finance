import { db } from "@/db";
import { creditCards, creditCardTransactions, creditCardPayments, financialAccounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CreateCreditCardData, UpdateCreditCardData, CreateCreditCardTransactionData, CreateCreditCardPaymentData } from "../repositories/credit-cards";

export type UpdateCreditCardTransactionData = Partial<CreateCreditCardTransactionData>;

export class CreditCardsService {
  async createCreditCard(data: CreateCreditCardData) {
    const [card] = await db.insert(creditCards).values(data).returning();
    return card;
  }

  async updateCreditCard(id: string, userId: string, data: UpdateCreditCardData) {
    const [card] = await db
      .update(creditCards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)))
      .returning();
    return card;
  }

  async archiveCreditCard(id: string, userId: string) {
    const [card] = await db
      .update(creditCards)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(creditCards.id, id), eq(creditCards.userId, userId)))
      .returning();
    return card;
  }

  async createTransaction(userId: string, data: CreateCreditCardTransactionData) {
    return await db.transaction(async (tx) => {
      if (data.amount <= 0) throw new Error("Amount must be greater than 0");

      const [card] = await tx
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, userId)));
      
      if (!card) throw new Error("Credit card not found or access denied");

      if (card.currentBalance + data.amount > card.creditLimit) {
        throw new Error("Transaction exceeds credit limit");
      }

      const [newTx] = await tx.insert(creditCardTransactions).values(data).returning();

      const amountStr = data.amount.toString();
      await tx
        .update(creditCards)
        .set({ currentBalance: sql`${creditCards.currentBalance} + ${amountStr}::bigint` })
        .where(eq(creditCards.id, data.creditCardId));

      return newTx;
    });
  }

  async updateTransaction(userId: string, txId: string, data: UpdateCreditCardTransactionData) {
    return await db.transaction(async (tx) => {
      const [oldTx] = await tx
        .select()
        .from(creditCardTransactions)
        .where(eq(creditCardTransactions.id, txId));
      
      if (!oldTx) throw new Error("Transaction not found");

      const [card] = await tx
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.id, oldTx.creditCardId), eq(creditCards.userId, userId)));
      
      if (!card) throw new Error("Credit card not found or access denied");

      const newAmount = data.amount !== undefined ? data.amount : oldTx.amount;
      if (newAmount <= 0) throw new Error("Amount must be greater than 0");

      const newBalance = card.currentBalance - oldTx.amount + newAmount;
      if (newBalance > card.creditLimit) {
        throw new Error("Transaction exceeds credit limit");
      }

      const [updatedTx] = await tx
        .update(creditCardTransactions)
        .set(data)
        .where(eq(creditCardTransactions.id, txId))
        .returning();

      const balanceDiffStr = (newAmount - oldTx.amount).toString();
      await tx
        .update(creditCards)
        .set({ currentBalance: sql`${creditCards.currentBalance} + ${balanceDiffStr}::bigint` })
        .where(eq(creditCards.id, oldTx.creditCardId));

      return updatedTx;
    });
  }

  async deleteTransaction(userId: string, txId: string) {
    return await db.transaction(async (tx) => {
      const [oldTx] = await tx
        .select()
        .from(creditCardTransactions)
        .where(eq(creditCardTransactions.id, txId));
      
      if (!oldTx) throw new Error("Transaction not found");

      const [card] = await tx
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.id, oldTx.creditCardId), eq(creditCards.userId, userId)));
      
      if (!card) throw new Error("Credit card not found or access denied");

      const amountStr = oldTx.amount.toString();
      await tx
        .update(creditCards)
        .set({ currentBalance: sql`${creditCards.currentBalance} - ${amountStr}::bigint` })
        .where(eq(creditCards.id, oldTx.creditCardId));

      await tx.delete(creditCardTransactions).where(eq(creditCardTransactions.id, txId));
      
      return oldTx;
    });
  }

  async createPayment(userId: string, data: CreateCreditCardPaymentData & { accountId: string }) {
    return await db.transaction(async (tx) => {
      if (data.amount <= 0) throw new Error("Payment amount must be greater than 0");

      const [card] = await tx
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, userId)));
      
      if (!card) throw new Error("Credit card not found");

      if (data.amount > card.currentBalance) {
        throw new Error("Payment amount cannot exceed current balance");
      }

      const [account] = await tx
        .select()
        .from(financialAccounts)
        .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, userId)));
        
      if (!account) throw new Error("Account not found");

      const [_globalTx] = await tx.insert(transactions).values({
        id: crypto.randomUUID(),
        userId,
        accountId: data.accountId,
        type: "transfer",
        amount: data.amount,
        transactionDate: data.paymentDate,
        note: data.note || `Thanh toán dư nợ thẻ ${card.name}`,
        status: "completed"
      }).returning();

      const [payment] = await tx.insert(creditCardPayments).values({
        ...data,
        fromAccountId: data.accountId,
      }).returning();

      const amountStr = data.amount.toString();
      
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
        .where(eq(financialAccounts.id, data.accountId));

      const newBalance = card.currentBalance - data.amount;
      const safeBalance = newBalance < 0 ? 0 : newBalance;
      
      await tx
        .update(creditCards)
        .set({ currentBalance: safeBalance })
        .where(eq(creditCards.id, data.creditCardId));

      return payment;
    });
  }
}

export const creditCardsService = new CreditCardsService();
