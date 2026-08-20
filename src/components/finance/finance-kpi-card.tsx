import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyDisplay } from "./money-display";
import { formatPercent } from "@/lib/format/money";

export interface FinanceKpiCardProps {
  title: string;
  amount: number | bigint;
  growth: number | null; // e.g. 8.2 or -4.1; null = insufficient data to compare -> shows "N/A"
  growthLabel?: string; // e.g. "so với tháng trước"
  icon: React.ReactNode;
  iconBgColor?: string;
  moneyType?: "neutral" | "income" | "expense" | "debt" | "credit" | "saving" | "primary" | "warning";
  isDebtCard?: boolean; // if true, negative growth is good (income/green), positive growth is bad (expense/red)
  className?: string;
}

export function FinanceKpiCard({
  title,
  amount,
  growth,
  growthLabel = "so với tháng trước",
  icon,
  iconBgColor = "bg-surface-card",
  moneyType = "neutral",
  isDebtCard = false,
  className,
}: FinanceKpiCardProps) {
  const hasGrowth = growth !== null && growth !== undefined && !Number.isNaN(growth);
  const isPositive = hasGrowth && growth > 0;
  // For normal cards (income, net worth): positive growth is good (income token), negative is bad (expense token)
  // For debt cards: positive growth is bad (debt increased -> expense), negative growth is good (debt reduced -> income)
  const isGood = isDebtCard ? !isPositive : isPositive;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur transition-all duration-200 hover:border-border-card hover:bg-surface",
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
        {hasGrowth ? (
          <div
            className={cn(
              "inline-flex items-center font-medium",
              isGood ? "text-income" : "text-expense"
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
            )}
            <span>{formatPercent(Math.abs(growth as number))}</span>
          </div>
        ) : (
          <span className="inline-flex items-center font-medium text-muted" aria-label="Không đủ dữ liệu để so sánh">
            N/A
          </span>
        )}
        <span className="text-muted">{growthLabel}</span>
      </div>
    </div>
  );
}
