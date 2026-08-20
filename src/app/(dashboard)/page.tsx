import React from "react";
import {
  Coins,
  TrendingUp,
  CreditCard,
  ArrowDownRight,
} from "lucide-react";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { FinanceKpiCard } from "@/components/finance/finance-kpi-card";
import {
  ExpenseDonutChart,
  CashflowTrendChart,
} from "@/components/finance/finance-chart";
import { AccountListCard } from "@/components/finance/account-card";
import { CreditCardListCard } from "@/components/finance/credit-card-card";
import { LoanListCard } from "@/components/finance/loan-card";
import { NetWorthTrendChart } from "@/components/finance/finance-chart";
import { ForecastSummaryCard } from "@/components/finance/forecast-summary-card";
import { SmartInsights } from "@/components/finance/smart-insights";
import { TransactionTable } from "@/components/finance/transaction-table";
import { dashboardService } from "@/server/services/dashboard";
import { transactionsRepository } from "@/server/repositories/transactions";
import { creditCardsRepository } from "@/server/repositories/credit-cards";
import { loansRepository } from "@/server/repositories/loans";
import { NetWorthService } from "@/server/services/net-worth";
import { ForecastService } from "@/server/services/forecast";
import { insightsService } from "@/server/services/insights";
import { getReportPeriodDates, createVNDate } from "@/server/services/reports";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;
  const resolvedParams = await searchParams;
  const periodParam = resolvedParams.period as string;

  // VN-calendar month boundaries, [start, endExclusive). Never rely on server-local time.
  let periodStart: Date;
  let periodEnd: Date;
  if (periodParam && /^\d{4}-\d{2}$/.test(periodParam)) {
    const [y, m] = periodParam.split("-").map(Number);
    periodStart = createVNDate(y, m, 1);
    periodEnd = m === 12 ? createVNDate(y + 1, 1, 1) : createVNDate(y, m + 1, 1);
  } else {
    ({ startDate: periodStart, endDate: periodEnd } = getReportPeriodDates("this_month"));
  }

  const [summary, cashflow, recentTransactions, creditCards, loans, netWorthHistory, forecastSummary, smartInsights] =
    await Promise.all([
      dashboardService.getDashboardSummary(userId, periodStart, periodEnd),
      dashboardService.getCashflowTrend(userId),
      transactionsRepository.getTransactions(userId, undefined, undefined, 10),
      creditCardsRepository.getCreditCards(userId),
      loansRepository.getLoans(userId),
      NetWorthService.getNetWorthHistory(userId, 6),
      ForecastService.getForecast(userId, 30),
      insightsService.getSmartInsights(userId),
    ]);

  const mappedTransactions = recentTransactions.map(tx => ({
    id: tx.id,
    title: tx.note || (tx.category ? tx.category.name : (tx.type === "transfer" ? "Chuyển khoản" : "Giao dịch")),
    type: tx.type,
    amount: tx.amount,
    categoryId: tx.categoryId || "",
    categoryName: tx.category?.name || "Khác",
    categoryColor: tx.category?.color || "#9CA3AF",
    accountId: tx.accountId,
    accountName: tx.account?.name || "",
    transactionDate: tx.transactionDate.toISOString(),
    note: tx.note || "",
    status: tx.status
  }));

  const mappedCategories = summary.expenseCategories.map(c => ({
    id: c.name,
    name: c.name,
    amount: c.amount,
    percentage: summary.kpiSummary.totalExpense > 0 ? Math.round((c.amount / summary.kpiSummary.totalExpense) * 100) : 0,
    color: c.color
  }));

  const mappedCashflow = cashflow.map(c => ({
    ...c,
    monthLabel: c.month
  }));

  const mappedCards = creditCards.map(c => {
    const available = c.creditLimit - c.currentBalance;
    const usedPercentage = c.creditLimit > 0 ? Math.round((c.currentBalance / c.creditLimit) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      bankName: c.bankName,
      last4: c.last4Digits,
      creditLimit: c.creditLimit,
      currentBalance: c.currentBalance,
      availableLimit: available,
      usedPercentage,
      statementDay: c.statementDay,
      dueDay: `Ngày ${c.dueDay} hàng tháng`,
      color: c.color || undefined
    };
  });

  const mappedLoans = loans.map(l => {
    const paid = l.totalAmount - l.remainingAmount;
    const paidPercentage = l.totalAmount > 0 ? Math.round((paid / l.totalAmount) * 100) : 0;
    return {
      id: l.id,
      name: l.name,
      lenderName: l.lenderName,
      totalAmount: l.totalAmount,
      remainingAmount: l.remainingAmount,
      monthlyPayment: l.monthlyPayment,
      totalTerms: l.totalTerms,
      remainingTerms: l.remainingTerms,
      interestRate: Number(l.interestRate),
      paidPercentage,
      color: l.color || undefined
    };
  });

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Period Switcher */}
      <FinancePageHeader
        title="Tổng quan"
        subtitle="Cập nhật tình hình tài chính của bạn"
      />

      {/* 3. Top KPI Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Tài sản ròng */}
        <FinanceKpiCard
          title="Tài sản ròng"
          amount={summary.kpiSummary.netWorth}
          growth={summary.kpiSummary.netWorthGrowth}
          moneyType="neutral"
          icon={<Coins className="h-4 w-4 text-warning" />}
          iconBgColor="bg-warning/10 text-warning"
        />

        {/* Thu nhập */}
        <FinanceKpiCard
          title="Thu nhập"
          amount={summary.kpiSummary.totalIncome}
          growth={summary.kpiSummary.incomeGrowth}
          moneyType="neutral"
          icon={<TrendingUp className="h-4 w-4 text-income" />}
          iconBgColor="bg-income/10 text-income"
        />

        {/* Chi tiêu */}
        <FinanceKpiCard
          title="Chi tiêu"
          amount={summary.kpiSummary.totalExpense}
          growth={summary.kpiSummary.expenseGrowth}
          moneyType="neutral"
          icon={<ArrowDownRight className="h-4 w-4 text-expense" />}
          iconBgColor="bg-expense/10 text-expense"
        />

        {/* Tổng dư nợ */}
        <FinanceKpiCard
          title="Tổng dư nợ"
          amount={summary.kpiSummary.totalDebt}
          growth={summary.kpiSummary.debtGrowth}
          moneyType="neutral"
          isDebtCard={true}
          icon={<CreditCard className="h-4 w-4 text-warning" />}
          iconBgColor="bg-warning/10 text-warning"
        />
      </div>

      {/* 4. Charts Section (2 columns on lg/xl) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Donut Chart */}
        <div className="lg:col-span-5">
          <ExpenseDonutChart
            title="Dòng tiền tháng"
            totalExpense={summary.kpiSummary.totalExpense}
            categories={mappedCategories}
            className="h-full"
          />
        </div>

        {/* Trend Area Chart */}
        <div className="lg:col-span-7">
          <CashflowTrendChart
            title="Thu nhập vs Chi tiêu (6 tháng)"
            data={mappedCashflow}
            className="h-full"
          />
        </div>
      </div>

      {/* 5. Bottom 3-Column Entities Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Accounts / Wallets */}
        <AccountListCard
          accounts={summary.accounts as any}
          totalBalance={summary.kpiSummary.availableCash}
        />

        {/* Credit Cards */}
        <CreditCardListCard cards={mappedCards} />

        {/* Loans & Debts */}
        <LoanListCard loans={mappedLoans} />
      </div>

      {/* 6. Net Worth Trend + Forecast Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <NetWorthTrendChart
            data={netWorthHistory.points}
            hasSufficientHistory={netWorthHistory.hasSufficientHistory}
            className="h-full"
          />
        </div>
        <div className="lg:col-span-5">
          <ForecastSummaryCard forecast={forecastSummary} className="h-full" />
        </div>
      </div>

      {/* 7. Smart Insights */}
      <SmartInsights insights={smartInsights} />

      {/* 8. Recent Transactions Table */}
      <div className="pt-2">
        <TransactionTable transactions={mappedTransactions as any} />
      </div>
    </div>
  );
}
