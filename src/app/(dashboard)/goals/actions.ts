"use server";

import { revalidatePath } from "next/cache";
import { planningService } from "@/server/services/planning";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { UpdateSavingGoalInput } from "@/server/repositories/planning";

async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function createSavingGoalAction(data: { name: string; targetAmount: number; targetDate?: Date | null; icon?: string; color?: string }) {
  const userId = await getUserId();
  const result = await planningService.createSavingGoal({ ...data, userId });
  revalidatePath("/");
  revalidatePath("/goals");
  return result;
}

export async function updateSavingGoalAction(id: string, data: UpdateSavingGoalInput) {
  const userId = await getUserId();
  const result = await planningService.updateSavingGoal(id, userId, data);
  revalidatePath("/");
  revalidatePath("/goals");
  return result;
}

export async function deleteSavingGoalAction(id: string) {
  const userId = await getUserId();
  await planningService.deleteSavingGoal(id, userId);
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function createContributionAction(data: { savingGoalId: string; amount: number; type: "contribution" | "withdrawal"; note?: string }) {
  const userId = await getUserId();
  const result = await planningService.createContribution({ ...data, userId });
  revalidatePath("/");
  revalidatePath("/goals");
  return result;
}
