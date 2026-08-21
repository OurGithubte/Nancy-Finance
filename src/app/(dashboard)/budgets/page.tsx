import React from "react";
import { requireUser } from "@/lib/auth/server";
import { planningService } from "@/server/services/planning";
import { categoriesService } from "@/server/services/categories";
import { getVNDateParts } from "@/server/services/reports";
import { BudgetsClient } from "./budgets-client";
import { BudgetItem } from "@/types/finance";

export default async function BudgetsPage() {
  const user = await requireUser();
  const userId = user.id;
  const { y: year, m: month } = getVNDateParts(new Date());

  const [rawBudgets, categories] = await Promise.all([
    planningService.getBudgets(userId, month, year),
    categoriesService.getCategories(userId),
  ]);

  const mappedBudgets: BudgetItem[] = rawBudgets.map((b) => {
    const remaining = b.allocatedAmount - b.spentAmount;
    const usedPercent = b.allocatedAmount > 0 ? (b.spentAmount / b.allocatedAmount) * 100 : 0;

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category?.name || "Khác",
      allocatedAmount: b.allocatedAmount,
      spentAmount: b.spentAmount,
      remainingAmount: remaining,
      usedPercentage: Number(usedPercent.toFixed(1)),
      color: b.category?.color || "#9CA3AF",
      isOverBudget: b.spentAmount > b.allocatedAmount,
    };
  });

  return <BudgetsClient budgets={mappedBudgets} categories={categories} />;
}
