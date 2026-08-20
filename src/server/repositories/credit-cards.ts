import { db } from "@/db";
import { creditCards, creditCardTransactions, creditCardPayments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type CreateCreditCardData = typeof creditCards.$inferInsert;

// Explicit whitelist: KHÔNG bao gồm id, userId, createdAt, updatedAt, currentBalance
// (currentBalance chỉ được thay đổi qua transaction/payment nội bộ, không update trực tiếp).
export interface UpdateCreditCardData {
  name?: string;
  bankName?: string;
  cardNetwork?: "visa" | "mastercard" | "jcb" | "amex";
  last4Digits?: string;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  color?: string;
  isActive?: boolean;
}

export type CreateCreditCardTransactionData = typeof creditCardTransactions.$inferInsert;

// Explicit whitelist cho update giao dịch thẻ: KHÔNG bao gồm id, createdAt, creditCardId.
// creditCardId bị cấm tuyệt đối để tránh exploit "reassign giao dịch sang thẻ khác".
export interface UpdateCreditCardTransactionData {
  amount?: number;
  description?: string;
  category?: string | null;
  transactionDate?: Date;
  status?: "posted" | "pending" | "cancelled";
}

export type CreateCreditCardPaymentData = typeof creditCardPayments.$inferInsert;

export class CreditCardsRepository {
  async getCreditCards(userId: string) {
    return db.query.creditCards.findMany({
      where: and(
        eq(creditCards.userId, userId),
        eq(creditCards.isActive, true)
      ),
      orderBy: (cards, { desc }) => [desc(cards.createdAt)],
    });
  }

  async getCreditCardById(id: string, userId: string) {
    return db.query.creditCards.findFirst({
      where: and(eq(creditCards.id, id), eq(creditCards.userId, userId), eq(creditCards.isActive, true)),
    });
  }

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

  async createTransaction(data: CreateCreditCardTransactionData, dbTx: any = db) {
    const [tx] = await dbTx.insert(creditCardTransactions).values(data).returning();
    return tx;
  }

  async createPayment(data: CreateCreditCardPaymentData, dbTx: any = db) {
    const [payment] = await dbTx.insert(creditCardPayments).values(data).returning();
    return payment;
  }
}

export const creditCardsRepository = new CreditCardsRepository();
