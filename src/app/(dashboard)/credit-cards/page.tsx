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
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm thẻ tín dụng</span>
          </button>
        }
      />

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400">Tổng hạn mức cấp</span>
          <div className="mt-1 text-lg font-bold text-slate-100">
            {formatVND(totalLimit)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400">Dư nợ đã chi tiêu</span>
          <div className="mt-1 text-lg font-bold text-rose-400">
            {formatVND(totalUsed)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
          <span className="text-xs text-slate-400">Hạn mức khả dụng</span>
          <div className="mt-1 text-lg font-bold text-emerald-400">
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
