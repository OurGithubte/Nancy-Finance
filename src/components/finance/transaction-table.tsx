"use client";

import React from "react";
import {
  Utensils,
  TrendingUp,
  Car,
  ShoppingBag,
  Home,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionItem } from "@/types/finance";
import { MoneyDisplay } from "./money-display";
import { formatDateVN, formatTimeVN } from "@/lib/format/date";

export interface TransactionTableProps {
  transactions: TransactionItem[];
  title?: string;
  showAccount?: boolean;
  className?: string;
}

export function TransactionTable({
  transactions,
  title = "Giao dịch gần đây",
  showAccount = true,
  className,
}: TransactionTableProps) {
  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case "utensils":
        return <Utensils className="h-4 w-4 text-blue-400" />;
      case "trending-up":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "car":
        return <Car className="h-4 w-4 text-cyan-400" />;
      case "shopping-bag":
        return <ShoppingBag className="h-4 w-4 text-purple-400" />;
      case "home":
        return <Home className="h-4 w-4 text-emerald-400" />;
      default:
        return <Tag className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <ArrowDownLeft className="h-3 w-3 text-emerald-400" />;
      case "expense":
        return <ArrowUpRight className="h-3 w-3 text-rose-400" />;
      case "transfer":
        return <RefreshCw className="h-3 w-3 text-blue-400" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-3 font-medium">Giao dịch</th>
              <th className="pb-3 font-medium">Danh mục</th>
              {showAccount && <th className="pb-3 font-medium">Tài khoản</th>}
              <th className="pb-3 font-medium">Thời gian</th>
              <th className="pb-3 text-right font-medium">Số tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="group hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3.5 pr-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/50">
                      {getCategoryIcon(tx.categoryIcon)}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 block truncate max-w-[200px] sm:max-w-xs">
                        {tx.title}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 sm:hidden">
                        {getTypeIcon(tx.type)}
                        {tx.categoryName} • {tx.accountName}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-slate-300 hidden sm:table-cell">
                  <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                    {tx.categoryName}
                  </span>
                </td>
                {showAccount && (
                  <td className="py-3.5 px-3 text-slate-300 hidden sm:table-cell">
                    {tx.accountName}
                  </td>
                )}
                <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                  <div>{formatDateVN(tx.transactionDate)}</div>
                  <div className="text-[10px] text-slate-400">
                    {formatTimeVN(tx.transactionDate)}
                  </div>
                </td>
                <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                  <MoneyDisplay
                    amount={tx.amount}
                    type={tx.type === "income" ? "income" : "expense"}
                    showSign={true}
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
