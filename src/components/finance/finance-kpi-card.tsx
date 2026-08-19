"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyDisplay } from "./money-display";
import { formatPercent } from "@/lib/format/money";

export interface FinanceKpiCardProps {
  title: string;
  amount: number | bigint;
  growth: number; // e.g. 8.2 or -4.1
  growthLabel?: string; // e.g. "so với tháng trước"
  icon: React.ReactNode;
  iconBgColor?: string;
  moneyType?: "neutral" | "income" | "expense" | "debt" | "credit" | "saving";
  isDebtCard?: boolean; // if true, negative growth is good (green), positive growth is bad (red)
  className?: string;
}

export function FinanceKpiCard({
  title,
  amount,
  growth,
  growthLabel = "so với tháng trước",
  icon,
  iconBgColor = "bg-slate-800",
  moneyType = "neutral",
  isDebtCard = false,
  className,
}: FinanceKpiCardProps) {
  const isPositive = growth > 0;
  // For normal cards (income, net worth): positive growth is good (emerald), negative is bad (rose)
  // For debt cards: positive growth is bad (debt increased -> rose), negative growth is good (debt reduced -> emerald)
  const isGood = isDebtCard ? !isPositive : isPositive;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-sm backdrop-blur transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900",
        className
      )}
    >
      {/* Header: Title and Icon */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-sm",
            iconBgColor
          )}
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-300">{title}</span>
      </div>

      {/* Main Amount */}
      <div className="mt-3.5">
        <MoneyDisplay amount={amount} type={moneyType} size="2xl" />
      </div>

      {/* Growth comparison badge */}
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <div
          className={cn(
            "inline-flex items-center font-medium",
            isGood ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {isPositive ? (
            <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
          )}
          <span>{formatPercent(Math.abs(growth))}</span>
        </div>
        <span className="text-slate-400">{growthLabel}</span>
      </div>
    </div>
  );
}
