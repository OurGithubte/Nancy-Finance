import React from "react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  ExpenseDonutChart,
  CashflowTrendChart,
} from "@/components/finance/finance-chart";
import { FinanceKpiCard } from "@/components/finance/finance-kpi-card";
import { ReportPeriodSelector } from "@/components/finance/report-period-selector";
import { Download, Wallet, ArrowDownToLine, ArrowUpFromLine, PiggyBank, Landmark, CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import { ReportService } from "@/server/services/reports";
import { ReportPeriodType } from "@/types/reports";
import { formatVND, formatPercent } from "@/lib/format/money";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const periodType = (searchParams.period as ReportPeriodType) || "this_month";
  const customFrom = searchParams.from as string | undefined;
  const customTo = searchParams.to as string | undefined;

  const report = await ReportService.getFinancialReport(
    session.user.id,
    periodType,
    customFrom,
    customTo
  );

  const { summary, comparison, expenseCategories, cashflowTrend, budgetPerformance, savingGoals, debts, topExpenses } = report;

  // Build query string for export endpoints
  const params = new URLSearchParams();
  params.set("period", periodType);
  if (customFrom) params.set("from", customFrom);
  if (customTo) params.set("to", customTo);
  const queryString = params.toString();

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Báo cáo tài chính"
        subtitle="Tổng hợp thống kê thu chi, tỷ lệ tiết kiệm và dư nợ"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href={`/api/reports/export/csv?${queryString}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-surface-card transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </Link>
            <Link
              href={`/api/reports/export/pdf?${queryString}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Tải PDF</span>
            </Link>
          </div>
        }
      />

      <div className="mb-6">
        <ReportPeriodSelector />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FinanceKpiCard
          title="Tổng thu nhập"
          amount={summary.totalIncome}
          growth={comparison.incomeChange || 0}
          icon={<ArrowDownToLine className="h-4 w-4 text-income" />}
          iconBgColor="bg-income/10"
          moneyType="income"
        />
        <FinanceKpiCard
          title="Tổng chi tiêu"
          amount={summary.totalExpense}
          growth={comparison.expenseChange || 0}
          icon={<ArrowUpFromLine className="h-4 w-4 text-expense" />}
          iconBgColor="bg-expense/10"
          moneyType="expense"
          isDebtCard={true} // High expense growth is bad
        />
        <FinanceKpiCard
          title="Dòng tiền ròng"
          amount={summary.netCashflow}
          growth={comparison.netCashflowChange || 0}
          icon={<Wallet className="h-4 w-4 text-primary" />}
          iconBgColor="bg-primary/10"
          moneyType="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <PiggyBank className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-300">Tỷ lệ tiết kiệm</span>
          </div>
          <div className="mt-2 text-2xl font-bold">
            {summary.savingsRate !== null ? formatPercent(summary.savingsRate) : "N/A"}
          </div>
          <div className="mt-2 text-xs text-muted">
            {comparison.savingsRateChange !== null 
              ? `${comparison.savingsRateChange > 0 ? "+" : ""}${comparison.savingsRateChange.toFixed(1)}% so với kỳ trước`
              : "Không đủ dữ liệu"}
          </div>
        </div>

        <div className="relative flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Landmark className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-300">Tổng tài sản (Số dư)</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-income">
            {formatVND(summary.totalAssets)}
          </div>
          <div className="mt-2 text-xs text-muted">Tổng số dư tất cả tài khoản</div>
        </div>

        <div className="relative flex flex-col justify-between rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-300">Tổng dư nợ</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-expense">
            {formatVND(summary.totalDebt)}
          </div>
          <div className="mt-2 text-xs text-muted">Tổng nợ khoản vay và thẻ tín dụng</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ExpenseDonutChart
            title="Cơ cấu chi tiêu"
            totalExpense={summary.totalExpense}
            categories={expenseCategories.map(c => ({
              ...c,
              percentage: Number(c.percentage)
            }))}
          />
        </div>

        <div className="lg:col-span-7">
          <CashflowTrendChart
            title="Xu hướng dòng tiền"
            data={cashflowTrend.map(c => ({
              month: c.month,
              monthLabel: c.month,
              income: c.income,
              expense: c.expense
            }))}
          />
        </div>
      </div>

      {/* Budget Performance */}
      <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-base font-semibold mb-4 text-foreground">Hiệu suất ngân sách</h3>
        {budgetPerformance.length === 0 ? (
          <p className="text-sm text-muted">Không có dữ liệu ngân sách trong kỳ này.</p>
        ) : (
          <div className="space-y-4">
            {budgetPerformance.map(bp => (
              <div key={bp.categoryId} className="flex flex-col gap-2 border-b border-border-card pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{bp.categoryName}</span>
                  <span className={bp.status === "over_budget" ? "text-expense font-semibold" : "text-slate-300"}>
                    {formatVND(bp.spentAmount)} / {formatVND(bp.allocatedAmount)}
                  </span>
                </div>
                <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full", 
                      bp.status === "over_budget" ? "bg-expense" : bp.status === "warning" ? "bg-amber-500" : "bg-income"
                    )}
                    style={{ width: `${Math.min(bp.usagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saving Goals */}
      <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-base font-semibold mb-4 text-foreground">Mục tiêu tiết kiệm</h3>
        {savingGoals.length === 0 ? (
          <p className="text-sm text-muted">Chưa có mục tiêu tiết kiệm nào.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savingGoals.map(sg => (
              <div key={sg.id} className="rounded-xl border border-border-card bg-surface-card p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-sm">{sg.name}</span>
                  <span className="text-sm text-muted">{formatPercent(sg.progressPercentage)}</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(sg.progressPercentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>{formatVND(sg.currentAmount)}</span>
                  <span>{formatVND(sg.targetAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debt Summary */}
      <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-base font-semibold mb-4 text-foreground">Tổng quan dư nợ</h3>
        {debts.length === 0 ? (
          <p className="text-sm text-muted">Bạn không có khoản nợ nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-card text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg font-medium">Tên khoản nợ</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Tổng gốc / Hạn mức</th>
                  <th className="px-4 py-3 font-medium">Còn nợ</th>
                  <th className="px-4 py-3 rounded-tr-lg font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card">
                {debts.map(d => (
                  <tr key={d.id} className="hover:bg-surface-card/50">
                    <td className="px-4 py-3 font-medium text-slate-200">{d.name}</td>
                    <td className="px-4 py-3 text-muted">{d.type === "loan" ? "Khoản vay" : "Thẻ tín dụng"}</td>
                    <td className="px-4 py-3">{formatVND(d.originalAmountOrLimit)}</td>
                    <td className="px-4 py-3 font-semibold text-expense">{formatVND(d.remainingOrCurrentBalance)}</td>
                    <td className="px-4 py-3">
                      {d.status === "active" ? (
                        <span className="inline-flex items-center text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                          <AlertCircle className="w-3 h-3 mr-1" /> Đang nợ
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-income bg-income/10 px-2 py-1 rounded-md">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Tốt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Expenses */}
      <div className="rounded-2xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-base font-semibold mb-4 text-foreground">Chi tiêu lớn nhất kỳ này</h3>
        {topExpenses.length === 0 ? (
          <p className="text-sm text-muted">Không có giao dịch chi tiêu trong kỳ.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-card text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg font-medium">Ngày</th>
                  <th className="px-4 py-3 font-medium">Nội dung</th>
                  <th className="px-4 py-3 font-medium">Danh mục</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-card">
                {topExpenses.map(tx => (
                  <tr key={tx.id} className="hover:bg-surface-card/50">
                    <td className="px-4 py-3 text-muted">{tx.date.toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{tx.description}</td>
                    <td className="px-4 py-3 text-muted">{tx.categoryName}</td>
                    <td className="px-4 py-3 font-semibold text-expense text-right">{formatVND(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
