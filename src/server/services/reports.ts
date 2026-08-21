import { db } from "@/db";
import {
  transactions,
  financialAccounts,
  categories,
  budgets,
  savingGoals,
  loans,
  loanPayments,
  creditCards,
  creditCardTransactions,
  creditCardPayments,
} from "@/db/schema";
import { and, eq, gte, lt, desc, sql, sum, inArray, or } from "drizzle-orm";
import {
  FinancialReport,
  ReportPeriodType,
  KpiSummary,
  PeriodComparison,
  ExpenseCategoryShare,
  MonthlyCashflowPoint,
  BudgetPerformanceItem,
  SavingGoalProgressItem,
  DebtSummaryItem,
  TopExpenseItem,
} from "@/types/reports";

export function createVNDate(year: number, month: number, day: number): Date {
  const y = year.toString().padStart(4, "0");
  const m = month.toString().padStart(2, "0");
  const d = day.toString().padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00+07:00`);
}

export function getVNDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const y = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const d = parseInt(parts.find((p) => p.type === "day")!.value, 10);
  return { y, m, d };
}

export class InvalidReportPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReportPeriodError";
  }
}

function parseCustomDate(dateStr: string | null, isEnd = false): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

    if (isEnd) {
      const temp = new Date(Date.UTC(y, m - 1, d));
      temp.setUTCDate(temp.getUTCDate() + 1);
      return createVNDate(temp.getUTCFullYear(), temp.getUTCMonth() + 1, temp.getUTCDate());
    }
    return createVNDate(y, m, d);
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function getReportPeriodDates(
  type: ReportPeriodType,
  customFrom?: string | null,
  customTo?: string | null
): { startDate: Date; endDate: Date } {
  const nowVN = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const currYear = nowVN.getFullYear();
  const currMonth = nowVN.getMonth() + 1;

  if (type === "custom") {
    if (!customFrom || !customTo) {
      throw new InvalidReportPeriodError("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
    }
    const start = parseCustomDate(customFrom);
    const end = parseCustomDate(customTo, true);
    if (!start || !end) throw new InvalidReportPeriodError("Định dạng ngày không hợp lệ.");
    if (start > end) throw new InvalidReportPeriodError("Ngày bắt đầu phải trước ngày kết thúc.");
    return { startDate: start, endDate: end };
  }

  let startDate = createVNDate(currYear, currMonth, 1);
  let endDate = currMonth === 12
    ? createVNDate(currYear + 1, 1, 1)
    : createVNDate(currYear, currMonth + 1, 1);

  if (type === "last_month") {
    startDate = currMonth === 1
      ? createVNDate(currYear - 1, 12, 1)
      : createVNDate(currYear, currMonth - 1, 1);
    endDate = createVNDate(currYear, currMonth, 1);
  } else if (type === "last_3_months") {
    const startTemp = new Date(Date.UTC(currYear, currMonth - 1 - 2, 1));
    startDate = createVNDate(startTemp.getUTCFullYear(), startTemp.getUTCMonth() + 1, 1);
  } else if (type === "last_6_months") {
    const startTemp = new Date(Date.UTC(currYear, currMonth - 1 - 5, 1));
    startDate = createVNDate(startTemp.getUTCFullYear(), startTemp.getUTCMonth() + 1, 1);
  } else if (type === "this_year") {
    startDate = createVNDate(currYear, 1, 1);
    endDate = createVNDate(currYear + 1, 1, 1);
  }

  return { startDate, endDate };
}

export function getPreviousPeriodDates(
  currentStartDate: Date,
  currentEndDate: Date
): { startDate: Date; endDate: Date } {
  const diffTime = currentEndDate.getTime() - currentStartDate.getTime();
  return {
    startDate: new Date(currentStartDate.getTime() - diffTime),
    endDate: new Date(currentEndDate.getTime() - diffTime),
  };
}

function calculateSavingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return ((income - expense) / income) * 100;
}

function buildMonthsMap(startDate: Date, endDate: Date) {
  const startParts = getVNDateParts(startDate);
  const endParts = getVNDateParts(endDate);
  const monthsMap = new Map<string, MonthlyCashflowPoint>();

  let year = startParts.y;
  let month = startParts.m;
  while (year < endParts.y || (year === endParts.y && month <= endParts.m)) {
    if (!(year === endParts.y && month === endParts.m && endParts.d === 1 && monthsMap.size > 0)) {
      const label = `T${month.toString().padStart(2, "0")}/${year.toString().slice(2)}`;
      monthsMap.set(`${year}-${month}`, { month: label, income: 0, expense: 0, netCashflow: 0 });
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return monthsMap;
}

export class ReportService {
  static async getFinancialReport(
    userId: string,
    periodType: ReportPeriodType,
    customFrom?: string | null,
    customTo?: string | null
  ): Promise<FinancialReport> {
    const { startDate, endDate } = getReportPeriodDates(periodType, customFrom, customTo);
    const prevPeriod = getPreviousPeriodDates(startDate, endDate);
    const now = new Date();

    const baseFilter = and(
      eq(transactions.userId, userId),
      eq(transactions.status, "completed"),
      gte(transactions.transactionDate, startDate),
      lt(transactions.transactionDate, endDate)
    );
    const prevFilter = and(
      eq(transactions.userId, userId),
      eq(transactions.status, "completed"),
      gte(transactions.transactionDate, prevPeriod.startDate),
      lt(transactions.transactionDate, prevPeriod.endDate)
    );

    const monthsMap = buildMonthsMap(startDate, endDate);
    const relevantMonths = Array.from(monthsMap.keys()).map((key) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month };
    });
    const budgetConditions = relevantMonths.map((rm) =>
      and(eq(budgets.year, rm.year), eq(budgets.month, rm.month))
    );

    // Phase A: all independent top-level reads execute concurrently.
    const [
      currentFlowRows,
      previousFlowRows,
      allAccountsForAssets,
      userLoans,
      userCards,
      categoryGroupQuery,
      trendQuery,
      allBudgets,
      userSavingGoals,
      topExpensesQuery,
    ] = await Promise.all([
      db
        .select({
          income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
          expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(baseFilter),
      db
        .select({
          income: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
          expense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
        })
        .from(transactions)
        .where(prevFilter),
      db
        .select({
          id: financialAccounts.id,
          balance: financialAccounts.balance,
          isExcluded: financialAccounts.isExcludedFromTotal,
          createdAt: financialAccounts.createdAt,
        })
        .from(financialAccounts)
        .where(eq(financialAccounts.userId, userId)),
      db
        .select()
        .from(loans)
        .where(and(eq(loans.userId, userId), lt(loans.startDate, endDate))),
      db
        .select()
        .from(creditCards)
        .where(and(eq(creditCards.userId, userId), lt(creditCards.createdAt, endDate))),
      db
        .select({
          categoryId: transactions.categoryId,
          amount: sum(transactions.amount),
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(and(baseFilter, eq(transactions.type, "expense")))
        .groupBy(transactions.categoryId)
        .orderBy(desc(sum(transactions.amount))),
      db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          date: transactions.transactionDate,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.status, "completed"),
            gte(transactions.transactionDate, startDate),
            lt(transactions.transactionDate, endDate),
            inArray(transactions.type, ["income", "expense"])
          )
        ),
      budgetConditions.length > 0
        ? db
            .select()
            .from(budgets)
            .where(and(eq(budgets.userId, userId), or(...budgetConditions)))
        : Promise.resolve([]),
      db.select().from(savingGoals).where(eq(savingGoals.userId, userId)),
      db
        .select({
          id: transactions.id,
          date: transactions.transactionDate,
          note: transactions.note,
          amount: transactions.amount,
          categoryId: transactions.categoryId,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .where(and(baseFilter, eq(transactions.type, "expense")))
        .orderBy(desc(transactions.amount))
        .limit(10),
    ]);

    const totalIncome = Number(currentFlowRows[0]?.income || 0);
    const totalExpense = Number(currentFlowRows[0]?.expense || 0);
    const netCashflow = totalIncome - totalExpense;
    const savingsRate = calculateSavingsRate(totalIncome, totalExpense);

    const prevIncome = Number(previousFlowRows[0]?.income || 0);
    const prevExpense = Number(previousFlowRows[0]?.expense || 0);
    const prevNetCashflow = prevIncome - prevExpense;
    const prevSavingsRate = calculateSavingsRate(prevIncome, prevExpense);
    const hasPreviousData = prevIncome > 0 || prevExpense > 0;

    const accountMap = new Map(allAccountsForAssets.map((account) => [account.id, account]));
    const isAccountIncludedAt = (id: string | null): boolean => {
      if (!id) return false;
      const account = accountMap.get(id);
      return Boolean(account && !account.isExcluded && account.createdAt < endDate);
    };

    let totalAssets = allAccountsForAssets.reduce(
      (total, account) => (isAccountIncludedAt(account.id) ? total + account.balance : total),
      0
    );

    const loanIds = userLoans.map((loan) => loan.id);
    const cardIds = userCards.map((card) => card.id);
    const categoryIds = categoryGroupQuery.map((row) => row.categoryId).filter(Boolean) as string[];
    const budgetCatIds = [...new Set(allBudgets.map((budget) => budget.categoryId))];
    const topCatIds = topExpensesQuery.map((item) => item.categoryId).filter(Boolean) as string[];
    const topAccIds = topExpensesQuery.map((item) => item.accountId).filter(Boolean) as string[];

    // Phase B: dependent reads also execute as one parallel wave.
    const [
      futureTxs,
      futureLoanPayments,
      futureCcTxs,
      futureCcPayments,
      categoryDetails,
      budgetCategories,
      budgetSpentTxs,
      topCats,
      topAccs,
    ] = await Promise.all([
      endDate < now
        ? db
            .select({
              type: transactions.type,
              amount: transactions.amount,
              accountId: transactions.accountId,
              toAccountId: transactions.toAccountId,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.status, "completed"),
                gte(transactions.transactionDate, endDate)
              )
            )
        : Promise.resolve([]),
      endDate < now && loanIds.length > 0
        ? db
            .select({ loanId: loanPayments.loanId, amount: loanPayments.amount })
            .from(loanPayments)
            .where(and(inArray(loanPayments.loanId, loanIds), gte(loanPayments.paymentDate, endDate)))
        : Promise.resolve([]),
      endDate < now && cardIds.length > 0
        ? db
            .select({ cardId: creditCardTransactions.creditCardId, amount: creditCardTransactions.amount })
            .from(creditCardTransactions)
            .where(
              and(
                inArray(creditCardTransactions.creditCardId, cardIds),
                gte(creditCardTransactions.transactionDate, endDate),
                eq(creditCardTransactions.status, "posted")
              )
            )
        : Promise.resolve([]),
      endDate < now && cardIds.length > 0
        ? db
            .select({ cardId: creditCardPayments.creditCardId, amount: creditCardPayments.amount })
            .from(creditCardPayments)
            .where(and(inArray(creditCardPayments.creditCardId, cardIds), gte(creditCardPayments.paymentDate, endDate)))
        : Promise.resolve([]),
      categoryIds.length > 0
        ? db.select().from(categories).where(and(inArray(categories.id, categoryIds), eq(categories.userId, userId)))
        : Promise.resolve([]),
      budgetCatIds.length > 0
        ? db.select().from(categories).where(and(inArray(categories.id, budgetCatIds), eq(categories.userId, userId)))
        : Promise.resolve([]),
      budgetCatIds.length > 0
        ? db
            .select({ categoryId: transactions.categoryId, amount: sum(transactions.amount) })
            .from(transactions)
            .where(and(baseFilter, eq(transactions.type, "expense"), inArray(transactions.categoryId, budgetCatIds)))
            .groupBy(transactions.categoryId)
        : Promise.resolve([]),
      topCatIds.length > 0
        ? db.select().from(categories).where(and(inArray(categories.id, topCatIds), eq(categories.userId, userId)))
        : Promise.resolve([]),
      topAccIds.length > 0
        ? db
            .select()
            .from(financialAccounts)
            .where(and(inArray(financialAccounts.id, topAccIds), eq(financialAccounts.userId, userId)))
        : Promise.resolve([]),
    ]);

    for (const tx of futureTxs) {
      const fromIncluded = isAccountIncludedAt(tx.accountId);
      const toIncluded = isAccountIncludedAt(tx.toAccountId);
      if (tx.type === "income" && fromIncluded) totalAssets -= tx.amount;
      if (tx.type === "expense" && fromIncluded) totalAssets += tx.amount;
      if (tx.type === "transfer") {
        if (fromIncluded) totalAssets += tx.amount;
        if (toIncluded) totalAssets -= tx.amount;
      }
    }

    const futureLoanPaid = new Map<string, number>();
    for (const payment of futureLoanPayments) {
      futureLoanPaid.set(payment.loanId, (futureLoanPaid.get(payment.loanId) || 0) + payment.amount);
    }
    const futureCardSpent = new Map<string, number>();
    for (const item of futureCcTxs) {
      futureCardSpent.set(item.cardId, (futureCardSpent.get(item.cardId) || 0) + item.amount);
    }
    const futureCardPaid = new Map<string, number>();
    for (const item of futureCcPayments) {
      futureCardPaid.set(item.cardId, (futureCardPaid.get(item.cardId) || 0) + item.amount);
    }

    let totalDebt = 0;
    const debts: DebtSummaryItem[] = [];
    for (const loan of userLoans) {
      const pastRemaining = loan.remainingAmount + (endDate < now ? futureLoanPaid.get(loan.id) || 0 : 0);
      totalDebt += pastRemaining;
      if (loan.isActive || pastRemaining > 0) {
        debts.push({
          id: loan.id,
          type: "loan",
          name: loan.name,
          lenderOrBank: loan.lenderName,
          originalAmountOrLimit: loan.totalAmount,
          remainingOrCurrentBalance: pastRemaining,
          monthlyPaymentOrMinDue: loan.monthlyPayment,
          paidPercentage: loan.totalAmount > 0 ? ((loan.totalAmount - pastRemaining) / loan.totalAmount) * 100 : 0,
          dueDate: null,
          status: pastRemaining > 0 ? "active" : "settled",
        });
      }
    }

    for (const card of userCards) {
      const pastBalance = endDate < now
        ? card.currentBalance - (futureCardSpent.get(card.id) || 0) + (futureCardPaid.get(card.id) || 0)
        : card.currentBalance;
      totalDebt += pastBalance;
      if (card.isActive || pastBalance > 0) {
        debts.push({
          id: card.id,
          type: "credit_card",
          name: card.name,
          lenderOrBank: card.bankName,
          originalAmountOrLimit: card.creditLimit,
          remainingOrCurrentBalance: pastBalance,
          monthlyPaymentOrMinDue: 0,
          dueDate: null,
          status: pastBalance > 0 ? "active" : "good",
        });
      }
    }

    const summary: KpiSummary = {
      totalIncome,
      totalExpense,
      netCashflow,
      savingsRate,
      totalAssets,
      totalDebt,
    };

    const comparison: PeriodComparison = {
      incomeChange: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null,
      expenseChange: prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : null,
      netCashflowChange: hasPreviousData
        ? ((netCashflow - prevNetCashflow) / Math.abs(prevNetCashflow || 1)) * 100
        : null,
      savingsRateChange:
        prevSavingsRate !== null && savingsRate !== null ? savingsRate - prevSavingsRate : null,
      hasPreviousData,
    };

    const categoryDetailMap = new Map(categoryDetails.map((category) => [category.id, category]));
    const expenseCategories: ExpenseCategoryShare[] = categoryGroupQuery.map((row, index) => {
      const category = row.categoryId ? categoryDetailMap.get(row.categoryId) : undefined;
      const amount = Number(row.amount || 0);
      return {
        id: category?.id || `unknown-${index}`,
        name: category?.name || "Khác",
        color: category?.color || "#94a3b8",
        amount,
        percentage: totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0,
        transactionCount: Number(row.count),
      };
    });

    for (const tx of trendQuery) {
      const parts = getVNDateParts(tx.date);
      const point = monthsMap.get(`${parts.y}-${parts.m}`);
      if (!point) continue;
      if (tx.type === "income") point.income += tx.amount;
      else if (tx.type === "expense") point.expense += tx.amount;
      point.netCashflow = point.income - point.expense;
    }
    const cashflowTrend = Array.from(monthsMap.values());

    const budgetCategoryMap = new Map(budgetCategories.map((category) => [category.id, category]));
    const spentMap = new Map<string, number>();
    for (const row of budgetSpentTxs) {
      if (row.categoryId) spentMap.set(row.categoryId, Number(row.amount || 0));
    }

    const budgetMap = new Map<string, BudgetPerformanceItem>();
    for (const budget of allBudgets) {
      const category = budgetCategoryMap.get(budget.categoryId);
      if (!category) continue;
      const existing = budgetMap.get(budget.categoryId) || {
        categoryId: budget.categoryId,
        categoryName: category.name,
        allocatedAmount: 0,
        spentAmount: spentMap.get(budget.categoryId) || 0,
        remainingAmount: 0,
        usagePercentage: 0,
        status: "healthy" as const,
      };
      existing.allocatedAmount += budget.allocatedAmount;
      budgetMap.set(budget.categoryId, existing);
    }

    const budgetPerformance: BudgetPerformanceItem[] = Array.from(budgetMap.values()).map((item) => {
      const usagePercentage = item.allocatedAmount > 0 ? (item.spentAmount / item.allocatedAmount) * 100 : 0;
      return {
        ...item,
        remainingAmount: item.allocatedAmount - item.spentAmount,
        usagePercentage,
        status: usagePercentage >= 100 ? "over_budget" : usagePercentage >= 80 ? "warning" : "healthy",
      };
    });

    const savingGoalsResult: SavingGoalProgressItem[] = userSavingGoals.map((goal) => ({
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      remainingAmount: Math.max(0, goal.targetAmount - goal.currentAmount),
      progressPercentage: goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0,
      targetDate: goal.targetDate,
      status: goal.status,
    }));

    const topCategoryMap = new Map(topCats.map((category) => [category.id, category.name]));
    const topAccountMap = new Map(topAccs.map((account) => [account.id, account.name]));
    const topExpenses: TopExpenseItem[] = topExpensesQuery.map((item) => ({
      id: item.id,
      date: item.date,
      description: item.note || "Không có ghi chú",
      categoryName: item.categoryId ? topCategoryMap.get(item.categoryId) || "Khác" : "Khác",
      accountName: topAccountMap.get(item.accountId) || "Không rõ",
      amount: item.amount,
    }));

    return {
      period: { type: periodType, startDate, endDate },
      summary,
      comparison,
      expenseCategories,
      cashflowTrend,
      budgetPerformance,
      savingGoals: savingGoalsResult,
      debts,
      topExpenses,
    };
  }
}
