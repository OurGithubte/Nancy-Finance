import { db } from "@/db";
import { loans, loanPayments, financialAccounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CreateLoanData, UpdateLoanData, CreateLoanPaymentData } from "../repositories/loans";

export class LoansService {
  async createLoan(data: CreateLoanData) {
    if (data.totalAmount <= 0) throw new Error("Total amount must be positive");
    if (data.remainingAmount < 0) throw new Error("Remaining amount cannot be negative");

    const [loan] = await db.insert(loans).values(data).returning();
    return loan;
  }

  async updateLoan(id: string, userId: string, data: UpdateLoanData) {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(loans).where(and(eq(loans.id, id), eq(loans.userId, userId)));
      if (!existing) throw new Error("Loan not found or access denied");

      if (data.remainingAmount !== undefined) {
        if (data.remainingAmount < 0) throw new Error("Remaining amount cannot be negative");
      }

      let status = data.status || existing.status;
      const newRemaining = data.remainingAmount !== undefined ? data.remainingAmount : existing.remainingAmount;
      if (newRemaining <= 0) {
        status = "settled";
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
