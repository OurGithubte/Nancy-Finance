import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/format/money";
import type { CashflowForecastResult } from "@/server/services/forecast";

const CONFIDENCE_LABEL: Record<CashflowForecastResult["confidence"], string> = {
  low: "Độ tin cậy thấp",
  medium: "Độ tin cậy trung bình",
  high: "Độ tin cậy cao",
};

const CONFIDENCE_CLASS: Record<CashflowForecastResult["confidence"], string> = {
  low: "text-muted bg-surface-card",
  medium: "text-warning bg-warning/10",
  high: "text-income bg-income/10",
};

export interface ForecastSummaryCardProps {
  forecast: CashflowForecastResult;
  className?: string;
}

export function ForecastSummaryCard({ forecast, className }: ForecastSummaryCardProps) {
  const isPositive = forecast.projectedNetCashflow >= 0;

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Dự báo dòng tiền ({forecast.horizonDays} ngày)
        </h2>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", CONFIDENCE_CLASS[forecast.confidence])}>
          {CONFIDENCE_LABEL[forecast.confidence]}
        </span>
      </div>

      {forecast.insufficientData ? (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-1.5 text-center py-6">
          <span className="text-sm font-medium text-slate-300">Chưa đủ dữ liệu để dự báo</span>
          <span className="max-w-xs text-xs text-muted">
            Hãy thêm giao dịch hoặc thiết lập khoản thu/chi định kỳ để Nancy có thể ước tính dòng tiền sắp tới.
          </span>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-income" />
            ) : (
              <TrendingDown className="h-5 w-5 text-expense" />
            )}
            <span className={cn("text-2xl font-bold", isPositive ? "text-income" : "text-expense")}>
              {formatVND(forecast.projectedNetCashflow, { showSign: true })}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">Dòng tiền ròng dự kiến trong {forecast.horizonDays} ngày tới</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border-card bg-surface-card p-3">
              <span className="text-muted">Thu nhập dự kiến</span>
              <div className="mt-1 font-semibold text-income">{formatVND(forecast.projectedIncome)}</div>
              <div className="mt-0.5 text-[10px] text-muted">
                Định kỳ: {formatVND(forecast.recurringIncome, { hideCurrency: true })} · Ước tính: {formatVND(forecast.estimatedVariableIncome, { hideCurrency: true })}
              </div>
            </div>
            <div className="rounded-xl border border-border-card bg-surface-card p-3">
              <span className="text-muted">Chi tiêu dự kiến</span>
              <div className="mt-1 font-semibold text-expense">{formatVND(forecast.projectedExpense)}</div>
              <div className="mt-0.5 text-[10px] text-muted">
                Định kỳ: {formatVND(forecast.recurringExpense, { hideCurrency: true })} · Ước tính: {formatVND(forecast.estimatedVariableExpense, { hideCurrency: true })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-1.5 rounded-xl bg-surface-card/60 p-2.5 text-[11px] text-muted">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{forecast.disclaimer}</span>
          </div>
        </>
      )}

      <Link
        href="/reports"
        className="mt-4 text-xs font-medium text-primary hover:underline self-start"
      >
        Xem báo cáo chi tiết
      </Link>
    </div>
  );
}
