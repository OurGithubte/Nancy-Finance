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

  async createRecurring(data: Omit<CreateRecurringInput, "id" | "nextDueDate"> & { userId: string }) {
    // QUAN TRỌNG: dùng payload đã được zod parse() trả về (chỉ chứa field whitelist),
    // KHÔNG dùng lại `data` gốc — nếu không, mọi field lạ client nhét thêm (vd. userId,
    // isActive, id) sẽ vẫn lọt qua vì .parse() chỉ ném lỗi validate, không tự sanitize hộ.
    const payload = recurringSchema.parse(data);

    // Calculate initial next due date based on start date
    // If it's today or future, we set it to startDate.
    const nextDueDate = payload.startDate;

    return recurringRepository.createRecurring({
      ...payload,
      id: crypto.randomUUID(),
      userId: data.userId,
      nextDueDate,
      isActive: true,
    });
  },

  async updateRecurring(id: string, userId: string, data: UpdateRecurringInput) {
    const payload = updateRecurringSchema.parse(data);
    return recurringRepository.updateRecurring(id, userId, payload);
  },

  async toggleActive(id: string, userId: string, isActive: boolean) {
    return recurringRepository.updateRecurring(id, userId, { isActive });
  },

  async deleteRecurring(id: string, userId: string) {
    return recurringRepository.deleteRecurring(id, userId);
  }
};
