"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { createRecurringAction } from "@/server/actions/recurring";

export function RecurringDialogs({ accounts, categories }: { accounts: any[], categories: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // very simple uncontrolled form for now
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      accountId: formData.get("accountId") as string,
      categoryId: formData.get("categoryId") as string || null,
      amount: parseInt(formData.get("amount") as string, 10),
      type: formData.get("type") as "income" | "expense",
      frequency: formData.get("frequency") as "daily" | "weekly" | "monthly" | "yearly",
      startDate: new Date(formData.get("startDate") as string),
      note: formData.get("note") as string || null,
      isActive: true,
    };
    
    await createRecurringAction(data);
    setLoading(false);
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        <span>Tạo mới</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-4">Thêm giao dịch định kỳ</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Loại</label>
                  <select name="type" className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="expense">Chi tiêu</option>
                    <option value="income">Thu nhập</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Tần suất</label>
                  <select name="frequency" className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="monthly">Hàng tháng</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="yearly">Hàng năm</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Số tiền (VND)</label>
                <input required type="number" name="amount" min="1000" className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Ví dụ: 5000000" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Tài khoản</label>
                <select required name="accountId" className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Danh mục</label>
                <select name="categoryId" className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">-- Không chọn --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Ngày bắt đầu</label>
                <input required type="date" name="startDate" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Ghi chú (Tuỳ chọn)</label>
                <input type="text" name="note" className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Mô tả..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={loading}>Hủy</Button>
                <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
