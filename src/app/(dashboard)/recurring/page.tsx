import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { getRecurringTransactionsAction } from "@/server/actions/recurring";
import { categoriesService } from "@/server/services/categories";
import { accountsRepository } from "@/server/repositories/accounts";
import { RecurringList } from "@/components/finance/recurring-list";
import { RecurringDialogs } from "@/components/finance/recurring-dialogs";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function RecurringPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  const [recurringRes, categories, accounts] = await Promise.all([
    getRecurringTransactionsAction(),
    categoriesService.getCategories(userId),
    accountsRepository.getAccountsByUserId(userId)
  ]);

  const recurring = recurringRes.success && recurringRes.data ? recurringRes.data : [];

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Giao dịch định kỳ"
        subtitle="Quản lý các khoản thu chi tự động lặp lại"
        actions={<RecurringDialogs accounts={accounts} categories={categories} />}
      />

      <RecurringList 
        items={recurring} 
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
