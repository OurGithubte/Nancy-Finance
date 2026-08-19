"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  ExpenseDonutChart,
  CashflowTrendChart,
} from "@/components/finance/finance-chart";
import {
  mockExpenseCategories,
  mockKpiSummary,
  mockMonthlyCashflow,
} from "@/server/mock/dashboard-data";
import { Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Báo cáo tài chính"
        subtitle="Tổng hợp thống kê thu chi, tỷ lệ tiết kiệm và xu hướng tài sản"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-surface-card transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Tải báo cáo PDF</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ExpenseDonutChart
            title="Cơ cấu chi tiêu tháng"
            totalExpense={mockKpiSummary.totalExpense}
            categories={mockExpenseCategories}
          />
        </div>

        <div className="lg:col-span-7">
          <CashflowTrendChart
            title="Lịch sử thu nhập vs chi tiêu"
            data={mockMonthlyCashflow}
          />
        </div>
      </div>
    </div>
  );
}
