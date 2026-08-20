import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";

export default function BudgetsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <FinancePageHeader
        title="Ngân sách"
        subtitle="Đang tải dữ liệu..."
        actions={
          <div className="h-9 w-36 rounded-xl bg-surface-card border border-border" />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface/90 p-4">
            <div className="h-4 w-32 rounded bg-surface-card mb-3" />
            <div className="h-6 w-24 rounded bg-surface-card" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-5 w-48 rounded bg-surface-card mb-3" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-card/40 p-3.5 h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}
