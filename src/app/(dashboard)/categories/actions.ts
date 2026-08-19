"use server";

import { revalidatePath } from "next/cache";
import { categoriesService } from "@/server/services/categories";
import { CreateCategoryData } from "@/server/repositories/categories";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createCategoryAction(data: Omit<CreateCategoryData, "userId" | "id">) {
  const userId = await getUserId();
  const category = await categoriesService.createCategory({ ...data, userId, id: crypto.randomUUID() });
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/settings");
  return category;
}

export async function updateCategoryAction(id: string, data: Partial<CreateCategoryData>) {
  const userId = await getUserId();
  const category = await categoriesService.updateCategory(id, userId, data);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/settings");
  return category;
}

export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  await categoriesService.deleteCategory(id, userId);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/settings");
}
