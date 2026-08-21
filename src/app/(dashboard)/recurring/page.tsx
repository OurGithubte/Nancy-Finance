import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { recurringService } from "@/server/services/recurring";
import { categoriesService } from "@/server/services/categories";
import { accountsRepository } from "@/server/repositories/accounts";
import { RecurringList } from "@/components/finance/recurring-list";
import { RecurringDialogs } from "@/components/finance/recurring-dialogs";
import { requireUser } from "@/lib/auth/server";

export default async function RecurringPage() {
  const user = await requireUser();
  const userId = user.id;

  const [recurring, categories, accounts] = await Promise.all([
    recurringService.getRecurringTransactions(userId),
    categoriesService.getCategories(userId),
    accountsRepository.getAccountsByUserId(userId),
  ]);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Giao dịch định kỳ"
        subtitle="Quản lý các khoản thu chi tự động lặp lại"
        actions={<RecurringDialogs accounts={accounts} categories={categories} />}
      />

      <RecurringList items={recurring} accounts={accounts} categories={categories} />
    </div>
  );
}
