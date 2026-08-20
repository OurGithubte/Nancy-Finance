import { categoriesRepository, CreateCategoryData, UpdateCategoryData } from "../repositories/categories";
import { z } from "zod";

const CATEGORY_TYPES = ["income", "expense"] as const;

const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Tên danh mục không được để trống").max(255),
    type: z.enum(CATEGORY_TYPES),
    icon: z.string().max(64).optional(),
    color: z.string().max(32).optional(),
    parentId: z.string().nullable().optional(),
  })
  .strict();

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Tên danh mục không được để trống").max(255).optional(),
    type: z.enum(CATEGORY_TYPES).optional(),
    icon: z.string().max(64).optional(),
    color: z.string().max(32).optional(),
    parentId: z.string().nullable().optional(),
  })
  .strict();

export class CategoriesService {
  async getCategories(userId: string) {
    return categoriesRepository.getCategoriesByUserId(userId);
  }

  async createCategory(data: CreateCategoryData) {
    const { id, userId, createdAt: _createdAt, updatedAt: _updatedAt, isSystem: _isSystem, ...clientPayload } = data as CreateCategoryData & {
      createdAt?: unknown;
      updatedAt?: unknown;
    };
    const payload = createCategorySchema.parse(clientPayload);

    if (payload.parentId) {
      // Chặn tham chiếu tới category không tồn tại / không thuộc user (foreign reference).
      const parent = await categoriesRepository.getCategoryById(payload.parentId, userId as string);
      if (!parent) {
        throw new Error("Danh mục cha không tồn tại hoặc không thuộc về bạn");
      }
    }

    return categoriesRepository.createCategory({
      ...payload,
      id,
      userId,
      isSystem: false, // client không bao giờ được tự khai báo category là system
    });
  }

  async updateCategory(id: string, userId: string, data: UpdateCategoryData) {
    const payload = updateCategorySchema.parse(data);

    if (payload.parentId) {
      if (payload.parentId === id) {
        throw new Error("Danh mục không thể là cha của chính nó");
      }
      const parent = await categoriesRepository.getCategoryById(payload.parentId, userId);
      if (!parent) {
        throw new Error("Danh mục cha không tồn tại hoặc không thuộc về bạn");
      }
    }

    return categoriesRepository.updateCategory(id, userId, payload);
  }

  async deleteCategory(id: string, userId: string) {
    return categoriesRepository.deleteCategory(id, userId);
  }
}

export const categoriesService = new CategoriesService();
