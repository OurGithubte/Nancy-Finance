"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/format/money";
import { mockAccounts, mockExpenseCategories } from "@/server/mock/dashboard-data";
import { TransactionType } from "@/types/finance";

export interface TransactionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function TransactionForm({
  onSuccess,
  onCancel,
  className,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amountStr, setAmountStr] = useState("150000");
  const [categoryId, setCategoryId] = useState("cat_food");
  const [accountId, setAccountId] = useState("acc_2");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const rawAmount = parseInt(amountStr.replace(/\D/g, "") || "0", 10);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAmountStr(raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedMessage("Đã ghi nhận giao dịch thành công!");
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 700);
    }, 400);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {submittedMessage && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center text-xs font-semibold text-emerald-400">
          {submittedMessage}
        </div>
      )}

      {/* Transaction Type Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-800/80 p-1 border border-slate-700/50">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-semibold transition-all",
            type === "expense"
              ? "bg-rose-500 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Chi tiêu
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-semibold transition-all",
            type === "income"
              ? "bg-emerald-500 text-slate-950 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Thu nhập
        </button>
        <button
          type="button"
          onClick={() => setType("transfer")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-semibold transition-all",
            type === "transfer"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          )}
        >
          Chuyển khoản
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Số tiền (VND)
        </label>
        <div className="relative">
          <input
            type="text"
            value={rawAmount > 0 ? rawAmount.toLocaleString("vi-VN") : ""}
            onChange={handleAmountChange}
            placeholder="0"
            required
            className="w-full rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2.5 text-lg font-bold text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            ₫
          </div>
        </div>
        {rawAmount > 0 && (
          <p className="mt-1 text-[11px] text-slate-400">
            Bằng chữ / Format:{" "}
            <span className="text-emerald-400 font-semibold">
              {formatVND(rawAmount)}
            </span>
          </p>
        )}
      </div>

      {/* Category Selection */}
      {type !== "transfer" && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Danh mục
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 outline-none focus:border-emerald-500 transition-all"
          >
            {mockExpenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Account Selection */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          {type === "transfer" ? "Từ tài khoản" : "Tài khoản / Ví"}
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 outline-none focus:border-emerald-500 transition-all"
        >
          {mockAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} (Số dư: {formatVND(acc.balance)})
            </option>
          ))}
        </select>
      </div>

      {/* Note / Description */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Ghi chú
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Cà phê sáng với bạn bè..."
          className="w-full rounded-xl border border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-800/60 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || rawAmount <= 0}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-900/30 transition-all"
        >
          {isSubmitting ? "Đang lưu..." : "Lưu giao dịch"}
        </button>
      </div>
    </form>
  );
}
