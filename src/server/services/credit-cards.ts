import { db } from "@/db";
import { creditCards, creditCardTransactions, creditCardPayments, financialAccounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateCreditCardData,
  UpdateCreditCardData,
  CreateCreditCardTransactionData,
  UpdateCreditCardTransactionData,
  CreateCreditCardPaymentData,
} from "../repositories/credit-cards";
import { z } from "zod";

const CARD_NETWORKS = ["visa", "mastercard", "jcb", "amex"] as const;
const CC_TX_STATUS = ["posted", "pending", "cancelled"] as const;

const createCreditCardSchema = z
  .object({
    name: z.string().trim().min(1, "Tên thẻ không được để trống").max(255),
    bankName: z.string().trim().min(1, "Tên ngân hàng không được để trống").max(255),
    cardNetwork: z.enum(CARD_NETWORKS).optional(),
    last4Digits: z.string().regex(/^\d{4}$/, "4 số cuối không hợp lệ"),
    creditLimit: z.number().int().positive("Hạn mức phải lớn hơn 0"),
    currentBalance: z.number().int().min(0).optional(),
    statementDay: z.number().int().min(1).max(31).optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    color: z.string().max(32).optional(),
  })
  .strict();

// Whitelist update: KHÔNG cho phép sửa id/userId/createdAt/currentBalance (currentBalance
// chỉ được đổi qua transaction/payment nội bộ để tránh desync với sổ giao dịch thẻ).
const updateCreditCardSchema = z
  .object({
    name: z.string().trim().min(1, "Tên thẻ không được để trống").max(255).optional(),
    bankName: z.string().trim().min(1, "Tên ngân hàng không được để trống").max(255).optional(),
    cardNetwork: z.enum(CARD_NETWORKS).optional(),
    last4Digits: z.string().regex(/^\d{4}$/, "4 số cuối không hợp lệ").optional(),
    creditLimit: z.number().int().positive("Hạn mức phải lớn hơn 0").optional(),
    statementDay: z.number().int().min(1).max(31).optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    color: z.string().max(32).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// Whitelist update giao dịch thẻ: KHÔNG bao giờ nhận creditCardId — cấm tuyệt đối việc
// "chuyển" một giao dịch đã có sang thẻ khác (kể cả thẻ của chính user) qua đường update.
const updateCreditCardTransactionSchema = z
  .object({
    amount: z.number().int().positive("Số tiền phải lớn hơn 0").optional(),
    description: z.string().trim().min(1).max(500).optional(),
    category: z.string().max(128).nullable().optional(),
    transactionDate: z.date().optional(),
    status: z.enum(CC_TX_STATUS).optional(),
  })
  .strict();

export class CreditCardsService {
  async createCreditCard(data: CreateCreditCardData) {
    const { id, userId, createdAt: _createdAt, updatedAt: _updatedAt, isActive: _isActive, ...clientPayload } = data as CreateCreditCardData & {
      createdAt?: unknown;
      updatedAt?: unknown;
    };
    const payload = createCreditCardSchema.parse(clientPayload);
    const [card] = await db
      .insert(creditCards)
      .values({
        ...payload,
        currentBalance: payload.currentBalance ?? 0,
        id,
        userId,
      })
      .returning();
    return card;
  }

  async updateCreditCard(id: string, userId: string, data: UpdateCreditCardData) {
    const payload = updateCreditCardSchema.parse(data);
    const [card] = await db
      .update(creditCards)
      .set({ ...payload, updatedAt: new Date() })
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
      if (!data.amount || data.amount <= 0) throw new Error("Amount must be greater than 0");
      if (!data.creditCardId) throw new Error("creditCardId is required");

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

  async updateTransaction(userId: string, txId: string, rawData: UpdateCreditCardTransactionData) {
    // Whitelist tuyệt đối: nếu client cố nhét thêm creditCardId/id/createdAt vào payload,
    // .strict() của zod sẽ reject request thay vì âm thầm bỏ qua.
    const data = updateCreditCardTransactionSchema.parse(rawData);
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
        .where(and(eq(creditCardTransactions.id, txId), eq(creditCardTransactions.creditCardId, oldTx.creditCardId)))
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
