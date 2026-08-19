"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { LoanListCard } from "@/components/finance/loan-card";
import { mockLoans } from "@/server/mock/dashboard-data";
import { Plus } from "lucide-react";
import { formatVND } from "@/lib/format/money";

export default function LoansPage() {
  const totalDebt = mockLoans.reduce((acc, l) => acc + l.remainingAmount, 0);
  const totalMonthly = mockLoans.reduce((acc, l) => acc + l.monthlyPayment, 0);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Khoản vay & Nợ"
        subtitle="Theo dõi tiến độ thanh toán nợ gốc, lãi suất và lịch trả góp"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm khoản vay</span>
          </button>
        }
      />

      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng dư nợ còn lại</span>
          <div className="mt-1 text-xl font-bold text-expense">
            {formatVND(totalDebt)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface/90 p-4">
          <span className="text-xs text-muted">Tổng trả hàng tháng</span>
          <div className="mt-1 text-xl font-bold text-warning">
            {formatVND(totalMonthly)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <LoanListCard loans={mockLoans} />
      </div>
    </div>
  );
}
