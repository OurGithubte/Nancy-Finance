import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { AccountListCard } from "@/components/finance/account-card";
import { Plus } from "lucide-react";
import { formatVND } from "@/lib/format/money";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { accountsService } from "@/server/services/accounts";

export default async function AccountsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const accounts = await accountsService.getAccounts(session.user.id);
  const activeAccounts = accounts.filter(a => a.isActive);
  
  const totalBalance = activeAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const bankAccounts = activeAccounts.filter(a => a.type === "bank");
  const cashAccounts = activeAccounts.filter(a => a.type === "cash");
  const ewalletAccounts = activeAccounts.filter(a => a.type === "ewallet");
  const savingsAccounts = activeAccounts.filter(a => a.type === "savings");

  const sumBank = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  const sumCash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  const sumEwallet = ewalletAccounts.reduce((sum, a) => sum + a.balance, 0);
  const sumSavings = savingsAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Tài khoản & Ví"
        subtitle="Quản lý các tài khoản ngân hàng, ví điện tử và tiền mặt"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-primary-hover transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm tài khoản</span>
          </button>
        }
      />

      {/* Grid of accounts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AccountListCard
          accounts={activeAccounts as any}
          totalBalance={totalBalance}
        />

        {/* Detailed Account Stats Card */}
        <div className="rounded-2xl border border-border bg-surface/90 p-5 backdrop-blur flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Cơ cấu tài sản
            </h3>
            <p className="text-xs text-muted mt-1">
              Phân bổ số dư theo loại tài khoản
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tài khoản Ngân hàng ({bankAccounts.length})</span>
                <span className="font-semibold text-foreground">
                  {formatVND(sumBank)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tiền mặt ({cashAccounts.length})</span>
                <span className="font-semibold text-foreground">
                  {formatVND(sumCash)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Ví điện tử ({ewalletAccounts.length})</span>
                <span className="font-semibold text-foreground">
                  {formatVND(sumEwallet)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tiết kiệm có kỳ hạn ({savingsAccounts.length})</span>
                <span className="font-semibold text-foreground">
                  {formatVND(sumSavings)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
