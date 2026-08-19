import React from "react";
import { cn } from "@/lib/utils";
import { formatVND, formatCompactVND } from "@/lib/format/money";

export interface MoneyDisplayProps {
  amount: number | bigint;
  type?: "income" | "expense" | "debt" | "credit" | "saving" | "neutral" | "primary" | "warning";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  showSign?: boolean;
  compact?: boolean;
  className?: string;
}

export function MoneyDisplay({
  amount,
  type = "neutral",
  size = "md",
  showSign = false,
  compact = false,
  className,
}: MoneyDisplayProps) {
  const sizeClasses = {
    xs: "text-xs font-medium",
    sm: "text-sm font-semibold",
    md: "text-base font-bold",
    lg: "text-lg font-bold",
    xl: "text-xl font-bold",
    "2xl": "text-2xl font-bold tracking-tight",
    "3xl": "text-3xl font-extrabold tracking-tight",
  };

  const typeClasses = {
    neutral: "text-foreground",
    primary: "text-primary",
    income: "text-income",
    expense: "text-expense",
    debt: "text-debt",
    credit: "text-credit",
    saving: "text-saving",
    warning: "text-warning",
  };

  const formatted = compact
    ? formatCompactVND(amount)
    : formatVND(amount, { showSign });

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-sans transition-colors",
        sizeClasses[size],
        typeClasses[type],
        className
      )}
    >
      {formatted}
    </span>
  );
}
