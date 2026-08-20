"use client";

import React, { useState } from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { BudgetProgress } from "@/components/finance/budget-progress";
import { BudgetItem } from "@/types/finance";
import { Plus } from "lucide-react";
import { formatVND } from "@/lib/format/money";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { BudgetForm } from "@/components/finance/budget-form";

interface BudgetsClientProps {
  budgets: BudgetItem[];
  categories: any[];
}

export function BudgetsClient({ budgets, categories }: BudgetsClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const totalAllocated = budgets.reduce((acc, b) => acc + b.allocatedAmount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spentAmount, 0);
  const totalRemaining = totalAllocated - totalSpent;

  const handleOpenCreate = () => {
    setEditingBudget(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (budget: BudgetItem) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Ngân sách"
        subtitle={`Kiểm soát trần chi tiêu theo từng danh mục trong tháng ${currentMonth}/${currentYear}`}
        actions={
          <button
            type="button"
            onClick={handleOpenCreate}
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
        {budgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center bg-surface-card/20">
            <p className="text-sm text-muted mb-4">Bạn chưa thiết lập ngân sách nào cho tháng này.</p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover transition-colors border border-border cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tạo ngân sách đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => (
              <BudgetProgress 
                key={budget.id} 
                budget={budget} 
                onClick={() => handleOpenEdit(budget)}
              />
            ))}
          </div>
        )}
      </div>

      <FinanceDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingBudget ? "Điều chỉnh ngân sách" : "Thiết lập ngân sách"}
        description={editingBudget ? "Sửa đổi ngân sách cho danh mục này" : "Tạo giới hạn chi tiêu mới cho một danh mục"}
      >
        <BudgetForm
          categories={categories}
          budget={editingBudget}
          month={currentMonth}
          year={currentYear}
          onSuccess={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
        />
      </FinanceDialog>
    </div>
  );
}
