"use client";

import React, { useState, useTransition } from "react";
import { createContributionAction } from "@/app/(dashboard)/goals/actions";
import { formatVND } from "@/lib/format/money";

export interface ContributionFormProps {
  goalId: string;
  currentAmount: number;
  type: "contribution" | "withdrawal";
  onSuccess: () => void;
  onCancel: () => void;
}

export function ContributionForm({ goalId, currentAmount, type, onSuccess, onCancel }: ContributionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount")?.toString().replace(/\D/g, ""));
    const note = formData.get("note") as string;

    if (!amount || amount <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ lớn hơn 0.");
      return;
    }

    if (type === "withdrawal" && amount > currentAmount) {
      setError(`Số tiền rút không được vượt quá số dư hiện tại (${formatVND(currentAmount)}).`);
      return;
    }

    startTransition(async () => {
      try {
        await createContributionAction({ savingGoalId: goalId, amount, type, note });
        onSuccess();
      } catch (err: any) {
        setError(err.message || "Có lỗi xảy ra");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-expense/10 p-3 text-sm text-expense border border-expense/20">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="amount" className="text-sm font-medium text-slate-300">
          Số tiền (VND) <span className="text-expense">*</span>
        </label>
        <div className="relative">
          <input
            id="amount"
            name="amount"
            type="text"
            placeholder="Ví dụ: 500000"
            className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 pr-12 text-sm text-foreground outline-none transition-colors focus:border-primary font-medium"
            required
            onChange={(e) => {
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
        {type === "withdrawal" && (
          <p className="text-xs text-muted mt-1">
            Số dư hiện tại: {formatVND(currentAmount)}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="note" className="text-sm font-medium text-slate-300">
          Ghi chú (Tùy chọn)
        </label>
        <input
          id="note"
          name="note"
          type="text"
          placeholder="Ví dụ: Thưởng tháng 5"
          className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </div>
      
      <div className="rounded-lg bg-surface/50 p-3 mt-4 text-xs text-muted border border-border/50">
        Lưu ý: Giao dịch này chỉ cập nhật tiến độ mục tiêu. Nếu thực tế có luân chuyển tiền, hãy tạo thêm giao dịch "Chuyển khoản" trong phần Thu / Chi.
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border">
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
          className={`rounded-xl px-4 py-2 text-sm font-bold shadow-sm disabled:opacity-50 cursor-pointer text-slate-950 transition-colors ${
            type === "contribution" ? "bg-income hover:bg-income/90" : "bg-expense hover:bg-expense/90"
          }`}
        >
          {isPending ? "Đang xử lý..." : type === "contribution" ? "Xác nhận góp" : "Xác nhận rút"}
        </button>
      </div>
    </form>
  );
}
