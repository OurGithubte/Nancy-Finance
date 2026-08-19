"use server";

import { revalidatePath } from "next/cache";
import { accountsService } from "@/server/services/accounts";
import { CreateAccountData } from "@/server/repositories/accounts";
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

export async function createAccountAction(data: Omit<CreateAccountData, "userId" | "id">) {
  const userId = await getUserId();
  const account = await accountsService.createAccount({ ...data, userId, id: crypto.randomUUID() });
  revalidatePath("/");
  revalidatePath("/accounts");
  return account;
}

export async function updateAccountAction(id: string, data: Partial<CreateAccountData>) {
  const userId = await getUserId();
  const account = await accountsService.updateAccount(id, userId, data);
  revalidatePath("/");
  revalidatePath("/accounts");
  return account;
}

export async function deleteAccountAction(id: string) {
  const userId = await getUserId();
  await accountsService.deleteAccount(id, userId);
  revalidatePath("/");
  revalidatePath("/accounts");
}
