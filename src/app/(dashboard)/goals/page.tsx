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
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
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
            className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 backdrop-blur"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  {goal.icon === "plane" ? (
                    <Plane className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {goal.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hạn chót: {goal.targetDate}
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-emerald-400">
                {goal.progressPercentage}%
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>Hiện có: {formatVND(goal.currentAmount)}</span>
                <span>Mục tiêu: {formatVND(goal.targetAmount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-500 transition-all duration-300"
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
