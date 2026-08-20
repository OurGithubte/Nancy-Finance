"use server";

import { revalidatePath } from "next/cache";
import { creditCardsService } from "@/server/services/credit-cards";
import { CreateCreditCardData, UpdateCreditCardData, CreateCreditCardTransactionData, CreateCreditCardPaymentData } from "@/server/repositories/credit-cards";
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

export async function createCreditCardAction(data: Omit<CreateCreditCardData, "userId" | "id">) {
  const userId = await getUserId();
  const card = await creditCardsService.createCreditCard({ ...data, userId, id: crypto.randomUUID() });
  revalidatePath("/");
  revalidatePath("/credit-cards");
  return card;
}

export async function updateCreditCardAction(id: string, data: UpdateCreditCardData) {
  const userId = await getUserId();
  const card = await creditCardsService.updateCreditCard(id, userId, data);
  revalidatePath("/");
  revalidatePath("/credit-cards");
  return card;
}

export async function archiveCreditCardAction(id: string) {
  const userId = await getUserId();
  await creditCardsService.archiveCreditCard(id, userId);
  revalidatePath("/");
  revalidatePath("/credit-cards");
}

export async function createCreditCardTransactionAction(data: Omit<CreateCreditCardTransactionData, "id" | "createdAt">) {
  const userId = await getUserId();
  const tx = await creditCardsService.createTransaction(userId, { ...data, id: crypto.randomUUID(), createdAt: new Date() });
  revalidatePath("/");
  revalidatePath("/credit-cards");
  return tx;
}

export async function createCreditCardPaymentAction(data: Omit<CreateCreditCardPaymentData, "id" | "createdAt" | "fromAccountId"> & { accountId: string }) {
  const userId = await getUserId();
  const payment = await creditCardsService.createPayment(userId, {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  });
  revalidatePath("/");
  revalidatePath("/credit-cards");
  return payment;
}

export async function updateCreditCardTransactionAction(id: string, data: Partial<Omit<CreateCreditCardTransactionData, "id" | "createdAt">>) {
  const userId = await getUserId();
  const tx = await creditCardsService.updateTransaction(userId, id, data);
  revalidatePath("/");
  revalidatePath("/credit-cards");
  return tx;
}

export async function deleteCreditCardTransactionAction(id: string) {
  const userId = await getUserId();
  await creditCardsService.deleteTransaction(userId, id);
  revalidatePath("/");
  revalidatePath("/credit-cards");
}
