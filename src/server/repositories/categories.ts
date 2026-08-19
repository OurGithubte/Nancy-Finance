import { db } from "@/db";
import { categories } from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";

export type CreateCategoryData = typeof categories.$inferInsert;
export type UpdateCategoryData = Partial<CreateCategoryData>;

export class CategoriesRepository {
  async getCategoriesByUserId(userId: string) {
    return db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, userId), isNull(categories.userId)))
      .orderBy(categories.name);
  }

  async getCategoryById(id: string, userId: string) {
    const result = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          or(eq(categories.userId, userId), isNull(categories.userId))
        )
      )
      .limit(1);
    return result[0];
  }

  async createCategory(data: CreateCategoryData) {
    const result = await db
      .insert(categories)
      .values(data)
      .returning();
    return result[0];
  }

  async updateCategory(id: string, userId: string, data: UpdateCategoryData) {
    // Only allow updating user-owned categories
    const result = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteCategory(id: string, userId: string) {
    // Only allow deleting user-owned categories
    const result = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    return result[0];
  }
}

export const categoriesRepository = new CategoriesRepository();
