"use server";

import { revalidatePath } from "next/cache";
import { planningService } from "@/server/services/planning";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { UpdateBudgetInput } from "@/server/repositories/planning";

async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createBudgetAction(data: { categoryId: string; allocatedAmount: number; month: number; year: number }) {
  const userId = await getUserId();
  const result = await planningService.createBudget({ ...data, userId });
  revalidatePath("/");
  revalidatePath("/budgets");
  return result;
}

export async function updateBudgetAction(id: string, data: UpdateBudgetInput) {
  const userId = await getUserId();
  const result = await planningService.updateBudget(id, userId, data);
  revalidatePath("/");
  revalidatePath("/budgets");
  return result;
}

export async function deleteBudgetAction(id: string) {
  const userId = await getUserId();
  await planningService.deleteBudget(id, userId);
  revalidatePath("/");
  revalidatePath("/budgets");
}
