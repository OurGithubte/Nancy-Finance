"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { CreditCardListCard } from "@/components/finance/credit-card-card";
import { mockCreditCards } from "@/server/mock/dashboard-data";
import { Plus } from "lucide-react";
import { formatVND } from "@/lib/format/money";

export default function CreditCardsPage() {
  const totalLimit = mockCreditCards.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalUsed = mockCreditCards.reduce((acc, c) => acc + c.currentBalance, 0);
  const totalAvailable = totalLimit - totalUsed;

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Thẻ tín dụng"
        subtitle="Quản lý hạn mức chi tiêu, ngày sao kê và hạn trả nợ thẻ"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm thẻ tín dụng</span>
          </button>
        }
      />

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng hạn mức cấp</span>
          <div className="mt-1 text-lg font-bold text-foreground">
            {formatVND(totalLimit)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Dư nợ đã chi tiêu</span>
          <div className="mt-1 text-lg font-bold text-expense">
            {formatVND(totalUsed)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Hạn mức khả dụng</span>
          <div className="mt-1 text-lg font-bold text-income">
            {formatVND(totalAvailable)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CreditCardListCard cards={mockCreditCards} />
      </div>
    </div>
  );
}
