"use client";

import React, { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/format/money";
import { TransactionType } from "@/types/finance";
import { createTransactionAction } from "@/app/(dashboard)/transactions/actions";

export interface TransactionFormProps {
  accounts?: any[];
  categories?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function TransactionForm({
  accounts = [],
  categories = [],
  onSuccess,
  onCancel,
  className,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || "");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const rawAmount = parseInt(amountStr.replace(/\D/g, "") || "0", 10);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAmountStr(raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawAmount <= 0 || !accountId) return;
    
    startTransition(async () => {
      try {
        await createTransactionAction({
          type,
          amount: rawAmount,
          accountId,
          categoryId: type !== "transfer" ? categoryId : null,
          toAccountId: type === "transfer" ? toAccountId : null,
          note,
          transactionDate: new Date(),
          status: "completed"
        });
        
        setSubmittedMessage("Đã ghi nhận giao dịch thành công!");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 700);
      } catch (err) {
        console.error(err);
        alert("Có lỗi xảy ra khi lưu giao dịch.");
      }
    });
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {submittedMessage && (
        <div className="rounded-xl bg-income/10 border border-income/30 p-3 text-center text-xs font-semibold text-income">
          {submittedMessage}
        </div>
      )}

      {/* Transaction Type Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-card p-1 border border-border">
        <button
          type="button"
          onClick={() => {
            setType("expense");
            const first = categories.find(c => c.type === "expense");
            if (first) setCategoryId(first.id);
          }}
          className={cn(
            "rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
            type === "expense"
              ? "bg-expense text-slate-100 shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          Chi tiêu
        </button>
        <button
          type="button"
          onClick={() => {
            setType("income");
            const first = categories.find(c => c.type === "income");
            if (first) setCategoryId(first.id);
          }}
          className={cn(
            "rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
            type === "income"
              ? "bg-income text-slate-950 shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          Thu nhập
        </button>
        <button
          type="button"
          onClick={() => setType("transfer")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer",
            type === "transfer"
              ? "bg-credit text-slate-100 shadow-sm"
              : "text-muted hover:text-foreground"
          )}
        >
          Chuyển khoản
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Số tiền (VND)
        </label>
        <div className="relative">
          <input
            type="text"
            value={rawAmount > 0 ? rawAmount.toLocaleString("vi-VN") : ""}
            onChange={handleAmountChange}
            placeholder="0"
            required
            className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2.5 text-lg font-bold text-foreground placeholder:text-muted outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
            ₫
          </div>
        </div>
        {rawAmount > 0 && (
          <p className="mt-1 text-[11px] text-muted">
            Bằng chữ / Format:{" "}
            <span className="text-income font-semibold">
              {formatVND(rawAmount)}
            </span>
          </p>
        )}
      </div>

      {/* Category Selection */}
      {type !== "transfer" && (
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Danh mục
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs font-medium text-slate-200 outline-none focus:border-primary transition-all"
          >
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Account Selection */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          {type === "transfer" ? "Từ tài khoản" : "Tài khoản / Ví"}
        </label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs font-medium text-slate-200 outline-none focus:border-primary transition-all"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name} (Số dư: {formatVND(acc.balance)})
            </option>
          ))}
        </select>
      </div>

      {type === "transfer" && (
        <div>
          <label className="block text-xs font-medium text-muted mb-1">
            Đến tài khoản
          </label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs font-medium text-slate-200 outline-none focus:border-primary transition-all"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (Số dư: {formatVND(acc.balance)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Note / Description */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Ghi chú
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Cà phê sáng với bạn bè..."
          className="w-full rounded-xl border border-border bg-surface-card px-3.5 py-2 text-xs text-slate-200 placeholder:text-muted outline-none focus:border-primary transition-all"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border bg-surface-card py-2.5 text-xs font-semibold text-slate-300 hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || rawAmount <= 0}
          className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-slate-950 hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-primary/20 transition-all cursor-pointer"
        >
          {isPending ? "Đang lưu..." : "Lưu giao dịch"}
        </button>
      </div>
    </form>
  );
}
