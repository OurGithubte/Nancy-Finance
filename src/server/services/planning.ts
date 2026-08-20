import { planningRepository, CreateBudgetInput, UpdateBudgetInput, CreateSavingGoalInput, UpdateSavingGoalInput, CreateContributionInput } from "../repositories/planning";
import { categoriesService } from "./categories";

export const planningService = {
  // BUDGETS
  async getBudgets(userId: string, month: number, year: number) {
    return planningRepository.getBudgets(userId, month, year);
  },

  async createBudget(data: Omit<CreateBudgetInput, "id">) {
    // Check if category exists and belongs to user
    const categories = await categoriesService.getCategories(data.userId);
    const categoryExists = categories.some((c) => c.id === data.categoryId);
    if (!categoryExists) {
      throw new Error("Category not found or does not belong to user");
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
    return planningRepository.createSavingGoal({
      ...data,
      id: crypto.randomUUID()
    });
  },

  async updateSavingGoal(id: string, userId: string, data: UpdateSavingGoalInput) {
    return planningRepository.updateSavingGoal(id, userId, data);
  },

  async deleteSavingGoal(id: string, userId: string) {
    return planningRepository.deleteSavingGoal(id, userId);
  },

  // CONTRIBUTIONS
  async getContributions(goalId: string, userId: string) {
    return planningRepository.getContributionsByGoalId(goalId, userId);
  },

  async createContribution(data: Omit<CreateContributionInput, "id">) {
    if (data.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    return planningRepository.createContributionTx(data.savingGoalId, data.userId, {
      ...data,
      id: crypto.randomUUID()
    });
  }
};
