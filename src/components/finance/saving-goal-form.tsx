"use client";

import React, { useState, useTransition } from "react";
import { createSavingGoalAction, updateSavingGoalAction, deleteSavingGoalAction } from "@/app/(dashboard)/goals/actions";

export interface SavingGoalFormProps {
  goal?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SavingGoalForm({ goal, onSuccess, onCancel }: SavingGoalFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const isEdit = !!goal;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const targetAmount = Number(formData.get("targetAmount")?.toString().replace(/\D/g, ""));
    const dateStr = formData.get("targetDate") as string;
    const targetDate = dateStr ? new Date(dateStr) : null;
    const icon = formData.get("icon") as string;
    const color = formData.get("color") as string;

    if (!name) {
      setError("Vui lòng nhập tên mục tiêu.");
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      setError("Vui lòng nhập số tiền mục tiêu hợp lệ.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateSavingGoalAction(goal.id, { name, targetAmount, targetDate, icon, color });
        } else {
          await createSavingGoalAction({ name, targetAmount, targetDate, icon, color });
        }
        onSuccess();
      } catch (err: any) {
        setError(err.message || "Có lỗi xảy ra");
      }
    });
  };

  const handleDelete = () => {
    if (!goal) return;
    if (confirm("Bạn có chắc chắn muốn xóa mục tiêu này? Dữ liệu đóng góp cũng sẽ bị xóa.")) {
      startTransition(async () => {
        try {
          await deleteSavingGoalAction(goal.id);
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

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">
          Tên mục tiêu <span className="text-expense">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={goal?.name || ""}
          placeholder="Ví dụ: Quỹ khẩn cấp, Mua xe..."
          className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="targetAmount" className="text-sm font-medium text-slate-300">
          Số tiền mục tiêu (VND) <span className="text-expense">*</span>
        </label>
        <div className="relative">
          <input
            id="targetAmount"
            name="targetAmount"
            type="text"
            defaultValue={goal?.targetAmount || ""}
            placeholder="Ví dụ: 100000000"
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
      </div>

      <div className="space-y-1.5">
        <label htmlFor="targetDate" className="text-sm font-medium text-slate-300">
          Hạn chót (Tùy chọn)
        </label>
        <input
          id="targetDate"
          name="targetDate"
          type="date"
          defaultValue={goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ""}
          className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary [color-scheme:dark]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="icon" className="text-sm font-medium text-slate-300">
            Biểu tượng
          </label>
          <select
            id="icon"
            name="icon"
            defaultValue={goal?.icon || "target"}
            className="w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
          >
            <option value="target">Mục tiêu (Target)</option>
            <option value="shield">Bảo vệ (Shield)</option>
            <option value="plane">Du lịch (Plane)</option>
            <option value="home">Nhà (Home)</option>
            <option value="car">Xe (Car)</option>
            <option value="book">Học tập (Book)</option>
          </select>
        </div>
        
        <div className="space-y-1.5">
          <label htmlFor="color" className="text-sm font-medium text-slate-300">
            Màu sắc
          </label>
          <div className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface-card px-2">
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={goal?.color || "#8B5CF6"}
              className="h-6 w-full cursor-pointer bg-transparent border-none outline-none"
            />
          </div>
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
          {isPending ? "Đang xử lý..." : isEdit ? "Lưu thay đổi" : "Tạo mục tiêu"}
        </button>
      </div>
    </form>
  );
}
