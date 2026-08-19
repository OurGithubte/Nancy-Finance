import { categoriesRepository, CreateCategoryData, UpdateCategoryData } from "../repositories/categories";

export class CategoriesService {
  async getCategories(userId: string) {
    return categoriesRepository.getCategoriesByUserId(userId);
  }

  async createCategory(data: CreateCategoryData) {
    return categoriesRepository.createCategory(data);
  }

  async updateCategory(id: string, userId: string, data: UpdateCategoryData) {
    return categoriesRepository.updateCategory(id, userId, data);
  }

  async deleteCategory(id: string, userId: string) {
    return categoriesRepository.deleteCategory(id, userId);
  }
}

export const categoriesService = new CategoriesService();
