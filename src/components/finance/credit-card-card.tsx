import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CreditCardItem } from "@/types/finance";
import { formatVND } from "@/lib/format/money";

export interface CreditCardListCardProps {
  cards: CreditCardItem[];
  className?: string;
  onExpense?: (card: CreditCardItem) => void;
  onPayment?: (card: CreditCardItem) => void;
  onEdit?: (card: CreditCardItem) => void;
  onArchive?: (card: CreditCardItem) => void;
}

export function CreditCardListCard({
  cards,
  className,
  onExpense,
  onPayment,
  onEdit,
  onArchive,
}: CreditCardListCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Thẻ tín dụng
            </h2>
          </div>
          <Link
            href="/credit-cards"
            className="text-xs font-medium text-muted hover:text-credit transition-colors"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="space-y-3.5">
          {cards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-border bg-surface-card/40 p-3.5 hover:bg-surface-card/80 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">
                    {card.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted font-mono">
                    •••• {card.last4}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-expense">
                    {formatVND(card.currentBalance)}
                  </span>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Hạn thanh toán:{" "}
                    <span className="text-expense font-medium">
                      {card.dueDay}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                  <span>Hạn mức: {formatVND(card.creditLimit)}</span>
                  <span>Còn lại: {formatVND(card.availableLimit)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-credit to-saving transition-all duration-300"
                    style={{ width: `${card.usedPercentage}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {onExpense && (
                      <button onClick={() => onExpense(card)} className="text-[10px] px-2 py-1 rounded-md bg-expense/10 text-expense hover:bg-expense/20 cursor-pointer">
                        Tiêu thụ
                      </button>
                    )}
                    {onPayment && (
                      <button onClick={() => onPayment(card)} className="text-[10px] px-2 py-1 rounded-md bg-saving/10 text-saving hover:bg-saving/20 cursor-pointer">
                        Trả nợ
                      </button>
                    )}
                    {onEdit && (
                      <button onClick={() => onEdit(card)} className="text-[10px] px-2 py-1 rounded-md bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 cursor-pointer">
                        Sửa
                      </button>
                    )}
                    {onArchive && (
                      <button onClick={() => onArchive(card)} className="text-[10px] px-2 py-1 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer">
                        Lưu trữ
                      </button>
                    )}
                  </div>
                  <div className="text-[10px] font-medium text-muted">
                    {card.usedPercentage}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
