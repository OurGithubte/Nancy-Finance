"use client";

import React, { useState, useTransition } from "react";
import { createBudgetAction, updateBudgetAction, deleteBudgetAction } from "@/app/(dashboard)/budgets/actions";

export interface BudgetFormProps {
  categories: any[];
  budget?: any;
  onSuccess: () => void;
  onCancel: () => void;
  month: number;
  year: number;
}

export function BudgetForm({ categories, budget, onSuccess, onCancel, month, year }: BudgetFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isEdit = !!budget;

  // Filter only expense categories
  const expenseCategories = categories.filter(c => c.type === "expense");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const categoryId = formData.get("categoryId") as string;
    const allocatedAmount = Number(formData.get("allocatedAmount")?.toString().replace(/\D/g, ""));

    if (!categoryId) {
      setError("Vui lòng chọn danh mục.");
      return;
    }

    if (!allocatedAmount || allocatedAmount <= 0) {
      setError("Vui lòng nhập ngân sách hợp lệ.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateBudgetAction(budget.id, { allocatedAmount });
        } else {
          await createBudgetAction({ categoryId, allocatedAmount, month, year });
        }
        onSuccess();
      } catch (err: any) {
        setError(err.message || "Có lỗi xảy ra");
      }
    });
  };

  const handleDelete = () => {
    if (!budget) return;
    if (confirm("Bạn có chắc chắn muốn xóa ngân sách này?")) {
      startTransition(async () => {
        try {
          await deleteBudgetAction(budget.id);
          onSuccess();
        } catch (err: any) {
          setError(err.message || "Có lỗi xảy ra khi xóa");
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-expense/10 p-3 text-sm text-expense border border-expense/20">
          {error}
        </div>
      )}

      {!isEdit && (
        <div className="space-y-1.5">
          <label htmlFor="categoryId" className="text-sm font-medium text-slate-300">
            Danh mục chi tiêu <span className="text-expense">*</span>
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={budget?.categoryId || ""}
            disabled={isEdit}
            className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50"
            required
          >
            <option value="" disabled>Chọn danh mục</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="allocatedAmount" className="text-sm font-medium text-slate-300">
          Ngân sách (VND) <span className="text-expense">*</span>
        </label>
        <div className="relative">
          <input
            id="allocatedAmount"
            name="allocatedAmount"
            type="text"
            defaultValue={budget?.allocatedAmount || ""}
            placeholder="Ví dụ: 5000000"
            className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 pr-12 text-sm text-foreground outline-none transition-colors focus:border-primary font-medium"
            required
            onChange={(e) => {
              // Format numeric input
              let val = e.target.value.replace(/\D/g, "");
              if (val) {
                e.target.value = new Intl.NumberFormat("vi-VN").format(Number(val));
              }
            }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
            ₫
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-medium text-expense hover:bg-expense/10 transition-colors mr-auto disabled:opacity-50 cursor-pointer"
          >
            Xóa
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-surface transition-colors disabled:opacity-50 cursor-pointer"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isPending ? "Đang xử lý..." : isEdit ? "Lưu thay đổi" : "Tạo ngân sách"}
        </button>
      </div>
    </form>
  );
}
