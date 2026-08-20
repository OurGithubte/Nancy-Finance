import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";

export default function GoalsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <FinancePageHeader
        title="Mục tiêu tiết kiệm"
        subtitle="Đang tải dữ liệu..."
        actions={
          <div className="h-9 w-40 rounded-xl bg-surface-card border border-border" />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface/90 p-4">
            <div className="h-4 w-32 rounded bg-surface-card mb-3" />
            <div className="h-6 w-24 rounded bg-surface-card" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface/90 p-5 h-48" />
        ))}
      </div>
    </div>
  );
}
