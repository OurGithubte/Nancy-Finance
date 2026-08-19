"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BudgetItem } from "@/types/finance";
import { formatVND } from "@/lib/format/money";

export interface BudgetProgressProps {
  budget: BudgetItem;
  className?: string;
}

export function BudgetProgress({ budget, className }: BudgetProgressProps) {
  const isOver = budget.isOverBudget || budget.usedPercentage > 100;
  const isWarning = !isOver && budget.usedPercentage >= 85;

  const getProgressColor = () => {
    if (isOver) return "bg-rose-500";
    if (isWarning) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800/80 bg-slate-800/30 p-3.5 transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: budget.color }}
          />
          <h4 className="text-xs font-semibold text-slate-200">
            {budget.categoryName}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {isOver && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />}
          <span
            className={cn(
              "font-bold",
              isOver
                ? "text-rose-400"
                : isWarning
                ? "text-amber-400"
                : "text-slate-300"
            )}
          >
            {budget.usedPercentage}%
          </span>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              getProgressColor()
            )}
            style={{ width: `${Math.min(budget.usedPercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>Đã chi: {formatVND(budget.spentAmount)}</span>
        <span>Hạn mức: {formatVND(budget.allocatedAmount)}</span>
      </div>
    </div>
  );
}
