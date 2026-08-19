"use server";

import { revalidatePath } from "next/cache";
import { loansService } from "@/server/services/loans";
import { CreateLoanData, UpdateLoanData, CreateLoanPaymentData } from "@/server/repositories/loans";
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

export async function createLoanAction(data: Omit<CreateLoanData, "userId" | "id">) {
  const userId = await getUserId();
  const loan = await loansService.createLoan({ ...data, userId, id: crypto.randomUUID() });
  revalidatePath("/");
  revalidatePath("/loans");
  return loan;
}

export async function updateLoanAction(id: string, data: UpdateLoanData) {
  const userId = await getUserId();
  const loan = await loansService.updateLoan(id, userId, data);
  revalidatePath("/");
  revalidatePath("/loans");
  return loan;
}

export async function archiveLoanAction(id: string) {
  const userId = await getUserId();
  await loansService.archiveLoan(id, userId);
  revalidatePath("/");
  revalidatePath("/loans");
}

export async function createLoanPaymentAction(data: Omit<CreateLoanPaymentData, "id" | "createdAt" | "fromAccountId"> & { accountId: string }) {
  const userId = await getUserId();
  const payment = await loansService.createPayment(userId, {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  });
  revalidatePath("/");
  revalidatePath("/loans");
  return payment;
}
