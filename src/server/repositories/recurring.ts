import { db } from "@/db";
import { recurringTransactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type CreateRecurringInput = typeof recurringTransactions.$inferInsert;
export type UpdateRecurringInput = Partial<Omit<CreateRecurringInput, "id" | "userId" | "createdAt">>;

export const recurringRepository = {
  async getRecurringTransactions(userId: string) {
    return db
      .select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.userId, userId))
      .orderBy(recurringTransactions.nextDueDate);
  },

  async getRecurringById(id: string, userId: string) {
    const [rt] = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .limit(1);
    return rt || null;
  },

  async createRecurring(data: CreateRecurringInput) {
    const [rt] = await db.insert(recurringTransactions).values(data).returning();
    return rt;
  },

  async updateRecurring(id: string, userId: string, data: UpdateRecurringInput) {
    const [rt] = await db
      .update(recurringTransactions)
      .set(data)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)))
      .returning();
    return rt;
  },

  async deleteRecurring(id: string, userId: string) {
    await db
      .delete(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
    return true;
  }
};
