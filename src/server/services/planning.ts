import { planningRepository, CreateBudgetInput, UpdateBudgetInput, CreateSavingGoalInput, UpdateSavingGoalInput, CreateContributionInput } from "../repositories/planning";
import { categoriesService } from "./categories";
import { z } from "zod";

const budgetSchema = z.object({
  allocatedAmount: z.number().int().positive().max(1000000000000000, "Số tiền quá lớn"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const updateBudgetSchema = z.object({
  allocatedAmount: z.number().int().positive().max(1000000000000000, "Số tiền quá lớn"),
});

const savingGoalSchema = z.object({
  name: z.string().trim().min(1, "Tên mục tiêu không được để trống").max(255),
  targetAmount: z.number().int().positive().max(1000000000000000, "Số tiền quá lớn"),
  targetDate: z.date().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const updateSavingGoalSchema = savingGoalSchema.partial();

const contributionSchema = z.object({
  amount: z.number().int().positive().max(1000000000000000, "Số tiền quá lớn"),
  type: z.enum(["contribution", "withdrawal"]),
  note: z.string().optional(),
});

export const planningService = {
  // BUDGETS
  async getBudgets(userId: string, month: number, year: number) {
    return planningRepository.getBudgets(userId, month, year);
  },

  async createBudget(data: Omit<CreateBudgetInput, "id">) {
    budgetSchema.parse(data);
    
    // Check if category exists and belongs to user
    const categories = await categoriesService.getCategories(data.userId);
    const category = categories.find((c) => c.id === data.categoryId);
    if (!category) {
      throw new Error("Category not found or does not belong to user");
    }
    if (category.type !== "expense") {
      throw new Error("Budget can only be created for expense categories");
    }

    const exists = await planningRepository.checkBudgetExists(data.userId, data.categoryId, data.month, data.year);
    if (exists) {
      throw new Error("A budget for this category already exists for the selected month and year");
    }

    return planningRepository.createBudget({
      ...data,
      id: crypto.randomUUID()
    });
  },

  async updateBudget(id: string, userId: string, data: UpdateBudgetInput) {
    updateBudgetSchema.parse(data);
    return planningRepository.updateBudget(id, userId, data);
  },

  async deleteBudget(id: string, userId: string) {
    return planningRepository.deleteBudget(id, userId);
  },

  // SAVING GOALS
  async getSavingGoals(userId: string) {
    return planningRepository.getSavingGoals(userId);
  },

  async createSavingGoal(data: Omit<CreateSavingGoalInput, "id">) {
    savingGoalSchema.parse(data);
    return planningRepository.createSavingGoal({
      ...data,
      id: crypto.randomUUID()
    });
  },

  async updateSavingGoal(id: string, userId: string, data: Omit<UpdateSavingGoalInput, "status" | "currentAmount">) {
    updateSavingGoalSchema.parse(data);
    
    // Handle target change logic
    const goal = await planningRepository.getSavingGoalById(id, userId);
    if (!goal) throw new Error("Saving goal not found");
    
    let newStatus = goal.status;
    if (data.targetAmount) {
      if (goal.currentAmount >= data.targetAmount && goal.status !== "cancelled") {
        newStatus = "achieved";
      } else if (goal.currentAmount < data.targetAmount && goal.status === "achieved") {
        newStatus = "in_progress";
      }
    }

    return planningRepository.updateSavingGoal(id, userId, {
      ...data,
      status: newStatus
    });
  },

  async deleteSavingGoal(id: string, userId: string) {
    return planningRepository.deleteSavingGoal(id, userId);
  },

  // CONTRIBUTIONS
  async getContributions(goalId: string, userId: string) {
    return planningRepository.getContributionsByGoalId(goalId, userId);
  },

  async createContribution(data: Omit<CreateContributionInput, "id">) {
    contributionSchema.parse(data);
    
    return planningRepository.createContributionTx(data.savingGoalId, data.userId, {
      ...data,
      id: crypto.randomUUID()
    });
  }
};
