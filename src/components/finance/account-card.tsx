"use client";

import React from "react";
import Link from "next/link";
import {
  Wallet,
  Building2,
  Smartphone,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountItem } from "@/types/finance";
import { MoneyDisplay } from "./money-display";
import { formatVND } from "@/lib/format/money";

export interface AccountListCardProps {
  accounts: AccountItem[];
  totalBalance: number;
  className?: string;
}

export function AccountListCard({
  accounts,
  totalBalance,
  className,
}: AccountListCardProps) {
  const getAccountIcon = (type: string, name: string) => {
    if (type === "cash") {
      return <Wallet className="h-4 w-4 text-emerald-400" />;
    }
    if (type === "ewallet" || name.toLowerCase().includes("momo")) {
      return <Smartphone className="h-4 w-4 text-pink-400" />;
    }
    if (type === "savings") {
      return <PiggyBank className="h-4 w-4 text-purple-400" />;
    }
    if (type === "investment") {
      return <TrendingUp className="h-4 w-4 text-amber-400" />;
    }
    return <Building2 className="h-4 w-4 text-blue-400" />;
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Tài khoản</h2>
        </div>

        {/* Total Balance */}
        <div className="mt-2 mb-4">
          <span className="text-xs text-slate-400 block mb-0.5">Tổng số dư</span>
          <MoneyDisplay
            amount={totalBalance}
            type="income"
            size="xl"
          />
        </div>

        {/* Account Items List */}
        <div className="space-y-2.5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between rounded-xl bg-slate-800/40 p-2.5 hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/50">
                  {getAccountIcon(acc.type, acc.name)}
                </div>
                <span className="text-xs font-medium text-slate-200">
                  {acc.name}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-100">
                {formatVND(acc.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer "Xem tất cả" Button */}
      <div className="mt-4 pt-2">
        <Link
          href="/accounts"
          className="flex w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-800/60 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
        >
          Xem tất cả
        </Link>
      </div>
    </div>
  );
}
