import { db } from "@/db";
import { loans, loanPayments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type CreateLoanData = typeof loans.$inferInsert;
export type UpdateLoanData = Partial<CreateLoanData>;
export type CreateLoanPaymentData = typeof loanPayments.$inferInsert;

export class LoansRepository {
  async getLoans(userId: string) {
    return db.query.loans.findMany({
      where: and(
        eq(loans.userId, userId),
        eq(loans.isActive, true)
      ),
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });
  }

  async getLoanById(id: string, userId: string) {
    return db.query.loans.findFirst({
      where: and(eq(loans.id, id), eq(loans.userId, userId), eq(loans.isActive, true)),
    });
  }

  async createLoan(data: CreateLoanData) {
    const [loan] = await db.insert(loans).values(data).returning();
    return loan;
  }

  async updateLoan(id: string, userId: string, data: UpdateLoanData, dbTx: any = db) {
    const [loan] = await dbTx
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

  async createPayment(data: CreateLoanPaymentData, dbTx: any = db) {
    const [payment] = await dbTx.insert(loanPayments).values(data).returning();
    return payment;
  }
}

export const loansRepository = new LoansRepository();
