import { recurringRepository, CreateRecurringInput, UpdateRecurringInput } from "../repositories/recurring";
import { z } from "zod";


const recurringSchema = z.object({
  accountId: z.string(),
  categoryId: z.string().nullable().optional(),
  amount: z.number().int().positive().max(1000000000000000, "Số tiền quá lớn"),
  type: z.enum(["income", "expense"]),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  note: z.string().nullable().optional(),
});

const updateRecurringSchema = recurringSchema.partial();

export const recurringService = {
  async getRecurringTransactions(userId: string) {
    return recurringRepository.getRecurringTransactions(userId);
  },

  async createRecurring(data: Omit<CreateRecurringInput, "id" | "nextDueDate">) {
    recurringSchema.parse(data);
    
    // Calculate initial next due date based on start date
    // Wait, if start date is in the past, we should maybe set nextDueDate to startDate.
    // If it's today or future, we set it to startDate.
    const nextDueDate = data.startDate;

    return recurringRepository.createRecurring({
      ...data,
      id: crypto.randomUUID(),
      nextDueDate,
      isActive: true,
    });
  },

  async updateRecurring(id: string, userId: string, data: UpdateRecurringInput) {
    updateRecurringSchema.parse(data);
    
    // Re-calculate next due date if start date changed and it makes sense, but we skip it for now 
    // unless user explicitly wants to reset it.
    
    return recurringRepository.updateRecurring(id, userId, data);
  },

  async toggleActive(id: string, userId: string, isActive: boolean) {
    return recurringRepository.updateRecurring(id, userId, { isActive });
  },

  async deleteRecurring(id: string, userId: string) {
    return recurringRepository.deleteRecurring(id, userId);
  }
};
