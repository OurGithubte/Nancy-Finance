"use client";
import React, { useState } from "react";
import { formatVND } from "@/lib/format/money";
import { formatDateVN } from "@/lib/format/date";
import { Play, Pause, Edit, Trash2, CalendarClock } from "lucide-react";
import { toggleRecurringAction, deleteRecurringAction } from "@/server/actions/recurring";
import { Button } from "@/components/ui/button";

export function RecurringList({ items, accounts, categories }: { items: any[], accounts: any[], categories: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-10 text-center bg-surface/50">
        <CalendarClock className="h-10 w-10 text-muted mb-4 opacity-50" />
        <h3 className="text-sm font-semibold text-slate-200">Chưa có giao dịch định kỳ</h3>
        <p className="text-xs text-muted mt-1 max-w-sm">
          Tạo giao dịch định kỳ để hệ thống tự động ghi nhận thu chi theo lịch.
        </p>
      </div>
    );
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setLoadingId(id);
    await toggleRecurringAction(id, !isActive);
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa giao dịch định kỳ này?")) {
      setLoadingId(id);
      await deleteRecurringAction(id);
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const account = accounts.find(a => a.id === item.accountId);
        const category = categories.find(c => c.id === item.categoryId);
        const freqMap = { daily: "Hàng ngày", weekly: "Hàng tuần", monthly: "Hàng tháng", yearly: "Hàng năm" };

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-2xl border border-border p-4 transition-colors ${item.isActive ? "bg-surface/80" : "bg-surface/30 opacity-75"}`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border border-border ${item.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {category?.name || item.note || "Giao dịch định kỳ"}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted">
                  <span>{account?.name}</span>
                  <span>•</span>
                  <span>{freqMap[item.frequency as keyof typeof freqMap]}</span>
                  <span>•</span>
                  <span>Tiếp theo: {formatDateVN(item.nextDueDate)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className={`text-sm font-bold ${item.type === 'income' ? 'text-income' : 'text-foreground'}`}>
                  {item.type === 'income' ? '+' : '-'}{formatVND(item.amount)}
                </div>
                <div className="text-[10px] mt-0.5">
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium ${item.isActive ? "bg-income/20 text-income" : "bg-muted/20 text-muted"}`}>
                    {item.isActive ? "Đang chạy" : "Tạm dừng"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2 border-l border-border pl-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted hover:text-foreground"
                  disabled={loadingId === item.id}
                  onClick={() => handleToggle(item.id, item.isActive)}
                >
                  {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                {/* Edit could go here via query param or state, for simplicity keeping it out or simple */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted hover:text-expense"
                  disabled={loadingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
