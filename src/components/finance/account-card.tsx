import React from "react";
import Link from "next/link";
import {
  Wallet,
  Building2,
  Smartphone,
  PiggyBank,
  TrendingUp,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyDisplay } from "./money-display";
import { formatVND } from "@/lib/format/money";

export interface AccountListItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  accountNumber?: string | null;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  isExcludedFromTotal?: boolean;
}

export interface AccountListCardProps<T extends AccountListItem = AccountListItem> {
  accounts: T[];
  totalBalance: number;
  className?: string;
  onEdit?: (account: T) => void;
  onDelete?: (account: T) => void;
}

export function AccountListCard<T extends AccountListItem>({
  accounts,
  totalBalance,
  className,
  onEdit,
  onDelete,
}: AccountListCardProps<T>) {
  const getAccountIcon = (type: string, name: string) => {
    if (type === "cash") {
      return <Wallet className="h-4 w-4 text-primary" />;
    }
    if (type === "ewallet" || name.toLowerCase().includes("momo")) {
      return <Smartphone className="h-4 w-4 text-pink-400" />;
    }
    if (type === "savings") {
      return <PiggyBank className="h-4 w-4 text-saving" />;
    }
    if (type === "investment") {
      return <TrendingUp className="h-4 w-4 text-warning" />;
    }
    return <Building2 className="h-4 w-4 text-credit" />;
  };

  const showActions = Boolean(onEdit || onDelete);

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur",
        className
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Tài khoản</h2>
        </div>

        {/* Total Balance */}
        <div className="mt-2 mb-4">
          <span className="text-xs text-muted block mb-0.5">Tổng số dư</span>
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
              className="flex items-center justify-between gap-2 rounded-xl bg-surface-card/60 p-2.5 hover:bg-surface-card transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-border">
                  {getAccountIcon(acc.type, acc.name)}
                </div>
                <span className="text-xs font-medium text-slate-200 truncate">
                  {acc.name}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                  {formatVND(acc.balance)}
                </span>
                {showActions && (
                  <div className="flex items-center gap-1">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(acc)}
                        aria-label={`Sửa tài khoản ${acc.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(acc)}
                        aria-label={`Xóa tài khoản ${acc.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer "Xem tất cả" Button */}
      <div className="mt-4 pt-2">
        <Link
          href="/accounts"
          className="flex w-full items-center justify-center rounded-xl border border-border bg-surface-card/60 py-2 text-xs font-semibold text-slate-300 hover:bg-surface-card hover:text-foreground transition-all"
        >
          Xem tất cả
        </Link>
      </div>
    </div>
  );
}
