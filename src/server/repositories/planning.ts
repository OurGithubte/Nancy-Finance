import { db } from "@/db";
import { budgets, savingGoals, savingGoalContributions, transactions, categories } from "@/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface CreateBudgetInput {
  userId: string;
  categoryId: string;
  allocatedAmount: number;
  month: number;
  year: number;
}

export interface UpdateBudgetInput {
  allocatedAmount?: number;
}

export interface CreateSavingGoalInput {
  userId: string;
  name: string;
  targetAmount: number;
  targetDate?: Date | null;
  icon?: string;
  color?: string;
}

export interface UpdateSavingGoalInput {
  name?: string;
  targetAmount?: number;
  targetDate?: Date | null;
  icon?: string;
  color?: string;
  status?: "in_progress" | "achieved" | "cancelled";
  currentAmount?: number;
}

export interface CreateContributionInput {
  userId: string;
  savingGoalId: string;
  amount: number;
  type: "contribution" | "withdrawal";
  transactionDate?: Date;
  note?: string;
}

export const planningRepository = {
  // --- BUDGETS ---
  async getBudgets(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const userBudgets = await db
      .select({
        budget: budgets,
        category: categories,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.month, month),
          eq(budgets.year, year)
        )
      );

    const expenses = await db
      .select({
        categoryId: transactions.categoryId,
        spentAmount: sql<number>`SUM(${transactions.amount})`.mapWith(Number),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          eq(transactions.status, "completed"),
          gte(transactions.transactionDate, startDate),
          lte(transactions.transactionDate, endDate)
        )
      )
      .groupBy(transactions.categoryId);

    const expenseMap = new Map<string, number>();
    for (const exp of expenses) {
      if (exp.categoryId) {
        expenseMap.set(exp.categoryId, exp.spentAmount);
      }
    }

    return userBudgets.map((b) => ({
      ...b.budget,
      category: b.category,
      spentAmount: expenseMap.get(b.budget.categoryId) || 0,
    }));
  },

  async getBudgetById(id: string, userId: string) {
    const res = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .limit(1);
    return res[0];
  },

  async checkBudgetExists(userId: string, categoryId: string, month: number, year: number) {
    const res = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, categoryId),
          eq(budgets.month, month),
          eq(budgets.year, year)
        )
      )
      .limit(1);
    return res.length > 0;
  },

  async createBudget(data: CreateBudgetInput & { id: string }) {
    const res = await db.insert(budgets).values(data).returning();
    return res[0];
  },

  async updateBudget(id: string, userId: string, data: UpdateBudgetInput) {
    const res = await db
      .update(budgets)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();
    return res[0];
  },

  async deleteBudget(id: string, userId: string) {
    const res = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();
    return res[0];
  },

  // --- SAVING GOALS ---
  async getSavingGoals(userId: string) {
    return db
      .select()
      .from(savingGoals)
      .where(eq(savingGoals.userId, userId))
      .orderBy(desc(savingGoals.createdAt));
  },

  async getSavingGoalById(id: string, userId: string) {
    const res = await db
      .select()
      .from(savingGoals)
      .where(and(eq(savingGoals.id, id), eq(savingGoals.userId, userId)))
      .limit(1);
    return res[0];
  },

  async createSavingGoal(data: CreateSavingGoalInput & { id: string }) {
    const res = await db.insert(savingGoals).values(data).returning();
    return res[0];
  },

  async updateSavingGoal(id: string, userId: string, data: UpdateSavingGoalInput, txClient?: any) {
    const client = txClient || db;
    const res = await client
      .update(savingGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(savingGoals.id, id), eq(savingGoals.userId, userId)))
      .returning();
    return res[0];
  },

  async deleteSavingGoal(id: string, userId: string) {
    const res = await db
      .delete(savingGoals)
      .where(and(eq(savingGoals.id, id), eq(savingGoals.userId, userId)))
      .returning();
    return res[0];
  },

  // --- CONTRIBUTIONS ---
  async getContributionsByGoalId(goalId: string, userId: string) {
    return db
      .select()
      .from(savingGoalContributions)
      .where(
        and(
          eq(savingGoalContributions.savingGoalId, goalId),
          eq(savingGoalContributions.userId, userId)
        )
      )
      .orderBy(desc(savingGoalContributions.transactionDate));
  },

  async createContributionTx(
    goalId: string,
    userId: string,
    data: CreateContributionInput & { id: string }
  ) {
    return db.transaction(async (tx) => {
      const goalRes = await tx
        .select()
        .from(savingGoals)
        .where(and(eq(savingGoals.id, goalId), eq(savingGoals.userId, userId)))
        .limit(1);
      
      const goal = goalRes[0];
      if (!goal) throw new Error("Saving goal not found");
      if (goal.status === "cancelled") throw new Error("Cannot contribute to a cancelled goal");

      const contrib = await tx.insert(savingGoalContributions).values(data).returning();

      let newAmount = goal.currentAmount;
      if (data.type === "contribution") {
        newAmount += data.amount;
      } else {
        newAmount -= data.amount;
        if (newAmount < 0) throw new Error("Withdrawal amount exceeds current amount");
      }

      let newStatus = goal.status;
      if (newAmount >= goal.targetAmount) {
        newStatus = "achieved";
      } else if (newAmount < goal.targetAmount && goal.status === "achieved") {
        newStatus = "in_progress";
      }

      await tx
        .update(savingGoals)
        .set({
          currentAmount: newAmount,
          status: newStatus,
          updatedAt: new Date()
        })
        .where(eq(savingGoals.id, goal.id));

      return contrib[0];
    });
  }
};
