"use server";

import { revalidatePath } from "next/cache";
import { transactionsService } from "@/server/services/transactions";
import { CreateTransactionData } from "@/server/repositories/transactions";
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

export async function createTransactionAction(data: Omit<CreateTransactionData, "userId" | "id">) {
  const userId = await getUserId();
  const tx = await transactionsService.createTransaction({ ...data, userId, id: crypto.randomUUID() });
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return tx;
}

export async function updateTransactionAction(id: string, data: Partial<CreateTransactionData>) {
  const userId = await getUserId();
  const tx = await transactionsService.updateTransaction(id, userId, data);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return tx;
}

export async function deleteTransactionAction(id: string) {
  const userId = await getUserId();
  await transactionsService.deleteTransaction(id, userId);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
}
