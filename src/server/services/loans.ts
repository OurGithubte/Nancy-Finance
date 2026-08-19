import { db } from "@/db";
import { loans, loanPayments, financialAccounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { CreateLoanData, UpdateLoanData, CreateLoanPaymentData } from "../repositories/loans";

export class LoansService {
  async createLoan(data: CreateLoanData) {
    const [loan] = await db.insert(loans).values(data).returning();
    return loan;
  }

  async updateLoan(id: string, userId: string, data: UpdateLoanData) {
    const [loan] = await db
      .update(loans)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(loans.id, id), eq(loans.userId, userId)))
      .returning();
    return loan;
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
      // Validate loan ownership
      const [loan] = await tx
        .select()
        .from(loans)
        .where(and(eq(loans.id, data.loanId), eq(loans.userId, userId)));
      
      if (!loan) throw new Error("Loan not found");

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
        type: "expense",
        amount: data.amount,
        transactionDate: data.paymentDate,
        note: data.note || `Thanh toán khoản vay ${loan.name}`,
        status: "completed"
      }).returning();

      // 2. Insert payment record
      const [payment] = await tx.insert(loanPayments).values({
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

      // Decrease loan remaining amount (debt)
      await tx
        .update(loans)
        .set({ remainingAmount: sql`${loans.remainingAmount} - ${amountStr}::bigint` })
        .where(eq(loans.id, data.loanId));

      return payment;
    });
  }
}

export const loansService = new LoansService();
