"use client";

import React, { useState } from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { TransactionTable } from "@/components/finance/transaction-table";
import { mockRecentTransactions } from "@/server/mock/dashboard-data";
import { Filter, Download, Plus } from "lucide-react";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { TransactionForm } from "@/components/finance/transaction-form";

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  const filteredTransactions = mockRecentTransactions.filter((tx) => {
    if (filterType === "all") return true;
    return tx.type === filterType;
  });

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Thu / Chi"
        subtitle="Quản lý lịch sử giao dịch và biến động số dư"
        actions={
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm giao dịch</span>
          </button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-1">
            {["all", "expense", "income", "transfer"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  filterType === type
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {type === "all"
                  ? "Tất cả"
                  : type === "expense"
                  ? "Chi tiêu"
                  : type === "income"
                  ? "Thu nhập"
                  : "Chuyển khoản"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Xuất Excel / CSV</span>
        </button>
      </div>

      {/* Transactions Table */}
      <TransactionTable
        transactions={filteredTransactions}
        title="Danh sách giao dịch"
      />

      {/* Create Dialog */}
      <FinanceDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Thêm giao dịch mới"
        description="Ghi nhận thu chi hoặc luân chuyển tiền giữa các ví"
      >
        <TransactionForm
          onSuccess={() => setIsFormOpen(false)}
          onCancel={() => setIsFormOpen(false)}
        />
      </FinanceDialog>
    </div>
  );
}
