"use server";

import { revalidatePath } from "next/cache";
import { planningService } from "@/server/services/planning";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { UpdateBudgetInput } from "@/server/repositories/planning";

import { z } from "zod";

async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

function handleError(error: unknown): never {
  if (error instanceof z.ZodError) {
    throw new Error(error.errors[0].message);
  }
  if (error instanceof Error) {
    throw new Error(error.message);
  }
  throw new Error("An unexpected error occurred");
}

export async function createBudgetAction(data: { categoryId: string; allocatedAmount: number; month: number; year: number }) {
  try {
    const userId = await getUserId();
    const result = await planningService.createBudget({ ...data, userId });
    revalidatePath("/");
    revalidatePath("/budgets");
    return result;
  } catch (error) {
    handleError(error);
  }
}

export async function updateBudgetAction(id: string, data: UpdateBudgetInput) {
  try {
    const userId = await getUserId();
    const result = await planningService.updateBudget(id, userId, data);
    revalidatePath("/");
    revalidatePath("/budgets");
    return result;
  } catch (error) {
    handleError(error);
  }
}

export async function deleteBudgetAction(id: string) {
  try {
    const userId = await getUserId();
    await planningService.deleteBudget(id, userId);
    revalidatePath("/");
    revalidatePath("/budgets");
  } catch (error) {
    handleError(error);
  }
}
