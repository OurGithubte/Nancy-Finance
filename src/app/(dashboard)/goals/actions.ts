"use server";

import { revalidatePath } from "next/cache";
import { planningService } from "@/server/services/planning";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { UpdateSavingGoalInput } from "@/server/repositories/planning";

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

export async function createSavingGoalAction(data: { name: string; targetAmount: number; targetDate?: Date | null; icon?: string; color?: string }) {
  try {
    const userId = await getUserId();
    const result = await planningService.createSavingGoal({ ...data, userId });
    revalidatePath("/");
    revalidatePath("/goals");
    return result;
  } catch (error) {
    handleError(error);
  }
}

export async function updateSavingGoalAction(id: string, data: Omit<UpdateSavingGoalInput, "status" | "currentAmount">) {
  try {
    const userId = await getUserId();
    const result = await planningService.updateSavingGoal(id, userId, data);
    revalidatePath("/");
    revalidatePath("/goals");
    return result;
  } catch (error) {
    handleError(error);
  }
}

export async function deleteSavingGoalAction(id: string) {
  try {
    const userId = await getUserId();
    await planningService.deleteSavingGoal(id, userId);
    revalidatePath("/");
    revalidatePath("/goals");
  } catch (error) {
    handleError(error);
  }
}

export async function createContributionAction(data: { savingGoalId: string; amount: number; type: "contribution" | "withdrawal"; note?: string }) {
  try {
    const userId = await getUserId();
    const result = await planningService.createContribution({ ...data, userId });
    revalidatePath("/");
    revalidatePath("/goals");
    return result;
  } catch (error) {
    handleError(error);
  }
}
