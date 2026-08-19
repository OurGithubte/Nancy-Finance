"use client";

import React, { useState } from "react";
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
import { NancyInsightCard } from "@/components/finance/nancy-insight-card";
import { TransactionTable } from "@/components/finance/transaction-table";
import {
  mockAccounts,
  mockCreditCards,
  mockExpenseCategories,
  mockKpiSummary,
  mockLoans,
  mockMonthlyCashflow,
  mockNancyInsights,
  mockRecentTransactions,
} from "@/server/mock/dashboard-data";

export default function DashboardOverviewPage() {
  const [currentMonth, setCurrentMonth] = useState("Tháng 5, 2025");

  const handlePrevMonth = () => {
    setCurrentMonth("Tháng 4, 2025");
  };

  const handleNextMonth = () => {
    setCurrentMonth("Tháng 6, 2025");
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <FinancePageHeader
        title="Tổng quan"
        subtitle="Cập nhật tình hình tài chính của bạn"
        currentPeriod={currentMonth}
        onPrevPeriod={handlePrevMonth}
        onNextPeriod={handleNextMonth}
      />

      {/* 2. Nancy AI Insight */}
      {mockNancyInsights[0] && (
        <NancyInsightCard insight={mockNancyInsights[0]} />
      )}

      {/* 3. Top KPI Cards Grid (4 columns) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Tài sản ròng */}
        <FinanceKpiCard
          title="Tài sản ròng"
          amount={mockKpiSummary.netWorth}
          growth={mockKpiSummary.netWorthGrowth}
          moneyType="neutral"
          icon={<Coins className="h-4 w-4 text-amber-400" />}
          iconBgColor="bg-amber-500/10 text-amber-400"
        />

        {/* Thu nhập */}
        <FinanceKpiCard
          title="Thu nhập"
          amount={mockKpiSummary.totalIncome}
          growth={mockKpiSummary.incomeGrowth}
          moneyType="neutral"
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400"
        />

        {/* Chi tiêu */}
        <FinanceKpiCard
          title="Chi tiêu"
          amount={mockKpiSummary.totalExpense}
          growth={mockKpiSummary.expenseGrowth}
          moneyType="neutral"
          icon={<ArrowDownRight className="h-4 w-4 text-rose-400" />}
          iconBgColor="bg-rose-500/10 text-rose-400"
        />

        {/* Tổng dư nợ */}
        <FinanceKpiCard
          title="Tổng dư nợ"
          amount={mockKpiSummary.totalDebt}
          growth={mockKpiSummary.debtGrowth}
          moneyType="neutral"
          isDebtCard={true}
          icon={<CreditCard className="h-4 w-4 text-amber-400" />}
          iconBgColor="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* 4. Charts Section (2 columns on lg/xl) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Donut Chart: Dòng tiền tháng 5 */}
        <div className="lg:col-span-5">
          <ExpenseDonutChart
            title="Dòng tiền tháng 5"
            totalExpense={mockKpiSummary.totalExpense}
            categories={mockExpenseCategories}
            className="h-full"
          />
        </div>

        {/* Trend Area Chart: Thu nhập vs Chi tiêu */}
        <div className="lg:col-span-7">
          <CashflowTrendChart
            title="Thu nhập vs Chi tiêu"
            data={mockMonthlyCashflow}
            className="h-full"
          />
        </div>
      </div>

      {/* 5. Bottom 3-Column Entities Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Accounts / Wallets */}
        <AccountListCard
          accounts={mockAccounts}
          totalBalance={mockKpiSummary.availableCash}
        />

        {/* Credit Cards */}
        <CreditCardListCard cards={mockCreditCards} />

        {/* Loans & Debts */}
        <LoanListCard loans={mockLoans} />
      </div>

      {/* 6. Recent Transactions Table */}
      <div className="pt-2">
        <TransactionTable transactions={mockRecentTransactions} />
      </div>
    </div>
  );
}
