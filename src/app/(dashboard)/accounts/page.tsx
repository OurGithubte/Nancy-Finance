"use client";

import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { AccountListCard } from "@/components/finance/account-card";
import { mockAccounts, mockKpiSummary } from "@/server/mock/dashboard-data";
import { Plus } from "lucide-react";
import { formatVND } from "@/lib/format/money";

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Tài khoản & Ví"
        subtitle="Quản lý các tài khoản ngân hàng, ví điện tử và tiền mặt"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm tài khoản</span>
          </button>
        }
      />

      {/* Grid of accounts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AccountListCard
          accounts={mockAccounts}
          totalBalance={mockKpiSummary.availableCash}
        />

        {/* Detailed Account Stats Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 backdrop-blur flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Cơ cấu tài sản
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Phân bổ số dư theo loại tài khoản
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tài khoản Ngân hàng (2)</span>
                <span className="font-semibold text-slate-100">
                  {formatVND(50450000)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tiền mặt</span>
                <span className="font-semibold text-slate-100">
                  {formatVND(15200000)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Ví điện tử MoMo</span>
                <span className="font-semibold text-slate-100">
                  {formatVND(12000000)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Tiết kiệm có kỳ hạn</span>
                <span className="font-semibold text-slate-100">
                  {formatVND(12000000)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
