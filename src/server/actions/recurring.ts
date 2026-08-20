"use server";

import { recurringService } from "../services/recurring";
import { CreateRecurringInput, UpdateRecurringInput } from "../repositories/recurring";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth"; // Assume there's auth

async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getRecurringTransactionsAction() {
  try {
    const userId = await getUserId();
    const data = await recurringService.getRecurringTransactions(userId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createRecurringAction(data: Omit<CreateRecurringInput, "id" | "userId" | "nextDueDate" | "createdAt">) {
  try {
    const userId = await getUserId();
    const result = await recurringService.createRecurring({
      ...data,
      userId,
    });
    revalidatePath("/recurring");
    revalidatePath("/calendar");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateRecurringAction(id: string, data: UpdateRecurringInput) {
  try {
    const userId = await getUserId();
    const result = await recurringService.updateRecurring(id, userId, data);
    revalidatePath("/recurring");
    revalidatePath("/calendar");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleRecurringAction(id: string, isActive: boolean) {
  try {
    const userId = await getUserId();
    const result = await recurringService.toggleActive(id, userId, isActive);
    revalidatePath("/recurring");
    revalidatePath("/calendar");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteRecurringAction(id: string) {
  try {
    const userId = await getUserId();
    await recurringService.deleteRecurring(id, userId);
    revalidatePath("/recurring");
    revalidatePath("/calendar");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
