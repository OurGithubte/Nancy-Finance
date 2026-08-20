import { db } from "@/db";
import { loans, loanPayments, financialAccounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CreateLoanData, UpdateLoanData, CreateLoanPaymentData } from "../repositories/loans";
import { z } from "zod";

const LOAN_TYPES = ["car", "home", "consumer", "business", "student"] as const;

// Whitelist update: KHÔNG nhận id/userId/createdAt/status từ client — status luôn được
// server tự suy ra từ remainingAmount để tránh user tự đặt "settled"/"defaulted" tùy ý.
const updateLoanSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    lenderName: z.string().trim().min(1).max(255).optional(),
    type: z.enum(LOAN_TYPES).optional(),
    totalAmount: z.number().int().positive().optional(),
    remainingAmount: z.number().int().min(0).optional(),
    monthlyPayment: z.number().int().min(0).optional(),
    // Cột DB là numeric -> drizzle map sang string; nhận cả number từ UI rồi chuẩn hoá về string.
    interestRate: z
      .union([z.string(), z.number()])
      .transform((v) => String(v))
      .optional(),
    totalTerms: z.number().int().positive().optional(),
    remainingTerms: z.number().int().min(0).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    color: z.string().max(32).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export class LoansService {
  async createLoan(data: CreateLoanData) {
    // Strip các field hệ thống dù client cố gửi kèm: id/userId đã do action layer sinh,
    // nhưng status/createdAt/updatedAt vẫn có thể lọt qua nếu không loại bỏ tường minh.
    const { status: _status, createdAt: _createdAt, updatedAt: _updatedAt, isActive: _isActive, ...rest } =
      data as CreateLoanData & { createdAt?: unknown; updatedAt?: unknown };

    if (rest.totalAmount <= 0) throw new Error("Total amount must be positive");
    if (rest.remainingAmount < 0) throw new Error("Remaining amount cannot be negative");

    const [loan] = await db
      .insert(loans)
      .values({ ...rest, status: rest.remainingAmount <= 0 ? "settled" : "active" })
      .returning();
    return loan;
  }

  async updateLoan(id: string, userId: string, rawData: UpdateLoanData) {
    const data = updateLoanSchema.parse(rawData);
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
      if (!existing) throw new Error("Loan not found or access denied");

      // status luôn tự tính, không nhận trực tiếp từ client.
      let status = existing.status;
      const newRemaining = data.remainingAmount !== undefined ? data.remainingAmount : existing.remainingAmount;
      if (newRemaining <= 0) {
        status = "settled";
      } else if (status === "settled" && newRemaining > 0) {
        status = "active";
      }

      const [loan] = await tx
        .update(loans)
        .set({ ...data, status, updatedAt: new Date() })
        .where(and(eq(loans.id, id), eq(loans.userId, userId)))
        .returning();
      return loan;
    });
  }

  async archiveLoan(id: string, userId: string) {
    const [loan] = await db
      .update(loans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .returning();
    return loan;
  }

  async createPayment(userId: string, data: CreateLoanPaymentData & { accountId: string }) {
    return await db.transaction(async (tx) => {
      if (data.amount <= 0) throw new Error("Payment amount must be greater than 0");

      const [loan] = await tx
        .select()
        .from(loans)
        .where(and(eq(loans.id, data.loanId), eq(loans.userId, userId)));
      
      if (!loan) throw new Error("Loan not found");

      if (data.amount > loan.remainingAmount) {
        throw new Error("Payment amount cannot exceed remaining amount");
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
        note: data.note || `Thanh toán khoản vay ${loan.name}`,
        status: "completed"
      }).returning();

      const [payment] = await tx.insert(loanPayments).values({
        ...data,
        fromAccountId: data.accountId,
      }).returning();

      const amountStr = data.amount.toString();
      
      await tx
        .update(financialAccounts)
        .set({ balance: sql`${financialAccounts.balance} - ${amountStr}::bigint` })
        .where(eq(financialAccounts.id, data.accountId));

      const newRemaining = loan.remainingAmount - data.amount;
      const safeRemaining = newRemaining < 0 ? 0 : newRemaining;
      
      const updateData: any = { remainingAmount: safeRemaining };
      if (safeRemaining === 0) {
        updateData.status = "settled";
      }

      await tx
        .update(loans)
        .set(updateData)
        .where(eq(loans.id, data.loanId));

      return payment;
    });
  }
}

export const loansService = new LoansService();
