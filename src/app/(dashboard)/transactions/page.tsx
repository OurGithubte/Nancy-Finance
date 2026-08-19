import React from "react";
import { TransactionsClient } from "./transactions-client";
import { transactionsRepository } from "@/server/repositories/transactions";
import { accountsService } from "@/server/services/accounts";
import { categoriesService } from "@/server/services/categories";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const userId = session.user.id;
  
  const [transactions, accounts, categories] = await Promise.all([
    transactionsRepository.getTransactions(userId, undefined, undefined, 100),
    accountsService.getAccounts(userId),
    categoriesService.getCategories(userId),
  ]);

  const mappedTransactions = transactions.map(tx => ({
    id: tx.id,
    title: tx.note || (tx.category ? tx.category.name : (tx.type === "transfer" ? "Chuyển khoản" : "Giao dịch")),
    type: tx.type,
    amount: tx.amount,
    categoryId: tx.categoryId || "",
    categoryName: tx.category?.name || "Khác",
    categoryColor: tx.category?.color || "#9CA3AF",
    accountId: tx.accountId,
    accountName: tx.account?.name || "",
    transactionDate: tx.transactionDate.toISOString(),
    note: tx.note || "",
    status: tx.status
  }));

  return (
    <TransactionsClient 
      transactions={mappedTransactions} 
      accounts={accounts} 
      categories={categories} 
    />
  );
}
