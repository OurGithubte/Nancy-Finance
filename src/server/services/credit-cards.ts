import { db } from "@/db";
import { creditCards, creditCardTransactions, creditCardPayments, financialAccounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CreateCreditCardData, UpdateCreditCardData, CreateCreditCardTransactionData, CreateCreditCardPaymentData } from "../repositories/credit-cards";

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
      // Validate card ownership
      const [card] = await tx
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, userId)));
      
      if (!card) {
        throw new Error("Credit card not found or access denied");
      }

      // Insert tx
      const [newTx] = await tx.insert(creditCardTransactions).values(data).returning();

      // Increase currentBalance of credit card
      const amountStr = data.amount.toString();
      await tx
        .update(creditCards)
        .set({ currentBalance: sql`${creditCards.currentBalance} + ${amountStr}::bigint` })
        .where(eq(creditCards.id, data.creditCardId));

      return newTx;
    });
  }

  async createPayment(userId: string, data: CreateCreditCardPaymentData & { accountId: string }) {
    return await db.transaction(async (tx) => {
      // Validate card ownership
      const [card] = await tx
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.id, data.creditCardId), eq(creditCards.userId, userId)));
      
      if (!card) throw new Error("Credit card not found");

      // Validate account ownership
      const [account] = await tx
        .select()
        .from(financialAccounts)
        .where(and(eq(financialAccounts.id, data.accountId), eq(financialAccounts.userId, userId)));
        
      if (!account) throw new Error("Account not found");

      // 1. Create a global transaction for the account deduction
      const [_globalTx] = await tx.insert(transactions).values({
        id: crypto.randomUUID(),
        userId,
        accountId: data.accountId,
        type: "expense", // Treat as expense or transfer? 'expense' works for cash outflow
        amount: data.amount,
        transactionDate: data.paymentDate,
        note: data.note || `Thanh toán dư nợ thẻ ${card.name}`,
        status: "completed"
      }).returning();

      // 2. Insert payment record
      const [payment] = await tx.insert(creditCardPayments).values({
        ...data,
        fromAccountId: data.accountId,
      }).returning();

      // 3. Update balances
      const amountStr = data.amount.toString();
      
      // Decrease financial account balance
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
        .where(eq(financialAccounts.id, data.accountId));

      // Decrease credit card current balance (debt)
      await tx
        .update(creditCards)
        .set({ currentBalance: sql`${creditCards.currentBalance} - ${amountStr}::bigint` })
        .where(eq(creditCards.id, data.creditCardId));

      return payment;
    });
  }
}

export const creditCardsService = new CreditCardsService();
