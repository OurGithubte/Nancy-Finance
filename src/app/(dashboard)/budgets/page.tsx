"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { BudgetProgress } from "@/components/finance/budget-progress";
import { mockBudgets } from "@/server/mock/dashboard-data";
import { Plus } from "lucide-react";
import { formatVND } from "@/lib/format/money";

export default function BudgetsPage() {
  const totalAllocated = mockBudgets.reduce((acc, b) => acc + b.allocatedAmount, 0);
  const totalSpent = mockBudgets.reduce((acc, b) => acc + b.spentAmount, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Ngân sách"
        subtitle="Kiểm soát trần chi tiêu theo từng danh mục trong tháng"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thiết lập ngân sách</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng ngân sách tháng</span>
          <div className="mt-1 text-lg font-bold text-foreground">
            {formatVND(totalAllocated)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Đã chi</span>
          <div className="mt-1 text-lg font-bold text-expense">
            {formatVND(totalSpent)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Còn lại</span>
          <div className="mt-1 text-lg font-bold text-income">
            {formatVND(totalRemaining)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          Tiến độ ngân sách từng danh mục
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mockBudgets.map((budget) => (
            <BudgetProgress key={budget.id} budget={budget} />
          ))}
        </div>
      </div>
    </div>
  );
}
