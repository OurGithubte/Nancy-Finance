import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";

const defaultExpenseCategories = [
  { name: "Ăn uống", icon: "utensils", color: "#F59E0B" },
  { name: "Cà phê", icon: "coffee", color: "#D97706" },
  { name: "Đi lại", icon: "bus", color: "#3B82F6" },
  { name: "Mua sắm", icon: "shopping-bag", color: "#EC4899" },
  { name: "Nhà ở", icon: "home", color: "#8B5CF6" },
  { name: "Điện nước", icon: "zap", color: "#06B6D4" },
  { name: "Con cái", icon: "baby", color: "#10B981" },
  { name: "Y tế", icon: "stethoscope", color: "#EF4444" },
  { name: "Học tập", icon: "book-open", color: "#6366F1" },
  { name: "Giải trí", icon: "gamepad-2", color: "#8B5CF6" },
  { name: "Trả nợ", icon: "credit-card", color: "#EF4444" },
  { name: "Khác", icon: "box", color: "#9CA3AF" },
];

const defaultIncomeCategories = [
  { name: "Lương", icon: "briefcase", color: "#10B981" },
  { name: "Thưởng", icon: "gift", color: "#34D399" },
  { name: "Thu nhập phụ", icon: "plus-circle", color: "#059669" },
  { name: "Đầu tư", icon: "trending-up", color: "#8B5CF6" },
  { name: "Hoàn tiền", icon: "banknote", color: "#F59E0B" },
  { name: "Khác", icon: "box", color: "#9CA3AF" },
];

export async function ensureDefaultCategories(userId: string) {
  // Check if user has any categories
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    // Insert default categories
    const itemsToInsert = [
      ...defaultExpenseCategories.map((c) => ({
        id: crypto.randomUUID(),
        userId,
        name: c.name,
        type: "expense" as const,
        icon: c.icon,
        color: c.color,
        isSystem: false,
      })),
      ...defaultIncomeCategories.map((c) => ({
        id: crypto.randomUUID(),
        userId,
        name: c.name,
        type: "income" as const,
        icon: c.icon,
        color: c.color,
        isSystem: false,
      })),
    ];

    await db.insert(categories).values(itemsToInsert);
  }
}
