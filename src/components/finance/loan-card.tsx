import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LoanItem } from "@/types/finance";
import { formatVND } from "@/lib/format/money";

export interface LoanListCardProps {
  loans: LoanItem[];
  className?: string;
  onPayment?: (loan: LoanItem) => void;
}

export function LoanListCard({ loans, className, onPayment }: LoanListCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Khoản vay & Nợ
            </h2>
          </div>
          <Link
            href="/loans"
            className="text-xs font-medium text-muted hover:text-warning transition-colors"
          >
            Xem tất cả
          </Link>
        </div>

        {/* Loan Items List */}
        <div className="space-y-3.5">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className="rounded-xl border border-border bg-surface-card/40 p-3.5 hover:bg-surface-card/80 transition-colors"
            >
              {/* Loan Top: Name & Remaining Debt */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">
                    {loan.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Còn nợ:{" "}
                    <span className="font-semibold text-slate-200">
                      {formatVND(loan.remainingAmount)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-[10px] font-medium text-warning border border-border">
                    Còn {loan.remainingTerms} kỳ
                  </span>
                </div>
              </div>

              {/* Monthly Repayment & Progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                  <span>Trả hàng tháng: {formatVND(loan.monthlyPayment)}</span>
                  <span className="text-[10px] font-medium text-muted">
                    {loan.paidPercentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-warning to-income transition-all duration-300"
                    style={{ width: `${loan.paidPercentage}%` }}
                  />
                </div>
                {onPayment && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => onPayment(loan)} className="text-[10px] px-2 py-1 rounded-md bg-saving/10 text-saving hover:bg-saving/20 cursor-pointer">
                      Trả nợ
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
