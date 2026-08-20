"use server";

import { revalidatePath } from "next/cache";
import { transactionsService } from "@/server/services/transactions";
import { CreateTransactionData, UpdateTransactionData } from "@/server/repositories/transactions";
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

export type CreateTransactionInput = Pick<
  CreateTransactionData,
  "accountId" | "toAccountId" | "categoryId" | "type" | "amount" | "transactionDate" | "note" | "status"
>;

export async function createTransactionAction(data: CreateTransactionInput) {
  const userId = await getUserId();
  // Whitelist tường minh: recurringTransactionId/recurringOccurrenceDate/createdAt/updatedAt
  // chỉ được server tự đặt (dùng nội bộ bởi automation.ts), KHÔNG bao giờ nhận từ client
  // qua Server Action công khai này — kể cả khi payload cố gửi kèm các field đó.
  const tx = await transactionsService.createTransaction({
    accountId: data.accountId,
    toAccountId: data.toAccountId ?? null,
    categoryId: data.categoryId ?? null,
    type: data.type,
    amount: data.amount,
    transactionDate: data.transactionDate,
    note: data.note ?? null,
    status: data.status,
    userId,
    id: crypto.randomUUID(),
  });
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  return tx;
}

export async function updateTransactionAction(id: string, data: UpdateTransactionData) {
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
