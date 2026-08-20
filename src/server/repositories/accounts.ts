import { db } from "@/db";
import { financialAccounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type CreateAccountData = typeof financialAccounts.$inferInsert;

// Explicit whitelist: KHÔNG bao gồm id, userId, createdAt, updatedAt.
// Đây là DTO duy nhất được phép cho update — chặn mass-assignment.
export interface UpdateAccountData {
  name?: string;
  type?: "cash" | "bank" | "ewallet" | "savings" | "investment";
  balance?: number;
  accountNumber?: string | null;
  bankCode?: string | null;
  color?: string;
  icon?: string;
  isExcludedFromTotal?: boolean;
  isActive?: boolean;
}

export class AccountsRepository {
  async getAccountsByUserId(userId: string) {
    return db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.userId, userId))
      .orderBy(financialAccounts.createdAt);
  }

  async getAccountById(id: string, userId: string) {
    const result = await db
      .select()
      .from(financialAccounts)
      .where(
        and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId))
      )
      .limit(1);
    return result[0];
  }

  async createAccount(data: CreateAccountData) {
    const result = await db
      .insert(financialAccounts)
      .values(data)
      .returning();
    return result[0];
  }

  async updateAccount(id: string, userId: string, data: UpdateAccountData) {
    const result = await db
      .update(financialAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId))
      )
      .returning();
    return result[0];
  }

  async deleteAccount(id: string, userId: string) {
    const result = await db
      .delete(financialAccounts)
      .where(
        and(eq(financialAccounts.id, id), eq(financialAccounts.userId, userId))
      )
      .returning();
    return result[0];
  }
}

export const accountsRepository = new AccountsRepository();
