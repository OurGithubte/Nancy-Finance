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
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thiết lập ngân sách</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400">Tổng ngân sách tháng</span>
          <div className="mt-1 text-lg font-bold text-slate-100">
            {formatVND(totalAllocated)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400">Đã chi</span>
          <div className="mt-1 text-lg font-bold text-rose-400">
            {formatVND(totalSpent)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400">Còn lại</span>
          <div className="mt-1 text-lg font-bold text-emerald-400">
            {formatVND(totalRemaining)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">
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
