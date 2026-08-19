"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { mockSavingGoals } from "@/server/mock/dashboard-data";
import { Plus, ShieldCheck, Plane } from "lucide-react";
import { formatVND } from "@/lib/format/money";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Mục tiêu tiết kiệm"
        subtitle="Lên kế hoạch và theo dõi các mục tiêu tài chính dài hạn"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm mục tiêu mới</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {mockSavingGoals.map((goal) => (
          <div
            key={goal.id}
            className="rounded-2xl border border-border bg-surface/90 p-5 backdrop-blur"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-saving/10 border border-saving/20 text-saving">
                  {goal.icon === "plane" ? (
                    <Plane className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {goal.name}
                  </h3>
                  <p className="text-xs text-muted">
                    Hạn chót: {goal.targetDate}
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-surface-card px-2 py-1 text-xs font-bold text-income">
                {goal.progressPercentage}%
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                <span>Hiện có: {formatVND(goal.currentAmount)}</span>
                <span>Mục tiêu: {formatVND(goal.targetAmount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-saving to-income transition-all duration-300"
                  style={{ width: `${goal.progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
